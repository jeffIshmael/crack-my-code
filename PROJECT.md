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

We are not building more product features for their own sake. The mission now is **distribution**: grow from **~75 to 500+ active players**, give them a reason to win and share, and layer USDT rewards (Cipher wins → staked PvP → leaderboard prizes) as players graduate through the funnel.

---

## Milestones

**Today:** ~75 active players · **Target:** 500+ active players

Each milestone is a title and a short plan for how we get there.

---

### Grow the community (75 → 500+ players) — Milestone 1

Cipher-only USDT rewards to drive acquisition. Each wallet gets up to **5 Cipher games per day**; every **win** pays **0.1 USDT** (max 0.5 USDT/day) from the on-contract reward pool via `rewardCipherWin`. No weekly leaderboard prizes in this phase — that comes later. Grant USDT deposits through `depositToRewardPool`. Wins trigger Farcaster share prompts; discovery via casts, Game ID invites, X, Farcaster, and MiniPay until we pass **500 active players**.

---

### Raise the stakes (Professional USDT PvP) — Milestone 2

Once players know the game from Cipher, enable **Professional mode**: two players **lock USDT on-chain** before a match and the winner takes ~99% of the pool. Contract and UI are built — enable `PROFESSIONAL_MODE_ENABLED`, wire gas-sponsored flows, and validate approve → escrow → resolve → payout.

---

### Weekly retention (500+ players) — Milestone 3

**Activates only after Milestone 1 succeeds (500+ players).** Cipher rewards brought them in; **weekly on-chain prizes** keep them coming back. Every **Monday**, audit the prior week and pay **top 3 CMC scorers** and **most games played** via `rewardWeekly`. Spotlight winners in-app and on Farcaster. This is the retention layer, not the growth layer.

---

### Keep them coming back (later)

MiniPay campaigns, rematch nudges via Farcaster notifications, and funnel tracking from first Cipher play → wallet connect → first USDT win → first staked match — so we know what actually retains players after the initial growth push.

---

## Current Status (Snapshot)

| Area | Status |
|------|--------|
| Active players | ~75 |
| Growth target | 500+ (“Grow the community”) |
| Cipher AI | ✅ Live |
| Friendly PvP (public + Game ID) | ✅ Live |
| CMC points & leaderboard | ✅ Live |
| Farcaster Mini App manifest | ✅ Verified |
| Privy wallets + USDT balance UI | ✅ Live |
| Grow the community (Cipher rewards) | 📋 Planned |
| Raise the stakes (Professional PvP) | 🔜 Built, not enabled |
| Reward the top players (Leaderboard) | 📋 Planned |

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
