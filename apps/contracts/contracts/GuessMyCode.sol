// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GuessMyCode is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant POINTS_START = 1000;
    uint256 public constant POINTS_WIN   = 22;
    uint256 public constant POINTS_LOSS  = 15;
    uint256 public constant POINTS_QUIT  = 20;
    uint256 public constant MIN_POINTS   = 0;
    uint256 public constant MIN_STAKE    = 100_000; // 0.1 USDT (6 decimals)

    // ─── Enums ────────────────────────────────────────────────────────────────

    enum MatchStatus { Pending, Active, Completed, Abandoned, Expired, Refunded }
    enum MatchType   { Free, Paid }

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct PlayerProfile {
        uint256   points;
        uint256   gamesPlayed;
        uint256   gamesWon;
        uint256   gamesLost;
        uint256   gamesQuit;
        uint256   registeredAt;
        bytes32[] matchIds;
    }

    struct Match {
        bytes32     id;
        address     player1;
        address     player2;
        address     winner;
        address     quitter;
        MatchType   matchType;
        MatchStatus status;
        uint256     stakeAmount;    // per-player stake
        uint256     totalPool;      // stakeAmount * 2
        uint256     createdAt;
        uint256     startedAt;
        uint256     endedAt;
        uint256     player1Guesses;
        uint256     player2Guesses;
    }

    // ─── State ────────────────────────────────────────────────────────────────

    IERC20  public usdToken;
    uint256 public treasuryFeeBps;  // fee kept in contract (default 100 = 1%)
    uint256 public matchExpiry;     // seconds before a pending match can be expired
    uint256 public accumulatedFees; // running total of fees held in this contract
    uint256 private _matchNonce;

    mapping(address => PlayerProfile) public players;
    mapping(bytes32 => Match)         public matches;
    mapping(address => bytes32)       public activeMatchOf;
    mapping(address => bytes32)       public challengeBoard;

    uint256 public totalAIGames;
    uint256 public totalPvPPaidGames;
    uint256 public totalPvPFreeGames;
    address public backendAddress;  // authorized address for resolving matches

    uint256[46] private __gap;

    // ─── Events ───────────────────────────────────────────────────────────────

    event PlayerRegistered  (address indexed player, uint256 timestamp);
    event ChallengeCreated  (bytes32 indexed matchId, address indexed challenger, MatchType matchType, uint256 stakeAmount);
    event ChallengeJoined   (bytes32 indexed matchId, address indexed challenger, address indexed opponent, uint256 startedAt);
    event ChallengeCancelled(bytes32 indexed matchId, address indexed challenger);
    event MatchCompleted    (bytes32 indexed matchId, address indexed winner, address indexed loser, uint256 payout, uint256 fee, MatchType matchType);
    event MatchAbandoned    (bytes32 indexed matchId, address indexed quitter, address indexed winner);
    event MatchExpired      (bytes32 indexed matchId, address indexed challenger);
    event GuessCountsUpdated(bytes32 indexed matchId, uint256 player1Guesses, uint256 player2Guesses);
    event PointsUpdated     (address indexed player, uint256 oldPoints, uint256 newPoints, string reason);
    event FeesWithdrawn     (address indexed to, uint256 amount);
    event TokenUpdated      (address indexed oldToken, address indexed newToken);
    event GameTracked       (MatchType matchType, bool isAI, uint256 totalAI, uint256 totalPvPPaid, uint256 totalPvPFree);
    event BackendUpdated    (address indexed oldBackend, address indexed newBackend);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyBackend() {
        require(msg.sender == backendAddress || msg.sender == owner(), "CB: not backend");
        _;
    }

    modifier matchExists(bytes32 matchId) {
        require(matches[matchId].createdAt > 0, "CB: match not found");
        _;
    }

    // ─── Initializer ──────────────────────────────────────────────────────────

    function initialize(address _usdToken) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        require(_usdToken != address(0), "CB: invalid token");

        usdToken       = IERC20(_usdToken);
        treasuryFeeBps = 100;  // 1%
        matchExpiry    = 600;  // 10 minutes
        backendAddress = msg.sender;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ─── Registration ─────────────────────────────────────────────────────────

    function register() public whenNotPaused {
        if (players[msg.sender].registeredAt == 0) {
            players[msg.sender].points       = POINTS_START;
            players[msg.sender].registeredAt = block.timestamp;
            emit PlayerRegistered(msg.sender, block.timestamp);
        }
    }

    // ─── Challenge Lifecycle ──────────────────────────────────────────────────

    /**
     * @param isPaid    Whether USDT is staked.
     * @param stakeAmt  Per-player stake amount. Must be >= MIN_STAKE if isPaid. Pass 0 for free.
     */
    function createChallenge(bool isPaid, uint256 stakeAmt)
        external
        nonReentrant
        whenNotPaused
        returns (bytes32 matchId)
    {
        if (players[msg.sender].registeredAt == 0) register();

        require(activeMatchOf[msg.sender]   == bytes32(0), "CB: finish current match first");
        require(challengeBoard[msg.sender]  == bytes32(0), "CB: cancel existing challenge first");

        if (isPaid) {
            require(stakeAmt >= MIN_STAKE, "CB: stake below 0.1 USDT minimum");
            require(usdToken.transferFrom(msg.sender, address(this), stakeAmt), "CB: stake transfer failed");
        }

        matchId = keccak256(abi.encodePacked(msg.sender, block.timestamp, _matchNonce++));

        matches[matchId] = Match({
            id:             matchId,
            player1:        msg.sender,
            player2:        address(0),
            winner:         address(0),
            quitter:        address(0),
            matchType:      isPaid ? MatchType.Paid : MatchType.Free,
            status:         MatchStatus.Pending,
            stakeAmount:    isPaid ? stakeAmt : 0,
            totalPool:      0,
            createdAt:      block.timestamp,
            startedAt:      0,
            endedAt:        0,
            player1Guesses: 0,
            player2Guesses: 0
        });

        challengeBoard[msg.sender] = matchId;

        emit ChallengeCreated(matchId, msg.sender, isPaid ? MatchType.Paid : MatchType.Free, isPaid ? stakeAmt : 0);
    }

    function joinChallenge(address challenger)
        external
        nonReentrant
        whenNotPaused
    {
        if (players[msg.sender].registeredAt == 0) register();

        require(msg.sender != challenger,                   "CB: cannot join own challenge");
        require(activeMatchOf[msg.sender] == bytes32(0),    "CB: finish current match first");

        bytes32 matchId = challengeBoard[challenger];
        require(matchId != bytes32(0),                                  "CB: no open challenge");

        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Pending,                        "CB: challenge not pending");
        require(block.timestamp <= m.createdAt + matchExpiry,           "CB: challenge expired");

        if (m.matchType == MatchType.Paid) {
            require(usdToken.transferFrom(msg.sender, address(this), m.stakeAmount), "CB: stake transfer failed");
            m.totalPool = m.stakeAmount * 2;
        }

        m.player2   = msg.sender;
        m.status    = MatchStatus.Active;
        m.startedAt = block.timestamp;

        activeMatchOf[challenger] = matchId;
        activeMatchOf[msg.sender] = matchId;

        players[challenger].matchIds.push(matchId);
        players[msg.sender].matchIds.push(matchId);

        delete challengeBoard[challenger];

        emit ChallengeJoined(matchId, challenger, msg.sender, block.timestamp);
    }

    function cancelChallenge(bytes32 matchId) external nonReentrant whenNotPaused {
        Match storage m = matches[matchId];
        require(m.id != bytes32(0),             "CB: match not found");
        require(m.status == MatchStatus.Pending, "CB: match already started");

        // Allowed if msg.sender is the challenger OR the backend (owner)
        require(msg.sender == m.player1 || msg.sender == owner(), "CB: not authorized");

        if (m.matchType == MatchType.Paid && m.stakeAmount > 0) {
            require(usdToken.transfer(m.player1, m.stakeAmount), "CB: refund failed");
        }

        m.status  = MatchStatus.Expired;
        m.endedAt = block.timestamp;

        // Cleanup the challenge board for the original challenger
        delete challengeBoard[m.player1];

        emit ChallengeCancelled(matchId, m.player1);
    }

    // Permissionless — anyone can trigger cleanup on a timed-out pending match.
    function expireMatch(bytes32 matchId) external nonReentrant matchExists(matchId) {
        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Pending,                        "CB: match not pending");
        require(block.timestamp > m.createdAt + matchExpiry,            "CB: not yet expired");

        if (m.matchType == MatchType.Paid && m.stakeAmount > 0) {
            require(usdToken.transfer(m.player1, m.stakeAmount), "CB: refund failed");
        }

        m.status  = MatchStatus.Expired;
        m.endedAt = block.timestamp;

        delete challengeBoard[m.player1];

        emit MatchExpired(matchId, m.player1);
    }

    // ─── Match Resolution (backend only) ──────────────────────────────────────

    function resolveMatch(
        bytes32 matchId,
        address winner,
        uint256 p1Guesses,
        uint256 p2Guesses
    ) external nonReentrant onlyBackend matchExists(matchId) {
        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Active,                     "CB: match not active");
        require(winner == m.player1 || winner == m.player2,         "CB: invalid winner");

        address loser = winner == m.player1 ? m.player2 : m.player1;

        m.player1Guesses = p1Guesses;
        m.player2Guesses = p2Guesses;

        uint256 payout = 0;
        uint256 fee    = 0;

        if (m.matchType == MatchType.Paid && m.totalPool > 0) {
            fee             = (m.totalPool * treasuryFeeBps) / 10000;
            payout          = m.totalPool - fee;
            accumulatedFees += fee;
            require(usdToken.transfer(winner, payout), "CB: payout failed");
        }

        _recordWin(winner);
        _recordLoss(loser);

        m.winner  = winner;
        m.status  = MatchStatus.Completed;
        m.endedAt = block.timestamp;

        delete activeMatchOf[m.player1];
        delete activeMatchOf[m.player2];

        emit MatchCompleted(matchId, winner, loser, payout, fee, m.matchType);
    }

    function recordQuit(bytes32 matchId, address quitter)
        external
        nonReentrant
        onlyBackend
        matchExists(matchId)
    {
        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Active,                     "CB: match not active");
        require(quitter == m.player1 || quitter == m.player2,       "CB: invalid quitter");

        address opponent = quitter == m.player1 ? m.player2 : m.player1;

        uint256 payout = 0;
        uint256 fee    = 0;

        if (m.matchType == MatchType.Paid && m.totalPool > 0) {
            fee             = (m.totalPool * treasuryFeeBps) / 10000;
            payout          = m.totalPool - fee;
            accumulatedFees += fee;
            require(usdToken.transfer(opponent, payout), "CB: payout failed");
        }

        _recordQuit(quitter);
        _recordWin(opponent);

        m.quitter = quitter;
        m.winner  = opponent;
        m.status  = MatchStatus.Abandoned;
        m.endedAt = block.timestamp;

        delete activeMatchOf[m.player1];
        delete activeMatchOf[m.player2];

        emit MatchAbandoned(matchId, quitter, opponent);
    }

    function updateGuessCounts(bytes32 matchId, uint256 p1Guesses, uint256 p2Guesses)
        external
        onlyBackend
        matchExists(matchId)
    {
        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Active, "CB: match not active");
        m.player1Guesses = p1Guesses;
        m.player2Guesses = p2Guesses;
        emit GuessCountsUpdated(matchId, p1Guesses, p2Guesses);
    }

    /**
     * @dev Tracks the number of games played on the platform.
     *      Called by the backend after match resolution or AI game completion.
     */
    function trackGame(MatchType mType, bool isAI) external onlyBackend {
        if (isAI) {
            totalAIGames++;
        } else if (mType == MatchType.Paid) {
            totalPvPPaidGames++;
        } else {
            totalPvPFreeGames++;
        }
        emit GameTracked(mType, isAI, totalAIGames, totalPvPPaidGames, totalPvPFreeGames);
    }

    // ─── Internal Point Helpers ───────────────────────────────────────────────

    function _autoRegister(address player) internal {
        if (players[player].registeredAt == 0) {
            players[player].points       = POINTS_START;
            players[player].registeredAt = block.timestamp;
            emit PlayerRegistered(player, block.timestamp);
        }
    }

    function _recordWin(address player) internal {
        _autoRegister(player);
        PlayerProfile storage p = players[player];
        uint256 old = p.points;
        p.points      += POINTS_WIN;
        p.gamesPlayed += 1;
        p.gamesWon    += 1;
        emit PointsUpdated(player, old, p.points, "win");
    }

    function _recordLoss(address player) internal {
        _autoRegister(player);
        PlayerProfile storage p = players[player];
        uint256 old = p.points;
        p.points      = p.points > POINTS_LOSS ? p.points - POINTS_LOSS : MIN_POINTS;
        p.gamesPlayed += 1;
        p.gamesLost   += 1;
        emit PointsUpdated(player, old, p.points, "loss");
    }

    function _recordQuit(address player) internal {
        _autoRegister(player);
        PlayerProfile storage p = players[player];
        uint256 old = p.points;
        p.points      = p.points > POINTS_QUIT ? p.points - POINTS_QUIT : MIN_POINTS;
        p.gamesPlayed += 1;
        p.gamesQuit   += 1;
        emit PointsUpdated(player, old, p.points, "quit");
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    function getPlayer(address wallet) external view returns (PlayerProfile memory) {
        return players[wallet];
    }

    function getPlayerMatches(address wallet, uint256 offset, uint256 limit)
        external
        view
        returns (bytes32[] memory result)
    {
        bytes32[] storage all = players[wallet].matchIds;
        uint256 total = all.length;
        if (offset >= total) return new bytes32[](0);
        uint256 end = offset + limit > total ? total : offset + limit;
        result = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = all[i];
        }
    }

    function getMatch(bytes32 matchId) external view returns (Match memory) {
        return matches[matchId];
    }

    function getMatchCount(address wallet) external view returns (uint256) {
        return players[wallet].matchIds.length;
    }

    function getOpenChallenge(address challenger)
        external
        view
        returns (bytes32 matchId, Match memory m)
    {
        matchId = challengeBoard[challenger];
        if (matchId != bytes32(0)) m = matches[matchId];
    }

    function isInMatch(address player) external view returns (bool) {
        return activeMatchOf[player] != bytes32(0);
    }

    function contractBalance() external view returns (uint256) {
        return usdToken.balanceOf(address(this));
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────

    function withdrawFees(address to, uint256 amount) external onlyOwner {
        require(to != address(0),           "CB: zero address");
        require(amount <= accumulatedFees,  "CB: exceeds accumulated fees");
        accumulatedFees -= amount;
        require(usdToken.transfer(to, amount), "CB: transfer failed");
        emit FeesWithdrawn(to, amount);
    }

    function withdrawAllFees(address to) external onlyOwner {
        require(to != address(0),   "CB: zero address");
        uint256 amount = accumulatedFees;
        require(amount > 0,         "CB: no fees");
        accumulatedFees = 0;
        require(usdToken.transfer(to, amount), "CB: transfer failed");
        emit FeesWithdrawn(to, amount);
    }

    function setTreasuryFeeBps(uint256 _bps) external onlyOwner {
        require(_bps <= 500, "CB: max 5%");
        treasuryFeeBps = _bps;
    }

    function setMatchExpiry(uint256 _seconds) external onlyOwner {
        require(_seconds >= 60, "CB: min 60s");
        matchExpiry = _seconds;
    }

    function setUsdToken(address _token) external onlyOwner {
        require(_token != address(0), "CB: zero address");
        emit TokenUpdated(address(usdToken), _token);
        usdToken = IERC20(_token);
    }

    function setBackendAddress(address _newBackend) external onlyOwner {
        require(_newBackend != address(0), "CB: zero address");
        emit BackendUpdated(backendAddress, _newBackend);
        backendAddress = _newBackend;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // Sends entire contract token balance to a specified address. Only callable when paused.
    function emergencyWithdraw(address to) external onlyOwner {
        require(paused(),           "CB: must be paused");
        require(to != address(0),   "CB: zero address");
        uint256 bal = usdToken.balanceOf(address(this));
        require(usdToken.transfer(to, bal), "CB: withdraw failed");
    }

    // ─── Upgrade Storage Safety ───────────────────────────────────────────────
    // When adding new state variables in V2+:
    //   1. Append AFTER __gap, never reorder existing variables
    //   2. Reduce __gap size by the number of new slots added
    //   3. Never change existing struct field order or types
}
