# Crack-my-code: Technical Specification

**Version:** 1.0  
**Network:** Celo Mainnet (Chain ID: 42220)  
**Distribution:** MiniPay MiniApp + Farcaster Frame  
**Last Updated:** 2025

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Game Modes](#3-game-modes)
4. [Game Rules & Logic](#4-game-rules--logic)
5. [Points & Ranking System](#5-points--ranking-system)
6. [Smart Contract Architecture](#6-smart-contract-architecture)
7. [Contract Data Structures](#7-contract-data-structures)
8. [Contract Function Reference](#8-contract-function-reference)
9. [On-Chain Events Reference](#9-on-chain-events-reference)
10. [Match Lifecycle (State Machine)](#10-match-lifecycle-state-machine)
11. [Backend Architecture](#11-backend-architecture)
12. [Frontend Architecture](#12-frontend-architecture)
13. [Off-Chain vs On-Chain Data Split](#13-off-chain-vs-on-chain-data-split)
14. [Token & Payment Flow](#14-token--payment-flow)
15. [MiniPay Integration](#15-minipay-integration)
16. [Farcaster Integration](#16-farcaster-integration)
17. [AI Opponent Mode](#17-ai-opponent-mode)
18. [Security Considerations](#18-security-considerations)
19. [Upgrade Process (UUPS)](#19-upgrade-process-uups)
20. [Environment Variables & Config](#20-environment-variables--config)
21. [Contract Deployment Addresses](#21-contract-deployment-addresses)
22. [Known Limitations & Future Work](#22-known-limitations--future-work)

---

## 1. Product Overview

Codebreaker is a real-time 1v1 logic duel game. Each player secretly sets a 4-digit code (digits 0–9, no repeats). Players alternate guessing the opponent's code. After each guess, the server evaluates and returns colour-coded clues:

- **Green** — correct digit, correct position
- **Yellow** — correct digit, wrong position
- **Gray** — digit not in the code

The first player to fully crack the opponent's code wins. Matches last 30–60 seconds.

### Core Design Principles

- Every completed PvP match result is recorded on-chain
- Player profiles (stats, points, match history) live on-chain — verifiable by anyone
- Game logic (guesses, clue evaluation, turn management) runs off-chain for speed
- On-chain is the source of truth for outcomes, money, and identity
- Celo's near-zero gas makes per-match transactions economically viable

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│   MiniPay MiniApp (Next.js)    Farcaster Frame (Next.js)        │
│   ─ Embedded in MiniPay app    ─ Rendered in Warpcast / clients │
│   ─ Wallet: MiniPay provider   ─ Wallet: WalletConnect / Privy  │
└──────────────────────┬──────────────────────────────────────────┘
                       │  HTTPS + WebSocket
┌──────────────────────▼──────────────────────────────────────────┐
│                       BACKEND LAYER                             │
│                                                                 │
│   Next.js API Routes / Node.js server                           │
│   ─ Match orchestration (create, join, resolve)                 │
│   ─ Real-time game state via WebSocket (Socket.io)              │
│   ─ Guess evaluation (evaluateGuess algorithm)                  │
│   ─ AI opponent engine                                          │
│   ─ Farcaster frame renderer                                    │
│   ─ On-chain transaction signer (backend wallet)                │
│                                                                 │
│   PostgreSQL / PlanetScale                                      │
│   ─ Guess history (digits + clues per guess)                    │
│   ─ Match session state (codes, turn tracking)                  │
│   ─ Player sessions                                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │  ethers.js / viem
┌──────────────────────▼──────────────────────────────────────────┐
│                    BLOCKCHAIN LAYER                             │
│                                                                 │
│   Codebreaker.sol (UUPS Proxy on Celo)                          │
│   ─ Player profiles (points, stats, match ID arrays)            │
│   ─ Match records (participants, outcome, type, timestamp)      │
│   ─ USDT escrow for paid matches                                │
│   ─ Treasury accumulation (1% of paid pools)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Blockchain interaction | ethers.js v6 / viem |
| Real-time comms | Socket.io |
| Database | PostgreSQL |
| Smart contract language | Solidity 0.8.20 |
| Contract framework | Hardhat + OpenZeppelin |
| Upgrade pattern | UUPS (EIP-1822) |
| Network | Celo Mainnet (Chain ID 42220) |
| Staking token | cUSD or USDT on Celo |
| MiniApp runtime | MiniPay embedded browser |
| Farcaster | Frames v2 |

---

## 3. Game Modes

### 3.1 Play vs AI (Free, no wallet required)

- No stake, no on-chain transaction
- Points are NOT updated on-chain (local session only)
- Match is NOT stored on-chain
- AI difficulty levels: Easy, Medium, Hard (see Section 17)
- Purpose: onboarding, casual play, learning the game

### 3.2 Free PvP

- No stake required
- Player must be registered on-chain (one-time tx on first play)
- Match result IS stored on-chain
- Points ARE updated on-chain after match resolution
- Both players must be registered before a match can start
- Match record stored with `MatchType.Free` and `stakeAmount = 0`

### 3.3 Paid PvP

- 0.2 USDT stake per player (configurable by contract owner)
- Both players must approve the contract to spend `stakeAmount` before joining
- Winner receives 99% of the total pool (0.396 USDT from a 0.4 USDT pool)
- 1% (0.004 USDT) goes to the treasury address
- On quit: full pool (minus 1%) awarded to opponent immediately
- Match result stored on-chain with full financial details

### 3.4 Mode Decision Tree

```
User opens game
    │
    ├─► "Play AI"         → No wallet needed → AI match (off-chain only)
    │
    ├─► "Free PvP"        → Wallet connect → Register if new → Create/Join challenge
    │                                                         → Match result on-chain
    │
    └─► "Paid PvP"        → Wallet connect → Register if new → Approve USDT
                                                              → Create/Join challenge
                                                              → Match result on-chain
                                                              → USDT payout on resolve
```

---

## 4. Game Rules & Logic

### 4.1 Code Rules

- Exactly 4 digits
- Each digit is 0–9
- No digit may repeat (e.g. 1234 is valid, 1123 is invalid)
- Codes are never transmitted to the opponent's client
- Codes are stored only in the backend database (hashed with bcrypt, plaintext used only during evaluation)

### 4.2 Turn Structure

- Player 1 (challenge creator) goes first
- Players alternate turns
- A turn consists of: entering 4 digits → submitting → receiving clues
- Maximum 8 guesses per player
- If both players exhaust 8 guesses without cracking, the player with more green clues in their final guess wins. If tied, the player who guessed first in that round wins (player 1 advantage)

### 4.3 Clue Evaluation Algorithm

```typescript
function evaluateGuess(guess: number[], secret: number[]): Clue[] {
  const clues: Clue[] = Array(4).fill('gray');
  const secretUsed = Array(4).fill(false);
  const guessUsed  = Array(4).fill(false);

  // Pass 1: exact position (green)
  for (let i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) {
      clues[i] = 'green';
      secretUsed[i] = guessUsed[i] = true;
    }
  }

  // Pass 2: correct digit, wrong position (yellow)
  for (let i = 0; i < 4; i++) {
    if (guessUsed[i]) continue;
    for (let j = 0; j < 4; j++) {
      if (secretUsed[j]) continue;
      if (guess[i] === secret[j]) {
        clues[i] = 'yellow';
        secretUsed[j] = true;
        break;
      }
    }
  }

  return clues; // array of 'green' | 'yellow' | 'gray'
}
```

This algorithm runs exclusively on the backend. The frontend never evaluates guesses — it only displays results returned by the server. This prevents cheating by code inspection.

### 4.4 Win Condition

A guess where all 4 clues are green immediately ends the match. The backend calls `resolveMatch()` on the contract.

### 4.5 Match Timer

- 60 seconds per match (configurable)
- Timer is tracked server-side, not on-chain
- If time expires: the player with more green clues across all their guesses wins
- If still tied at time expiry: player 1 (challenge creator) wins
- Backend calls `resolveMatch()` with the determined winner

### 4.6 Quit Behaviour

- If a player closes the app, disconnects websocket, or clicks Quit:
  - Backend detects disconnection (30-second grace period for reconnect)
  - After grace period: backend calls `recordQuit(matchId, quitterAddress)`
  - Contract awards win to opponent, deducts 20 points from quitter
  - If paid: opponent receives full pool minus 1% fee immediately

---

## 5. Points & Ranking System

### 5.1 Point Changes

| Event | Points Change |
|---|---|
| New player registration | +1000 (starting balance) |
| Win a match (any mode) | +22 |
| Lose a match | -15 |
| Quit mid-match | -20 |
| Points floor | 0 (cannot go negative) |

Points are stored as `uint256` on-chain. The contract handles underflow prevention — if a deduction would take points below 0, it sets to 0 instead.

### 5.2 Rank Tiers

Ranks are computed off-chain from the on-chain points value. They are display-only and not stored in the contract.

| Rank | Points Range |
|---|---|
| Bronze | 0 – 999 |
| Silver I | 1000 – 1199 |
| Silver II | 1200 – 1399 |
| Gold I | 1400 – 1699 |
| Gold II | 1700 – 1999 |
| Platinum | 2000 – 2499 |
| Diamond | 2500 – 2999 |
| Master | 3000+ |

### 5.3 Leaderboard

The leaderboard is built by indexing `PointsUpdated` events from the contract. The backend maintains a cached leaderboard that refreshes every 60 seconds. The raw data is always verifiable on-chain by anyone.

---

## 6. Smart Contract Architecture

### 6.1 Upgrade Pattern: UUPS (EIP-1822)

The contract uses OpenZeppelin's UUPS (Universal Upgradeable Proxy Standard) pattern:

```
User/Backend
     │
     ▼
┌──────────────────────┐
│   ERC1967 Proxy      │  ← permanent address, delegates all calls
│   (stores impl addr) │
└──────────┬───────────┘
           │ delegatecall
           ▼
┌──────────────────────┐
│   Codebreaker.sol    │  ← contains logic + _authorizeUpgrade()
│   (implementation)   │
└──────────────────────┘
```

Key properties:
- The proxy address never changes — frontend, users, and integrations always point to the same address
- Only the contract owner can call `upgradeTo(newImpl)` via `_authorizeUpgrade()`
- Storage lives in the proxy, not the implementation
- Safe storage layout is maintained via the `__gap` array pattern
- `upgrades.validateUpgrade()` in Hardhat checks storage compatibility before deployment

### 6.2 Inheritance Chain

```
Codebreaker
  ├── Initializable          (replaces constructor)
  ├── UUPSUpgradeable        (upgrade mechanism)
  ├── OwnableUpgradeable     (admin access control)
  ├── ReentrancyGuardUpgradeable  (prevents re-entrancy attacks)
  └── PausableUpgradeable    (emergency pause)
```

### 6.3 Access Control

| Function | Who Can Call |
|---|---|
| `register()` | Any address |
| `createChallenge()` | Any registered player |
| `joinChallenge()` | Any registered player (not the challenger) |
| `cancelChallenge()` | Challenge creator only |
| `expireMatch()` | Anyone (permissionless cleanup) |
| `resolveMatch()` | Backend wallet (owner) only |
| `recordQuit()` | Backend wallet (owner) only |
| `updateGuessCounts()` | Backend wallet (owner) only |
| `setTreasury()` | Owner only |
| `setStakeAmount()` | Owner only |
| `pause() / unpause()` | Owner only |
| `emergencyWithdraw()` | Owner only (when paused) |
| `upgradeTo()` | Owner only |

Note: In a production upgrade, `onlyBackend` should be replaced with OpenZeppelin's `AccessControl` to separate the deployer/admin key from the backend operational key.

---

## 7. Contract Data Structures

### 7.1 PlayerProfile

Stored in `mapping(address => PlayerProfile) public players`.

```solidity
struct PlayerProfile {
    uint256 points;           // current points balance
    uint256 gamesPlayed;      // total games (won + lost + quit)
    uint256 gamesWon;         // games won
    uint256 gamesLost;        // games lost normally
    uint256 gamesQuit;        // games abandoned by this player
    uint256 registeredAt;     // block.timestamp of first interaction
    bytes32[] matchIds;       // all PvP match IDs (paginated via getPlayerMatches)
}
```

Read with: `getPlayer(address wallet) → PlayerProfile`

### 7.2 Match

Stored in `mapping(bytes32 => Match) public matches`.

```solidity
struct Match {
    bytes32     id;               // keccak256(player1, timestamp, nonce)
    address     player1;          // challenge creator
    address     player2;          // joiner (address(0) while pending)
    address     winner;           // address(0) while active
    address     quitter;          // address(0) if no quit occurred
    MatchType   matchType;        // Free | Paid
    MatchStatus status;           // Pending | Active | Completed | Abandoned | Expired | Refunded
    uint256     stakeAmount;      // per-player stake (0 for free)
    uint256     totalPool;        // stakeAmount * 2 (set when player2 joins)
    uint256     createdAt;        // block.timestamp when challenge was created
    uint256     startedAt;        // block.timestamp when player2 joined
    uint256     endedAt;          // block.timestamp when match was resolved
    uint256     player1Guesses;   // written by backend at resolve time
    uint256     player2Guesses;   // written by backend at resolve time
}
```

Read with: `getMatch(bytes32 matchId) → Match`

### 7.3 MatchType Enum

```solidity
enum MatchType { Free, Paid }
// Free = 0, Paid = 1
```

### 7.4 MatchStatus Enum

```solidity
enum MatchStatus {
    Pending,    // 0 — waiting for opponent
    Active,     // 1 — both players in, game running
    Completed,  // 2 — winner decided normally
    Abandoned,  // 3 — one player quit
    Expired,    // 4 — nobody joined within matchExpiry window
    Refunded    // 5 — reserved for future dispute resolution
}
```

---

## 8. Contract Function Reference

### 8.1 Player Functions

#### `register()`
- Registers a new player with 1000 starting points
- Idempotent — safe to call multiple times
- Auto-called internally by `createChallenge` and `joinChallenge`
- Emits: `PlayerRegistered(address player, uint256 timestamp)`

#### `createChallenge(bool isPaid) → bytes32 matchId`
- Creates an open challenge on the lobby board
- If `isPaid = true`: transfers `stakeAmount` of USDT from caller to contract
  - Caller must have called `usdToken.approve(contractAddress, stakeAmount)` first
- Returns the generated `matchId`
- Emits: `ChallengeCreated(matchId, challenger, matchType, stakeAmount)`

#### `joinChallenge(address challenger)`
- Joins an open challenge from the lobby
- If paid: transfers `stakeAmount` from caller to contract
- Activates the match (status → Active)
- Emits: `ChallengeJoined(matchId, challenger, opponent, startedAt)`

#### `cancelChallenge()`
- Cancels caller's own pending challenge
- Refunds stake if paid
- Emits: `ChallengeCancelled(matchId, challenger)`

#### `expireMatch(bytes32 matchId)`
- Permissionless — anyone can call this on an expired pending match
- Refunds stake to original challenger
- Emits: `MatchExpired(matchId, challenger)`

### 8.2 Backend-Only Functions

#### `resolveMatch(bytes32 matchId, address winner, uint256 p1Guesses, uint256 p2Guesses)`
- Finalises a completed match
- Pays winner (99% of pool) and treasury (1%) for paid matches
- Updates both players' stats and points
- Emits: `MatchCompleted(matchId, winner, loser, payout, treasuryFee, matchType)`

#### `recordQuit(bytes32 matchId, address quitter)`
- Marks a match as abandoned due to quit
- Pays full pool to opponent (minus 1% fee) for paid matches
- Deducts 20 points from quitter, awards 22 points to opponent
- Emits: `MatchAbandoned(matchId, quitter, winner)`

#### `updateGuessCounts(bytes32 matchId, uint256 p1Guesses, uint256 p2Guesses)`
- Updates the guess count fields mid-match (informational only)
- Emits: `GuessCountsUpdated(matchId, p1Guesses, p2Guesses)`

### 8.3 View Functions

#### `getPlayer(address wallet) → PlayerProfile`
Returns full player profile including points, stats, and match ID array.

#### `getPlayerMatches(address wallet, uint256 offset, uint256 limit) → bytes32[]`
Paginated list of match IDs for a player. Use offset/limit to avoid gas ceiling on large arrays.

#### `getMatch(bytes32 matchId) → Match`
Returns full match record by ID.

#### `getMatchCount(address wallet) → uint256`
Returns total number of matches played by a player.

#### `getOpenChallenge(address challenger) → (bytes32 matchId, Match memory m)`
Returns the open challenge for a given challenger, if any.

#### `isInMatch(address player) → bool`
Returns true if the player currently has an active match.

#### `contractBalance() → uint256`
Returns the total USDT balance escrowed in the contract.

### 8.4 Admin Functions

| Function | Description |
|---|---|
| `setTreasury(address)` | Update treasury address |
| `setStakeAmount(uint256)` | Update required stake (in token decimals) |
| `setTreasuryFeeBps(uint256)` | Update fee in basis points (max 500 = 5%) |
| `setMatchExpiry(uint256)` | Update pending match timeout in seconds |
| `setUsdToken(address)` | Update the staking token address |
| `pause()` | Pause all non-view functions |
| `unpause()` | Resume operations |
| `emergencyWithdraw()` | Send all contract balance to treasury (only when paused) |

---

## 9. On-Chain Events Reference

All events are indexed and should be consumed by the backend indexer for leaderboard and notification purposes.

```solidity
PlayerRegistered(address indexed player, uint256 timestamp)
// Emitted once per wallet when they first interact with the contract

ChallengeCreated(bytes32 indexed matchId, address indexed challenger, MatchType matchType, uint256 stakeAmount)
// Emitted when a new challenge is posted to the lobby board

ChallengeJoined(bytes32 indexed matchId, address indexed challenger, address indexed opponent, uint256 startedAt)
// Emitted when a second player joins — match is now Active

ChallengeCancelled(bytes32 indexed matchId, address indexed challenger)
// Emitted when challenger cancels their own pending challenge

MatchCompleted(bytes32 indexed matchId, address indexed winner, address indexed loser, uint256 payout, uint256 treasuryFee, MatchType matchType)
// Emitted when a match is resolved normally

MatchAbandoned(bytes32 indexed matchId, address indexed quitter, address indexed winner)
// Emitted when a player quits mid-match

MatchExpired(bytes32 indexed matchId, address indexed challenger)
// Emitted when a pending challenge times out

GuessCountsUpdated(bytes32 indexed matchId, uint256 player1Guesses, uint256 player2Guesses)
// Emitted when backend updates guess counts (informational)

PointsUpdated(address indexed player, uint256 oldPoints, uint256 newPoints, string reason)
// Emitted on every point change — use this to build the leaderboard
```

---

## 10. Match Lifecycle (State Machine)

```
createChallenge()
       │
       ▼
  ┌─────────┐
  │ PENDING │─────────────────────────────────┐
  └────┬────┘                                 │
       │                              cancelChallenge()
  joinChallenge()                    or expireMatch()
       │                                      │
       ▼                                      ▼
  ┌────────┐                           ┌─────────┐
  │ ACTIVE │                           │ EXPIRED │
  └────┬───┘                           └─────────┘
       │
       ├─────────────────────┬────────────────────────┐
       │                     │                        │
  resolveMatch()        recordQuit()           (future)
       │                     │                        │
       ▼                     ▼                        ▼
  ┌───────────┐        ┌──────────┐           ┌──────────┐
  │ COMPLETED │        │ ABANDONED│           │ REFUNDED │
  └───────────┘        └──────────┘           └──────────┘
```

### Transition Summary

| From | To | Trigger | Who |
|---|---|---|---|
| (none) | Pending | `createChallenge()` | Player |
| Pending | Active | `joinChallenge()` | Opponent |
| Pending | Expired | `cancelChallenge()` or `expireMatch()` | Player / Anyone |
| Active | Completed | `resolveMatch()` | Backend |
| Active | Abandoned | `recordQuit()` | Backend |

---

## 11. Backend Architecture

### 11.1 Responsibilities

The backend owns all real-time game logic. It is the single source of truth for the game in progress. The smart contract is the source of truth for outcomes.

- **Match orchestration**: Creates, tracks, and resolves match sessions
- **Code management**: Stores player secret codes (hashed), never exposed to opponent
- **Guess evaluation**: Runs the `evaluateGuess()` algorithm server-side
- **Turn management**: Enforces alternating turns, validates guess timing
- **WebSocket server**: Pushes real-time clue results and turn updates to clients
- **Timer management**: Tracks 60-second match timer, resolves on expiry
- **Disconnect handling**: Detects quit via WebSocket disconnect, calls `recordQuit()`
- **Contract signer**: Signs and broadcasts `resolveMatch()` and `recordQuit()` transactions
- **Event indexer**: Listens to contract events to maintain leaderboard cache
- **Farcaster frame renderer**: Generates frame images and handles frame callbacks

### 11.2 Database Schema (PostgreSQL)

```sql
-- Session-level game data (not on-chain)
CREATE TABLE match_sessions (
    id            UUID PRIMARY KEY,
    match_id      BYTEA UNIQUE,          -- bytes32 contract match ID
    player1_addr  VARCHAR(42) NOT NULL,
    player2_addr  VARCHAR(42),
    player1_code  VARCHAR(4),            -- hashed with bcrypt
    player2_code  VARCHAR(4),            -- hashed with bcrypt
    player1_code_locked  BOOLEAN DEFAULT FALSE,
    player2_code_locked  BOOLEAN DEFAULT FALSE,
    current_turn  VARCHAR(42),           -- address of player whose turn it is
    status        VARCHAR(20) DEFAULT 'waiting',
    is_paid       BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMP DEFAULT NOW(),
    started_at    TIMESTAMP,
    ended_at      TIMESTAMP
);

-- All guesses for every match
CREATE TABLE guesses (
    id            SERIAL PRIMARY KEY,
    match_id      BYTEA NOT NULL REFERENCES match_sessions(match_id),
    guesser_addr  VARCHAR(42) NOT NULL,
    guess_number  INTEGER NOT NULL,       -- 1-indexed
    digits        INTEGER[4] NOT NULL,    -- [d1, d2, d3, d4]
    clues         VARCHAR[4] NOT NULL,    -- ['green','yellow','gray',...]
    submitted_at  TIMESTAMP DEFAULT NOW()
);

-- Cached leaderboard (rebuilt from chain events every 60s)
CREATE TABLE leaderboard_cache (
    wallet        VARCHAR(42) PRIMARY KEY,
    points        INTEGER NOT NULL,
    games_played  INTEGER NOT NULL,
    games_won     INTEGER NOT NULL,
    rank_name     VARCHAR(20),
    updated_at    TIMESTAMP DEFAULT NOW()
);
```

### 11.3 WebSocket Events

```typescript
// Server → Client
'match:found'         { matchId, opponent, isPaid }
'code:locked'         { player: 'opponent' }  // opponent locked their code
'game:started'        { yourTurn: boolean }
'guess:result'        { guessNumber, digits, clues, isWin }
'opponent:guessed'    { guessNumber }  // opponent made a guess (no details)
'turn:change'         { yourTurn: boolean }
'timer:update'        { secondsLeft: number }
'match:ended'         { winner, opponentCode, ratingDelta }
'opponent:quit'       {}
'opponent:reconnecting' {}

// Client → Server
'code:set'            { matchId, code: number[] }
'guess:submit'        { matchId, digits: number[] }
'player:quit'         { matchId }
'player:reconnect'    { matchId }
```

---

## 12. Frontend Architecture

### 12.1 Component Tree

```
app/page.tsx                    ← Game state machine, phase router
│
├── components/Lobby.tsx        ← Home: rating, find match, matchmaking radar
├── components/SetCode.tsx      ← Secret code entry: 4 digit slots + number grid
├── components/GameBoard.tsx    ← Main game: guess history, opponent bar, input, pad
│   ├── components/GuessRow.tsx     ← Single guess with animated clue dots
│   └── components/NumberPad.tsx    ← 0–9 digit input grid
└── components/ResultModal.tsx  ← Win/Lose sheet: code reveal, rating delta, confetti
```

### 12.2 Game Phase State Machine (Frontend)

```typescript
type GamePhase = 'lobby' | 'matchmaking' | 'setCode' | 'playing' | 'result'
```

Transitions:
- `lobby` → `matchmaking` on "Find Match" button press
- `matchmaking` → `setCode` when server confirms opponent found
- `setCode` → `playing` when player locks code AND server confirms opponent locked
- `playing` → `result` when WebSocket emits `match:ended`
- `result` → `lobby` on "Play Again" button press

### 12.3 Wallet Integration

For MiniPay:
```typescript
// MiniPay injects window.ethereum with the user's Celo wallet
const provider = new ethers.BrowserProvider(window.ethereum);
const signer   = await provider.getSigner();
const address  = await signer.getAddress();
```

For Farcaster (WalletConnect):
```typescript
// Use @farcaster/frame-sdk or Privy for wallet connection
import { sdk } from '@farcaster/frame-sdk';
const { address } = await sdk.wallet.ethProvider.request({ method: 'eth_requestAccounts' });
```

### 12.4 Contract Interaction from Frontend

```typescript
import { ethers } from 'ethers';
import CodebreakerABI from '@/abi/Codebreaker.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

// Read player profile
async function getPlayer(address: string) {
  const provider = new ethers.JsonRpcProvider('https://forno.celo.org');
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CodebreakerABI, provider);
  return contract.getPlayer(address);
}

// Approve USDT before paid match
async function approveStake(signer: ethers.Signer, stakeAmount: bigint) {
  const usdtAddress = process.env.NEXT_PUBLIC_USDT_ADDRESS;
  const usdt = new ethers.Contract(usdtAddress, ERC20_ABI, signer);
  const tx = await usdt.approve(CONTRACT_ADDRESS, stakeAmount);
  await tx.wait();
}

// Create a challenge
async function createChallenge(signer: ethers.Signer, isPaid: boolean) {
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CodebreakerABI, signer);
  const tx = await contract.createChallenge(isPaid);
  const receipt = await tx.wait();
  // Extract matchId from ChallengeCreated event
  const event = receipt.logs.find(l => l.topics[0] === CHALLENGE_CREATED_TOPIC);
  return event.topics[1]; // matchId as bytes32
}
```

---

## 13. Off-Chain vs On-Chain Data Split

This is the most important architectural decision. The rule is: **speed-sensitive data is off-chain, outcome and identity data is on-chain.**

### Stored On-Chain

| Data | Location | Why |
|---|---|---|
| Player points | `PlayerProfile.points` | Verifiable, trustless leaderboard |
| Games played / won / lost / quit | `PlayerProfile` | Public stats, anti-cheat auditability |
| Match IDs per player | `PlayerProfile.matchIds[]` | History lookup by wallet |
| Match participants | `Match.player1/player2` | Who played whom |
| Match outcome (winner) | `Match.winner` | Irrefutable result |
| Match type (free/paid) | `Match.matchType` | Financial transparency |
| Stake amount | `Match.stakeAmount` | Financial record |
| Match timestamps | `Match.createdAt/startedAt/endedAt` | Immutable timeline |
| Guess counts | `Match.player1Guesses/player2Guesses` | Summary stat |
| USDT escrow | Contract balance | The money itself |

### Stored Off-Chain (Database)

| Data | Why Off-Chain |
|---|---|
| Secret codes (hashed) | Never goes on-chain — would reveal the answer |
| Individual guesses (digits array) | Too much gas; real-time speed required |
| Clue arrays per guess | Same — real-time, high frequency |
| Current turn state | Changes every few seconds |
| WebSocket session state | Ephemeral, millisecond-sensitive |
| Player sessions / auth tokens | Standard web session management |

---

## 14. Token & Payment Flow

### 14.1 Paid Match Flow

```
Before match:
  Player1 ──approve(contract, 0.2 USDT)──► USDT Contract
  Player2 ──approve(contract, 0.2 USDT)──► USDT Contract

createChallenge(true):
  Player1 ──transferFrom──► Codebreaker Contract (holds 0.2 USDT)

joinChallenge(player1):
  Player2 ──transferFrom──► Codebreaker Contract (now holds 0.4 USDT)

resolveMatch(matchId, winner):
  Codebreaker ──0.396 USDT──► Winner
  Codebreaker ──0.004 USDT──► Treasury
```

### 14.2 Quit Flow (Paid Match)

```
recordQuit(matchId, quitter):
  Codebreaker ──0.396 USDT──► Opponent (winner by forfeit)
  Codebreaker ──0.004 USDT──► Treasury
  Points: quitter -20, opponent +22
```

### 14.3 Expired Match Refund

```
expireMatch(matchId):
  Codebreaker ──0.2 USDT──► Challenger (full refund, no fee)
```

### 14.4 Treasury Accumulation

The treasury address accumulates 1% of every paid match. It is a configurable address (multisig recommended). Future uses:
- Weekend tournament prize pools
- Daily streak reward drip
- Rank-up badge minting costs
- Platform development fund

### 14.5 Token Addresses on Celo

| Token | Address | Decimals |
|---|---|---|
| cUSD | `0x765DE816845861e75A25fCA122bb6898B8B1282a` | 18 |
| USDT | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` | 6 |

Note: If using USDT (6 decimals), `stakeAmount` is `200000` (0.2 USDT). If using cUSD (18 decimals), it is `200000000000000000` (0.2 cUSD). Confirm the correct token address before deployment — USDT bridged addresses may change.

---

## 15. MiniPay Integration

MiniPay is a mobile-first crypto wallet built into the Opera Mini browser, popular in sub-Saharan Africa. It runs on Celo and natively supports cUSD transactions.

### 15.1 Detection

```typescript
// Detect MiniPay environment
const isMiniPay = window.ethereum?.isMiniPay === true;

if (isMiniPay) {
  // MiniPay injects window.ethereum — no WalletConnect needed
  // User is already authenticated with their Celo address
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer   = await provider.getSigner();
}
```

### 15.2 MiniPay-Specific Considerations

- MiniPay only supports Celo network — no chain switching needed
- The embedded browser has limited screen real estate — all UI must be mobile-first
- MiniPay users prefer cUSD over USDT — consider defaulting to cUSD
- Deep links into the MiniApp use the format: `minipay://open?url=https://codebreaker.app`
- MiniPay supports EIP-1193 provider interface

### 15.3 MiniApp manifest (minipay-manifest.json)

```json
{
  "name": "Codebreaker",
  "description": "Real-time 1v1 code-cracking duel on Celo",
  "iconUrl": "https://codebreaker.app/icon.png",
  "url": "https://codebreaker.app",
  "categories": ["games"],
  "chains": ["celo:42220"]
}
```

---

## 16. Farcaster Integration

### 16.1 Frames v2

Codebreaker uses Farcaster Frames v2 to embed interactive game moments in the Farcaster social feed. Frames render as interactive cards inside Warpcast and other Farcaster clients.

### 16.2 Frame Use Cases

**Challenge Frame**: When a player creates a paid challenge, they can share a frame:
```
┌──────────────────────────────────────────┐
│  🧠 CODEBREAKER CHALLENGE                │
│                                          │
│  @username is challenging you to a       │
│  0.2 USDT code duel on Celo              │
│                                          │
│  [Accept Challenge]  [Watch]             │
└──────────────────────────────────────────┘
```

**Victory Frame**: After winning, the player can share:
```
┌──────────────────────────────────────────┐
│  ✅ CRACKED IN 3 GUESSES                 │
│                                          │
│  @winner just cracked @loser's code      │
│  and won 0.396 USDT                      │
│                                          │
│  [Challenge Me]  [Play Free]             │
└──────────────────────────────────────────┘
```

### 16.3 Frame API Route

```typescript
// app/api/frame/route.ts
import { getFrameMessage } from '@farcaster/frame-node';

export async function POST(req: Request) {
  const body = await req.json();
  const message = await getFrameMessage(body);

  if (!message.isValid) return new Response('Invalid frame message', { status: 400 });

  const { buttonIndex, fid, address } = message;

  // buttonIndex 1 = Accept Challenge
  if (buttonIndex === 1) {
    const matchId = new URL(req.url).searchParams.get('matchId');
    // Redirect to game with matchId pre-filled
    return Response.redirect(`https://codebreaker.app/join/${matchId}`);
  }
}
```

### 16.4 Farcaster Wallet

Farcaster users connect wallets via `@farcaster/frame-sdk`:
```typescript
import { sdk } from '@farcaster/frame-sdk';
await sdk.actions.ready();
const provider = sdk.wallet.ethProvider;
// Use provider with ethers.js BrowserProvider
```

---

## 17. AI Opponent Mode

### 17.1 Overview

The AI mode is played entirely off-chain. No contract interaction occurs. Points are tracked locally in session state only (not persisted to chain). The purpose is onboarding and casual play.

### 17.2 Difficulty Levels

**Easy**
- AI makes random valid guesses (no-repeat 4-digit codes)
- Ignores clue feedback from previous guesses
- Average solve: 6–8 guesses

**Medium**
- AI uses clue feedback to eliminate impossible digits
- Applies basic constraint satisfaction (excludes gray digits, locks in green positions)
- Average solve: 4–5 guesses

**Hard**
- AI uses a minimax/entropy-based algorithm (Knuth's 5-guess algorithm adapted for 10-digit space)
- Guarantees a solve within 5 guesses from an optimal first guess
- First guess is always a pre-computed optimal opener (e.g. `1 2 3 4`)
- Average solve: 3–4 guesses

### 17.3 AI Thinking Delay

To make the AI feel human, a randomised delay is added before each AI guess:
- Easy: 2000–4000ms
- Medium: 1500–3000ms
- Hard: 800–2000ms

---

## 18. Security Considerations

### 18.1 Secret Code Protection

- Player codes are NEVER sent to the opponent's client
- Codes are stored hashed (bcrypt) in the database
- The backend evaluates all guesses server-side
- The client only receives clue arrays, never the secret

### 18.2 Reentrancy

All state-changing contract functions that transfer tokens use OpenZeppelin's `ReentrancyGuard`. The pattern follows Checks-Effects-Interactions: state is updated before any external token transfer.

### 18.3 Integer Overflow/Underflow

Solidity 0.8+ has built-in overflow protection. The points deduction functions explicitly check before subtracting to prevent underflow to zero (using `> POINTS_LOSS ? points - POINTS_LOSS : 0` pattern).

### 18.4 Frontend Input Validation

All inputs validated client-side AND server-side:
- Code must be exactly 4 digits
- No digit may repeat
- All digits must be 0–9
- Guesses are only accepted when it is the player's turn

### 18.5 Backend Trust Model

The backend is a trusted party for `resolveMatch()` and `recordQuit()`. This is an intentional design choice for speed (real-time game requires immediate response) with the following mitigations:
- Match results are publicly verifiable after the fact on-chain
- Contract is pausable and upgradeable if the backend key is compromised
- In a future upgrade, backend resolution can be replaced with a commit-reveal scheme or ZK proof for fully trustless gameplay

### 18.6 Stake Timing Attack

A player could theoretically try to cancel a challenge at the same moment an opponent joins. This is handled by: the `joinChallenge` function checking `status == Pending` and only one transaction can succeed — if `cancelChallenge` wins, the join fails; if `join` wins, the cancel fails.

### 18.7 Emergency Pause

The contract can be paused by the owner in case of:
- Discovered exploit or vulnerability
- Token address migration required
- Network-level issues on Celo
When paused, all user-facing functions revert. `emergencyWithdraw()` is available only while paused to recover escrowed funds.

---

## 19. Upgrade Process (UUPS)

### 19.1 When to Upgrade

- Adding new features (tournaments, spectator wagering, streak rewards)
- Adding new state variables (always append, never reorder)
- Bug fixes to contract logic
- Emergency security patches

### 19.2 Upgrade Safety Rules

1. **Never reorder existing storage slots** — the proxy reads storage by slot position
2. **Never remove existing state variables** — only append new ones after `__gap`
3. **Never change existing struct layouts** — adding fields to a struct changes all subsequent slots
4. **Reduce `__gap` size** when adding variables: if you add 2 new `uint256` variables, change `uint256[50] private __gap` to `uint256[48] private __gap`
5. **Run `upgrades.validateUpgrade()` in Hardhat** before deploying — it catches layout violations
6. **Test on Alfajores first** before mainnet upgrade

### 19.3 Upgrade Process

```bash
# 1. Write new implementation (CodebreakerV2.sol)
# 2. Validate storage layout
npx hardhat run scripts/validate-upgrade.js --network alfajores
# 3. Deploy to testnet and test
npx hardhat run scripts/upgrade.js --network alfajores
# 4. Audit and verify
# 5. Deploy to mainnet
npx hardhat run scripts/upgrade.js --network celo
# 6. Verify on Celoscan
npx hardhat verify --network celo <newImplementationAddress>
```

---

## 20. Environment Variables & Config

```bash
# .env (backend / deployment)

# Blockchain
DEPLOYER_PRIVATE_KEY=0x...             # deployer wallet private key
BACKEND_PRIVATE_KEY=0x...             # backend signer (for resolveMatch/recordQuit)
TREASURY_ADDRESS=0x...                # multisig treasury wallet

# Contract addresses (filled after deployment)
CONTRACT_ADDRESS=0x...
USDT_ADDRESS=0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
CUSD_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a

# Celo RPC
CELO_RPC_URL=https://forno.celo.org

# Database
DATABASE_URL=postgresql://user:pass@host:5432/codebreaker

# Celoscan
CELOSCAN_API_KEY=...

# WebSocket
WEBSOCKET_PORT=3001

# Frontend (.env.local)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_USDT_ADDRESS=0x...
NEXT_PUBLIC_CUSD_ADDRESS=0x...
NEXT_PUBLIC_WS_URL=wss://api.codebreaker.app
NEXT_PUBLIC_CHAIN_ID=42220
```

---

## 21. Contract Deployment Addresses

| Network | Contract | Address |
|---|---|---|
| Celo Mainnet | Codebreaker Proxy | TBD after deployment |
| Celo Mainnet | Implementation V1 | TBD after deployment |
| Alfajores Testnet | Codebreaker Proxy | TBD after testnet deploy |

Update this table after each deployment. The proxy address is permanent — never changes across upgrades. The implementation address changes with each upgrade.

---

## 22. Known Limitations & Future Work

### Current Limitations

- **Backend trust**: `resolveMatch()` and `recordQuit()` require a trusted backend signer. A fully trustless version would use commit-reveal for codes and ZK proofs for guess evaluation, but this is significantly more complex.
- **Lobby scalability**: `challengeBoard` is a flat mapping — the frontend fetches open challenges by listening to `ChallengeCreated` events, not by iterating the mapping (which would be too expensive).
- **No draw handling**: If both players crack on the same turn (impossible in alternating turns, but technically covered by the backend tiebreaker), the backend decides the winner. The contract does not enforce this.
- **AI mode off-chain**: AI game results do not contribute to on-chain stats. This is intentional to prevent farming points against a scripted opponent.

### Planned Future Features

| Feature | Complexity | Notes |
|---|---|---|
| Daily streak on-chain check-in | Low | Add `lastCheckinAt` to PlayerProfile |
| Soulbound rank badges (SBT) | Medium | Separate ERC-721 contract, non-transferable |
| Weekly tournaments | High | New contract or upgrade with bracket logic |
| Spectator wagering | High | New match state, side-pool escrow |
| Direct challenge (address-to-address) | Medium | Add `directChallenge(address opponent)` function |
| Commit-reveal for trustless codes | Very High | ZK or commit-reveal scheme for codes |
| Multi-token support | Low | `stakeToken` per match type |
| Farcaster notification push | Medium | Neynar API for proactive frame notifications |

---

*This document is the authoritative technical reference for the Codebreaker platform. All AI agents, developers, and integrators working on this codebase should treat this as the primary source of truth for system design decisions.*
