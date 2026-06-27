# Crack My Code — Project Overview

**Live app:** [crack-my-code.vercel.app](https://crack-my-code.vercel.app)  
**Category:** Competitive strategy game on Celo · Farcaster Mini App · MiniPay

---

## Description

**Crack My Code** is a competitive code-cracking duel built on Celo. Two sides each hide a secret 4-digit code; whoever cracks the opponent’s code first wins. Feedback is Wordle-style — green (correct digit, correct position), yellow (digit in code, wrong position), gray (not in code) — so every guess is a logic puzzle, not a coin flip.

The product is **live and playable today** in the browser, inside **MiniPay**, and as a **Farcaster Mini App**. Players can:

- **Cipher AI** — Instant matches against **Cipher**, an entropy-based AI that narrows 10,000 possible codes using constraint elimination and information-maximizing probes (not random guesses).
- **Friendly PvP** — Free human-vs-human duels via public matchmaking or **invite-only** challenges with a shareable **Game ID**.
- **CMC Points & Leaderboard** — Signed-in players earn **Crack My Code (CMC)** points for wins (+10 vs Cipher, +15 PvP) and climb a global leaderboard.

**Professional (USDT) mode** — staked matches on Celo where the winner takes ~99% of the pool — is built (smart contract + UI) and queued for launch. The core game loop, realtime PvP (Pusher), wallet layer (Privy smart wallets), and Farcaster sharing are already in production.

---

## Problem

Mobile-first Web3 gaming still struggles with three gaps:

1. **Onboarding friction** — Most chain games require a wallet, gas, and token knowledge before a player can even try the game. Casual users bounce before they feel the fun.
2. **Shallow or luck-based gameplay** — Many “play-to-earn” experiences reward grinding or speculation more than skill. There is little room for a player to feel they *outthought* an opponent.
3. **Distribution, not product** — For small teams, the hardest part is not building the game — it is getting people to play it, share it, and come back. Without a clear viral loop and a tangible reason to win, even a polished game stalls after launch.

Crack My Code was built to solve the first two. The remaining challenge is **distribution**: the product is ready; we need players, repeat sessions, and word-of-mouth inside Celo-native channels (Farcaster, MiniPay, social invites).

---

## Solution

Crack My Code combines **instant, skill-based gameplay** with **Celo-native distribution and rewards**:

| Layer | What we built |
|-------|----------------|
| **Gameplay** | 4-digit Mastermind-style duels with Wordle feedback, up to 8 guesses per side, codes with repeating digits allowed. |
| **Cipher AI** | Client-side solver (`cipher.ts`) using candidate filtering, opening book (`0123` → `4567`), entropy probes, and minimax — feels smart and beatable with practice. |
| **Zero-friction entry** | Play Cipher AI without signing in; connect a wallet when ready to earn CMC points and appear on the leaderboard. |
| **Social PvP** | Public lobby + private **Game ID** invites; Farcaster embeds (`fc:miniapp`) so friends can tap **Join Challenge** from a cast. |
| **On-chain stakes (ready)** | `GuessMyCode` UUPS contract on Celo with USDT escrow, 0.1 USDT minimum stake, 1% protocol fee — UI gated until Professional mode launch. |
| **Infrastructure** | Next.js 14, Prisma + PostgreSQL, Pusher realtime, Privy + gas sponsorship path, verified Farcaster manifest at `/.well-known/farcaster.json`. |

The design intent: **play first, earn second**. A new user can crack codes in under a minute; wallet, points, and (soon) USDT rewards layer on only after they are hooked.

---

## Mission Summary

**Make Crack My Code the easiest on-ramp to competitive, skill-based play on Celo** — a game you can open from a Farcaster cast or MiniPay, beat Cipher in one session, challenge a friend with a Game ID, and eventually stake real USDT on your logic.

We are not building more product features for their own sake. The mission now is **distribution**: get Crack My Code in front of players, give them a reason to win and share, and grow daily active games through Celo’s social and wallet surfaces.

---

## Milestones (Future) — Distribution Focus

The product is **ready**. Upcoming work prioritizes **player acquisition, retention, and on-chain activity** over new game mechanics.

### Phase 1 — Win-to-earn vs Cipher AI (near term)

**Goal:** Turn every Cipher victory into a shareable, on-chain moment.

- **Reward:** **0.1 USDT** paid to the player’s wallet when they **beat Cipher AI** (aligned with the contract’s existing `MIN_STAKE` of 0.1 USDT).
- **Requirements:** Wallet connected (Privy / MiniPay / Farcaster); one claim per win; basic sybil resistance (registered address, rate limits, daily cap if needed).
- **Why 0.1 USDT:** Small enough to fund a meaningful campaign, large enough to feel real on Celo; matches the minimum stake already defined in `GuessMyCode.sol`.
- **Distribution hook:** Result screen + Farcaster share — *“I cracked Cipher and earned 0.1 USDT — can you?”*

### Phase 2 — Farcaster & social distribution

- Push **verified Mini App** discovery: casts, challenge embeds, and “Join Challenge” deep links (`/?game=GAMEID`).
- Run weekly **leaderboard spotlights** (top CMC players featured in casts).
- Optional: frame notifications for rematch prompts and streak nudges (webhook + Neynar already scaffolded).

### Phase 3 — Viral PvP loops

- Promote **invite-only Game ID** challenges as the primary friend-acquisition mechanic.
- Highlight **+15 / −15 CMC** PvP scoring so wins have leaderboard stakes even before USDT mode is live.
- Short-form promo (Remotion asset in `apps/promo-video`) for X / Farcaster / MiniPay channels.

### Phase 4 — Professional (USDT) mode launch

- Enable **Professional mode** (`PROFESSIONAL_MODE_ENABLED`) for player-created USDT stakes on Celo.
- Winner receives ~99% of the pool; gas-sponsored flows via Privy smart wallets where possible.
- Cross-promote: players who learned the game via Cipher rewards graduate to staked PvP.

### Phase 5 — Retention & ecosystem fit

- Seasonal leaderboard resets or themed Cipher difficulty events.
- MiniPay-specific campaigns (add-cash → first staked match bonus).
- Track funnel: guest Cipher plays → wallet connect → first USDT win → first PvP invite sent.

---

## Current Status (Snapshot)

| Area | Status |
|------|--------|
| Cipher AI | ✅ Live |
| Friendly PvP (public + Game ID) | ✅ Live |
| CMC points & leaderboard | ✅ Live |
| Farcaster Mini App manifest | ✅ Verified |
| Privy wallets + USDT balance UI | ✅ Live |
| Professional USDT staking | 🔜 Built, not enabled |
| Cipher win USDT reward (0.1) | 📋 Planned — distribution milestone |

---

## Tech Stack (Reference)

- **Frontend:** Next.js 14, React, Tailwind, Framer Motion  
- **Chain:** Celo, USDT (`0x48065f…`), Viem / Wagmi, Privy smart wallets  
- **Backend:** Prisma + PostgreSQL, Pusher (realtime PvP)  
- **AI:** Custom Cipher solver — `apps/web/src/lib/cipher.ts`  
- **Contracts:** `GuessMyCode` (Hardhat) — `apps/contracts/contracts/GuessMyCode.sol`  
- **Distribution:** Farcaster Mini App, MiniPay, shareable game embeds  

---

*Last updated: June 2026*
