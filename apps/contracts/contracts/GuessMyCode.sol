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
    uint256 public constant MIN_STAKE           = 100_000; // 0.1 USDT (6 decimals)
    uint256 public constant CIPHER_DAILY_WIN_CAP = 5;
    uint8   public constant WEEKLY_PRIZE_COUNT   = 4; // top 3 CMC + most active

    // ─── Enums ────────────────────────────────────────────────────────────────

    enum MatchStatus { Pending, Active, Completed, Abandoned, Expired, Refunded, Draw }
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
        string      player1Code;
        string      player2Code;
        string      historyHash;
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

    // ─── Reward Pool (V2 — separate from escrow stakes & accumulatedFees) ─────

    uint256 public rewardPoolBalance;
    uint256 public cipherWinReward;   // default 0.1 USDT (6 decimals)
    uint256[4] public weeklyPrizes;   // [1st CMC, 2nd CMC, 3rd CMC, most active]

    mapping(address => uint256) public lastCipherRewardDay;
    mapping(address => uint256) public cipherRewardsToday;
    mapping(uint256 => mapping(address => mapping(uint8 => bool))) public weeklyRewardClaimed;

    /// @notice USDT reserved for Pending/Active paid match stakes (must not be withdrawn).
    uint256 public escrowedStakes;

    uint256[36] private __gap;

    // ─── Events ───────────────────────────────────────────────────────────────

    event PlayerRegistered  (address indexed player, uint256 timestamp);
    event ChallengeCreated  (bytes32 indexed matchId, address indexed challenger, MatchType matchType, uint256 stakeAmount);
    event ChallengeJoined   (bytes32 indexed matchId, address indexed challenger, address indexed opponent, uint256 startedAt);
    event ChallengeCancelled(bytes32 indexed matchId, address indexed challenger);
    event MatchCompleted(
        bytes32 indexed matchId,
        address indexed winner,
        address indexed loser,
        uint256 payout,
        uint256 fee,
        MatchType matchType,
        string p1Code,
        string p2Code,
        string historyHash,
        string[] guesses
    );
    event MatchDraw(
        bytes32 indexed matchId,
        address indexed player1,
        address indexed player2,
        uint256 stakeAmount,
        MatchType matchType,
        string p1Code,
        string p2Code,
        string historyHash
    );
    event MatchAbandoned    (bytes32 indexed matchId, address indexed quitter, address indexed winner);
    event MatchExpired      (bytes32 indexed matchId, address indexed challenger);
    event GuessCountsUpdated(bytes32 indexed matchId, uint256 player1Guesses, uint256 player2Guesses);
    event PointsUpdated     (address indexed player, uint256 oldPoints, uint256 newPoints, string reason);
    event FeesWithdrawn     (address indexed to, uint256 amount);
    event ContractBalanceWithdrawn(address indexed to, uint256 amount);
    event TokenUpdated      (address indexed oldToken, address indexed newToken);
    event GameTracked       (MatchType matchType, bool isAI, uint256 totalAI, uint256 totalPvPPaid, uint256 totalPvPFree);
    event BackendUpdated    (address indexed oldBackend, address indexed newBackend);
    event RewardPoolDeposited(address indexed from, uint256 amount, uint256 newBalance);
    event CipherRewardPaid  (address indexed player, uint256 amount, uint256 dailyCount);
    event WeeklyRewardPaid  (address indexed player, uint256 amount, uint8 prizeIndex, uint256 weekId);
    event EscrowedStakesSynced(uint256 oldAmount, uint256 newAmount);

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
        matchExpiry    = 300;  // 5 minutes
        backendAddress = msg.sender;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /**
     * @dev Call once after upgrading to V2 to set reward defaults.
     *      cipherWinReward = 0.1 USDT; weekly prizes = 1 / 0.5 / 0.25 / 0.25 USDT.
     */
    function initializeV2() public reinitializer(2) onlyOwner {
        cipherWinReward = 100_000;
        weeklyPrizes[0] = 1_000_000;
        weeklyPrizes[1] = 500_000;
        weeklyPrizes[2] = 250_000;
        weeklyPrizes[3] = 250_000;
    }

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

        // Restrictions removed: multiple concurrent matches and challenges allowed
        // require(activeMatchOf[msg.sender]   == bytes32(0), "CB: finish current match first");
        // require(challengeBoard[msg.sender]  == bytes32(0), "CB: cancel existing challenge first");

        if (isPaid) {
            require(stakeAmt >= MIN_STAKE, "CB: stake below 0.1 USDT minimum");
            require(usdToken.transferFrom(msg.sender, address(this), stakeAmt), "CB: stake transfer failed");
            _lockEscrow(stakeAmt);
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
            player2Guesses: 0,
            player1Code:    "",
            player2Code:    "",
            historyHash:    ""
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
        // Restriction removed: multiple concurrent matches allowed
        // require(activeMatchOf[msg.sender] == bytes32(0),    "CB: finish current match first");

        bytes32 matchId = challengeBoard[challenger];
        require(matchId != bytes32(0),                                  "CB: no open challenge");

        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Pending,                        "CB: challenge not pending");
        require(block.timestamp <= m.createdAt + matchExpiry,           "CB: challenge expired");

        if (m.matchType == MatchType.Paid) {
            require(usdToken.transferFrom(msg.sender, address(this), m.stakeAmount), "CB: stake transfer failed");
            _lockEscrow(m.stakeAmount);
            m.totalPool = m.stakeAmount * 2;
        }

        m.player2   = msg.sender;
        m.status    = MatchStatus.Active;
        m.startedAt = block.timestamp;

        // activeMatchOf is deprecated
        // activeMatchOf[challenger] = matchId;
        // activeMatchOf[msg.sender] = matchId;

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
            _releaseEscrow(m.stakeAmount);
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
            _releaseEscrow(m.stakeAmount);
            require(usdToken.transfer(m.player1, m.stakeAmount), "CB: refund failed");
        }

        m.status  = MatchStatus.Expired;
        m.endedAt = block.timestamp;

        delete challengeBoard[m.player1];

        emit MatchExpired(matchId, m.player1);
    }

    /// @notice Owner closes a Pending challenge without on-chain refund.
    ///         Use only when the stake was already repaid off-chain (ops recovery).
    function forceExpireMatch(bytes32 matchId) external onlyOwner nonReentrant matchExists(matchId) {
        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Pending, "CB: match not pending");

        if (m.matchType == MatchType.Paid && m.stakeAmount > 0) {
            _releaseEscrow(m.stakeAmount);
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
        address player2,
        uint256 p1Guesses,
        uint256 p2Guesses,
        string memory p1Code,
        string memory p2Code,
        string memory historyHash,
        string[] memory guesses
    ) external nonReentrant onlyBackend matchExists(matchId) {
        Match storage m = matches[matchId];

        require(m.status == MatchStatus.Active,                     "CB: match not active");
        require(player2 == m.player2,                               "CB: invalid player2");
        require(winner == m.player1 || winner == m.player2,         "CB: invalid winner");

        address loser = winner == m.player1 ? m.player2 : m.player1;

        m.player1Guesses = p1Guesses;
        m.player2Guesses = p2Guesses;
        m.player1Code    = p1Code;
        m.player2Code    = p2Code;
        m.historyHash    = historyHash;

        uint256 payout = 0;
        uint256 fee    = 0;

        if (m.matchType == MatchType.Paid && m.totalPool > 0) {
            _releaseEscrow(m.totalPool);
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

        emit MatchCompleted(matchId, winner, loser, payout, fee, m.matchType, p1Code, p2Code, historyHash, guesses);
    }

    /**
     * Resolve a draw match on-chain (backend only).
     *
     * For paid matches, both players are refunded their per-player stakeAmount.
     * For free matches, we just finalize the match record (no USDT transfers).
     */
    function resolveDraw(
        bytes32 matchId,
        address player2,
        uint256 p1Guesses,
        uint256 p2Guesses,
        string memory p1Code,
        string memory p2Code,
        string memory historyHash
    ) external nonReentrant onlyBackend matchExists(matchId) {
        Match storage m = matches[matchId];

        require(m.status == MatchStatus.Active, "CB: match not active");
        require(player2 == m.player2, "CB: invalid player2");

        // For safety (Paid matches must have a stake escrowed)
        if (m.matchType == MatchType.Paid) {
            require(m.totalPool > 0 && m.stakeAmount > 0, "CB: missing paid escrow");
        }

        m.player1Guesses = p1Guesses;
        m.player2Guesses = p2Guesses;
        m.player1Code = p1Code;
        m.player2Code = p2Code;
        m.historyHash = historyHash;

        // For paid matches, refund both player stakes (no treasury fee on draws)
        if (m.matchType == MatchType.Paid && m.totalPool > 0) {
            uint256 stake = m.stakeAmount;
            _releaseEscrow(m.totalPool);
            require(usdToken.transfer(m.player1, stake), "CB: refund p1 failed");
            require(usdToken.transfer(m.player2, stake), "CB: refund p2 failed");
        }

        _recordDraw(m.player1);
        _recordDraw(m.player2);

        m.winner = address(0);
        m.quitter = address(0);
        m.status = MatchStatus.Draw;
        m.endedAt = block.timestamp;

        emit MatchDraw(matchId, m.player1, m.player2, m.stakeAmount, m.matchType, p1Code, p2Code, historyHash);
    }

    /// @notice Player forfeits an active match. Opponent wins; paid stakes settle on-chain.
    function quitMatch(bytes32 matchId)
        external
        nonReentrant
        whenNotPaused
        matchExists(matchId)
    {
        _abandonMatch(matchId, msg.sender);
    }

    function recordQuit(bytes32 matchId, address quitter)
        external
        nonReentrant
        onlyBackend
        matchExists(matchId)
    {
        _abandonMatch(matchId, quitter);
    }

    function _abandonMatch(bytes32 matchId, address quitter) internal {
        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Active,                     "CB: match not active");
        require(quitter == m.player1 || quitter == m.player2,       "CB: invalid quitter");

        address opponent = quitter == m.player1 ? m.player2 : m.player1;

        uint256 payout = 0;
        uint256 fee    = 0;

        if (m.matchType == MatchType.Paid && m.totalPool > 0) {
            _releaseEscrow(m.totalPool);
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
        // Deprecated for MiniPay mode.
        // Draw/win/loss settlement already updates points and match state via resolveMatch/recordQuit.
        // We intentionally stop doing extra on-chain bookkeeping to reduce agent transaction count.
        mType;
        isAI;
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

    function _recordDraw(address player) internal {
        _autoRegister(player);
        PlayerProfile storage p = players[player];
        uint256 old = p.points;
        // No point change on draws; only count activity.
        p.gamesPlayed += 1;
        emit PointsUpdated(player, old, p.points, "draw");
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

    /**
     * @dev Returns all open (Pending or Active) matches for a player.
     */
    function getOpenChallenges(address wallet) 
        external 
        view 
        returns (bytes32[] memory result) 
    {
        bytes32[] storage all = players[wallet].matchIds;
        uint256 count = 0;
        for (uint256 i = 0; i < all.length; i++) {
            MatchStatus s = matches[all[i]].status;
            if (s == MatchStatus.Pending || s == MatchStatus.Active) {
                count++;
            }
        }
        
        result = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < all.length; i++) {
            MatchStatus s = matches[all[i]].status;
            if (s == MatchStatus.Pending || s == MatchStatus.Active) {
                result[index++] = all[i];
            }
        }
    }

    /**
     * @dev Returns all finished (Completed, Abandoned, Expired, Refunded, Draw) matches for a player.
     */
    function getFinishedChallenges(address wallet) 
        external 
        view 
        returns (bytes32[] memory result) 
    {
        bytes32[] storage all = players[wallet].matchIds;
        uint256 count = 0;
        for (uint256 i = 0; i < all.length; i++) {
            MatchStatus s = matches[all[i]].status;
            if (s == MatchStatus.Completed || s == MatchStatus.Abandoned || 
                s == MatchStatus.Expired || s == MatchStatus.Refunded || s == MatchStatus.Draw) {
                count++;
            }
        }
        
        result = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < all.length; i++) {
            MatchStatus s = matches[all[i]].status;
            if (s == MatchStatus.Completed || s == MatchStatus.Abandoned || 
                s == MatchStatus.Expired || s == MatchStatus.Refunded || s == MatchStatus.Draw) {
                result[index++] = all[i];
            }
        }
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

    /// @notice USDT that may be withdrawn (excludes fees, match escrow, and reward pool).
    function nonFeeBalance() external view returns (uint256) {
        uint256 balance = usdToken.balanceOf(address(this));
        uint256 reserved = accumulatedFees + escrowedStakes + rewardPoolBalance;
        return balance > reserved ? balance - reserved : 0;
    }

    function _lockEscrow(uint256 amount) internal {
        escrowedStakes += amount;
    }

    function _releaseEscrow(uint256 amount) internal {
        if (amount == 0) return;
        // Clamp: pre-upgrade Pending stakes may not be reflected in escrowedStakes yet.
        // Ops should call syncEscrowedStakes after upgrade; withdraws still reserve the counter.
        if (escrowedStakes >= amount) {
            escrowedStakes -= amount;
        } else {
            escrowedStakes = 0;
        }
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────

    function withdrawFees(address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0),           "CB: zero address");
        require(amount > 0,                 "CB: zero amount");
        require(amount <= accumulatedFees,  "CB: exceeds accumulated fees");
        require(usdToken.balanceOf(address(this)) >= amount, "CB: insufficient balance");
        accumulatedFees -= amount;
        require(usdToken.transfer(to, amount), "CB: transfer failed");
        emit FeesWithdrawn(to, amount);
    }

    /// @notice Owner withdraws surplus USDT only.
    ///         Cannot touch `accumulatedFees`, `escrowedStakes`, or `rewardPoolBalance`.
    function withdrawContractBalance(address to, uint256 amount) public onlyOwner nonReentrant {
        require(to != address(0),           "CB: zero address");
        require(amount > 0,                 "CB: zero amount");

        uint256 balance = usdToken.balanceOf(address(this));
        uint256 reserved = accumulatedFees + escrowedStakes + rewardPoolBalance;
        uint256 maxWithdraw = balance > reserved ? balance - reserved : 0;
        require(amount <= maxWithdraw,      "CB: exceeds non-fee balance");
        require(balance >= amount,          "CB: insufficient balance");

        require(usdToken.transfer(to, amount), "CB: transfer failed");
        emit ContractBalanceWithdrawn(to, amount);
    }

    /// @notice One-time / ops sync after upgrade if live Pending/Active stakes exist.
    function syncEscrowedStakes(uint256 amount) external onlyOwner {
        uint256 old = escrowedStakes;
        escrowedStakes = amount;
        emit EscrowedStakesSynced(old, amount);
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

    // ─── Reward Pool ──────────────────────────────────────────────────────────

    /// @notice Anyone can fund the reward pool (grant USDT, treasury top-ups).
    function depositToRewardPool(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "CB: zero amount");
        require(usdToken.transferFrom(msg.sender, address(this), amount), "CB: deposit failed");
        rewardPoolBalance += amount;
        emit RewardPoolDeposited(msg.sender, amount, rewardPoolBalance);
    }

    /**
     * @notice Pay a Cipher win reward after backend verification.
     *         Enforces the on-chain daily cap (5 wins / wallet / day).
     */
    function rewardCipherWin(address player) external nonReentrant onlyBackend whenNotPaused {
        require(player != address(0), "CB: zero address");
        require(cipherWinReward > 0, "CB: cipher reward disabled");

        uint256 today = block.timestamp / 1 days;
        if (lastCipherRewardDay[player] != today) {
            lastCipherRewardDay[player] = today;
            cipherRewardsToday[player]  = 0;
        }
        require(cipherRewardsToday[player] < CIPHER_DAILY_WIN_CAP, "CB: daily cipher cap");

        _payoutFromRewardPool(player, cipherWinReward);

        cipherRewardsToday[player] += 1;
        emit CipherRewardPaid(player, cipherWinReward, cipherRewardsToday[player]);
    }

    /**
     * @notice Pay a weekly prize after backend audit.
     * @param prizeIndex 0 = 1st CMC, 1 = 2nd CMC, 2 = 3rd CMC, 3 = most active
     * @param weekId     Unix timestamp of the Monday that starts the rewarded week
     */
    function rewardWeekly(address player, uint8 prizeIndex, uint256 weekId)
        external
        nonReentrant
        onlyBackend
        whenNotPaused
    {
        require(player != address(0),           "CB: zero address");
        require(prizeIndex < WEEKLY_PRIZE_COUNT, "CB: invalid prize index");
        require(weekId > 0,                     "CB: invalid week");
        require(!weeklyRewardClaimed[weekId][player][prizeIndex], "CB: already rewarded");

        uint256 amount = weeklyPrizes[prizeIndex];
        require(amount > 0, "CB: prize disabled");

        weeklyRewardClaimed[weekId][player][prizeIndex] = true;
        _payoutFromRewardPool(player, amount);

        emit WeeklyRewardPaid(player, amount, prizeIndex, weekId);
    }

    function setCipherWinReward(uint256 amount) external onlyOwner {
        cipherWinReward = amount;
    }

    function setWeeklyPrizes(uint256[4] calldata prizes) external onlyOwner {
        weeklyPrizes = prizes;
    }

    function _payoutFromRewardPool(address to, uint256 amount) internal {
        require(amount > 0, "CB: zero amount");
        require(rewardPoolBalance >= amount, "CB: insufficient reward pool");
        rewardPoolBalance -= amount;
        require(usdToken.transfer(to, amount), "CB: reward transfer failed");
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
    // V2 added reward-pool state (9 slots); __gap reduced 46 → 37.
    // When adding new state variables in V3+:
    //   1. Append AFTER weeklyRewardClaimed, never reorder existing variables
    //   2. Reduce __gap size by the number of new slots added
    //   3. Never change existing struct field order or types
}
