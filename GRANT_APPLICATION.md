# Celo Anchor Grant Application — Crack My Code

**Form:** [anchor.prezenti.xyz](https://anchor.prezenti.xyz)  
**Lead applicant:** Jeff Muchiri  
**Live app:** [crack-my-code.vercel.app](https://crack-my-code.vercel.app)

---

## Describe your project *

**Crack My Code** is a competitive code-cracking duel built on Celo. Two players each hide a secret 4-digit code; whoever cracks the opponent's code first wins. Feedback is Wordle-style — green (correct digit, correct position), yellow (digit in code, wrong position), gray (not in code) — so every guess is a logic puzzle, not a coin flip.

The product is **live and playable today** in the browser, inside **MiniPay**, and as a **verified Farcaster Mini App**. Players can:

- **Cipher AI** — Instant matches against **Cipher**, an entropy-based AI that narrows 10,000 possible codes using constraint elimination and information-maximizing probes.
- **Friendly PvP** — Free human-vs-human duels via public matchmaking or **invite-only** challenges with a shareable **Game ID**.
- **CMC Points & Leaderboard** — Signed-in players earn **Crack My Code (CMC)** points for wins (+10 vs Cipher, +15 PvP) and climb a global leaderboard.

**Every completed game is recorded on-chain** on Celo mainnet via the `GuessMyCode` contract:

- **Cipher AI** — 1× `trackGame()` on completion (backend agent).
- **PvP** — **3 on-chain txs per match:**
  1. **Host** calls `createChallenge` when opening a match
  2. **Opponent** calls `joinChallenge` when accepting
  3. **Backend agent** calls `resolveMatch` at game end (full history + IPFS hash)

This gives verifiable, public gameplay on Celo today — not just off-chain state.

**Professional (USDT) mode** — staked matches on Celo where the winner takes ~99% of the pool — is built (smart contract + UI) and queued for launch. The core game loop, realtime PvP (Pusher), wallet layer (Privy smart wallets), and Farcaster sharing are already in production.

**Problem we solve:** Mobile-first Web3 gaming still has high onboarding friction, shallow luck-based gameplay, and weak distribution loops. Crack My Code is designed as **play first, earn second** — a new user can crack codes in under a minute; wallet, points, and (soon) USDT rewards layer on only after they are hooked.

**Mission:** Make Crack My Code the easiest on-ramp to competitive, skill-based play on Celo — open from a Farcaster cast or MiniPay, beat Cipher in one session, challenge a friend with a Game ID, and eventually stake real USDT on your logic.

---

## Please include a demo, if possible

https://crack-my-code.vercel.app

Farcaster Mini App (verified manifest): https://crack-my-code.vercel.app/.well-known/farcaster.json

---

## What stage do you consider your product? *

**Dropdown selection: Not applicable**

The form's transaction-volume stages (Stage 1: >5,000 daily txs · Stage 2: >10,000 · Stage 3: >100,000 · Stage 4: >500,000) measure **scale**, not **product readiness**. We are **below Stage 1 today** on daily transaction volume — and we are transparent about that. We are applying because the **product and on-chain infrastructure are already live**; the grant funds the **distribution and incentive layer** designed to move us toward those thresholds.

**What we can fully demonstrate today:**

| Capability | Status |
|------------|--------|
| Cipher AI gameplay | ✅ Live |
| Friendly PvP (public + Game ID invites) | ✅ Live |
| CMC points & leaderboard | ✅ Live |
| Farcaster Mini App manifest | ✅ Verified |
| Privy wallets + USDT balance UI | ✅ Live |
| `GuessMyCode` USDT escrow contract | ✅ Deployed on Celo mainnet |
| On-chain game recording | ✅ Live — Cipher: `trackGame` · PvP: **3 txs/match** (`createChallenge` → `joinChallenge` → `resolveMatch`) |
| Professional (staked USDT) mode | 🔜 Built, not enabled |
| Cipher win rewards (0.1 USDT) | 📋 Planned (grant-funded) |

**Our read:** We are a **production MVP with real users and on-chain integration**, not yet a **high-throughput Stage 1+ protocol**. This grant is specifically to close that gap.

---

## Exactly how many daily transactions do you have? (2 week moving average on any chain)? *

**Current 14-day moving average: below Stage 1 (<5,000 daily txs on Celo).** We report the measured average honestly; see the live figure at https://crack-my-code.vercel.app/api/stats?scope=all (`onChain.movingAverageDailyOnChainTx`).

**Why volume is low today (and why that is expected, not a product gap):**

We shipped **play-first** with full on-chain integration already wired. Cipher AI and PvP both write to Celo; PvP alone is **3 transactions per match** (create → join → resolve). Volume is still below Stage 1 because **DAU is early** (~75 registered wallets, organic growth only) — not because the chain layer is missing. The grant-funded **Cipher USDT reward campaign** and **Professional staked PvP** add more txs per player (USDT transfers, stakes) on top of this baseline.

**On-chain txs per game type:**

**Cipher AI** — `trackGame()` on completion: **1 tx** per game.

**PvP** — `createChallenge` → `joinChallenge` → `resolveMatch`: **3 txs** per match.

**Cipher win reward** *(post-grant, Milestone 1)* — agent calls `rewardCipherWin` on the contract: **+1 tx** per rewarded win.

**Weekly prizes** *(Mondays, Milestone 3 after 500 players)* — agent calls `rewardWeekly` for top 3 leaderboard + most active: **+4 txs per week**.

**Staked PvP** *(Milestone 2)* — the base 3 PvP txs plus USDT `approve` and escrow transfers: **+2–4 txs** per match.

**What we have today (verifiable):**

We have **75 registered wallet players** and **137 completed games** (lifetime), verifiable at `/api/stats?scope=all`. The split is **113 Cipher AI vs 24 PvP**. Estimated **~185+ lifetime on-chain txs** (113×1 Cipher + 24×3 PvP), cross-checkable via `GameTracked` and `ChallengeCreated` events on [Celoscan](https://celoscan.io/address/0x0317e55136a46557516aa40EA96d66772767C72C). Daily volume is **bursty** — spikes on Farcaster casts and invite sessions, quiet days in between — so we report a 14-day moving average rather than a single-day snapshot.

**How the grant scales tx volume (path toward Stage 1):**

At **500 registered players** (Milestone 1 target), we model roughly **50 PvP matches/day** at 3 txs each (~150 PvP txs), **175 Cipher games/day** at 1 tx each (~175 `trackGame` txs), and **~40 rewarded Cipher wins/day** via `rewardCipherWin` (~40 payout txs) — **~365+ daily on-chain txs** (14-day moving average) within 90 days of grant execution.

**With staked PvP (Milestone 2):** each match adds USDT approve and escrow transfers on top of the base 3 — pushing toward **1,000+ daily txs**.

**Stage 1 target (>5,000 daily txs):** e.g. **400 PvP matches/day × 3 txs** = 1,200, plus Cipher games, Cipher rewards, weekly prizes, and staked-match escrow — achievable at **month 6–12 post-grant** as DAU scales past 500.

**Chain:** Celo mainnet only. Contract: `0x0317e55136a46557516aa40EA96d66772767C72C`.

---

## How are you counting your daily tx's *

**On-chain (primary):** Transaction counts follow the per-mode flows above.

- **Cipher AI:** backend agent calls `trackGame(matchType, isAI)` → `GameTracked` event.
- **PvP (3 txs per match):**
  1. Host wallet → `createChallenge` → `ChallengeCreated`
  2. Opponent wallet → `joinChallenge` → `ChallengeJoined`
  3. Backend agent → `resolveMatch` (winner, codes, IPFS hash, guesses) → `MatchCompleted`

**2-week moving average:** Computed at https://crack-my-code.vercel.app/api/stats?scope=all (`onChain.movingAverageDailyOnChainTx`) — Cipher games count as 1 tx, PvP games as 3 txs. Daily totals vary because gameplay is bursty.

**On-chain verification:** [Celoscan](https://celoscan.io/address/0x0317e55136a46557516aa40EA96d66772767C72C) — filter `ChallengeCreated`, `ChallengeJoined`, `MatchCompleted`, and `GameTracked` events.

**Off-chain (cross-check):** Game completions are also stored in PostgreSQL via Prisma (`Game` table, `status = COMPLETED`). Aggregates at `/api/stats` should align 1:1 with on-chain `trackGame` calls.

**Registered users** are counted in the `User` table (wallet-connected players, excluding guest sessions).

**Future (staked PvP):** Additional on-chain volume from `ChallengeCreated`, `ChallengeJoined`, USDT approve/transfer, and escrow `MatchCompleted` payout events once Professional mode is enabled.

---

## How will this benefit Celo? *

Crack My Code is built specifically for Celo-native distribution and stablecoin utility:

1. **MiniPay & Farcaster on-ramp** — Players discover the game inside MiniPay and via Farcaster casts with one-tap **Join Challenge** embeds. This drives new wallet connections and repeat sessions on Celo without requiring DeFi knowledge first.

2. **USDT utility, not speculation** — Professional mode escrows **USDT on Celo** (`0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e`) for skill-based PvP. Winners receive ~99% of the pool; the protocol takes a 1% fee. Cipher reward campaigns pay **0.1 USDT per win**, creating real stablecoin movement tied to gameplay.

3. **Gas-sponsored smart wallets** — Privy smart wallets with a gas sponsorship path lower friction for casual players who have never sent a transaction before.

4. **Viral social loop** — Game ID invites and Farcaster share prompts (*"I cracked Cipher and earned 0.1 USDT — can you?"*) turn winners into distributors inside the Celo social graph.

5. **On-chain activity from day one** — Cipher games hit `trackGame`; every PvP match is a **3-tx on-chain lifecycle** (create → join → resolve). Verifiable on Celoscan before USDT staking launches.

6. **Retention over hype** — Skill-based logic gameplay (not luck/grinding) gives players a reason to return, graduate from Cipher → PvP → staked matches, and climb the CMC leaderboard.

**Growth target:** ~75 active players today → **500+** through grant-funded Cipher rewards, Farcaster/MiniPay campaigns, and staked PvP launch.

---

## How much TVL do you have today *

**$0 TVL today** (on-chain escrow)

Professional USDT mode is not yet enabled. No USDT is currently locked in escrow. However, **all completed games are on-chain** — Cipher via `trackGame`, PvP via the 3-tx flow (`createChallenge` → `joinChallenge` → `resolveMatch`) — verifiable on Celoscan.

**Supporting evidence:**
- Contract: `0x0317e55136a46557516aa40EA96d66772767C72C` on Celo mainnet
- USDT token: `0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e`
- Live app with 75 registered users and 137 completed games: https://crack-my-code.vercel.app/api/stats

---

## Describe how the project will drive TVL (if applicable)

On-chain TVL comes from **USDT locked in escrow** during Professional (staked) PvP matches — not from Cipher win rewards or leaderboard prizes. Those are **treasury outflows** (USDT leaving a reward wallet to players). They drive transaction volume and user acquisition, which feeds the staked-match funnel, but they do not add to protocol TVL.

**Escrow mechanism (staked PvP):**

Each staked match requires both players to lock USDT on-chain before play begins — **minimum 0.1 USDT per player**. Stakes are pulled into the `GuessMyCode` contract at `createChallenge` / `joinChallenge`. Funds sit in escrow until the backend agent calls `resolveMatch`, which pays the winner ~99% of the pool and routes 1% to the protocol fee accumulator. Higher stakes are allowed; we use **0.5 USDT per player** as a working average for projections (1 USDT total pool per match at that assumption).

All TVL figures use **30-day average USD price**, **net inflows only** — escrowed USDT in the contract during active matches, no double-counting, no idle balances sitting in player EOAs.

**Projected escrow TVL over time:**

At **Professional launch**, we model roughly 20 staked matches per day at 1 USDT per pool (two players × 0.5 USDT average). That implies on the order of **~$20 in average daily escrow TVL** — modest, but real locked stablecoin on Celo.

As we hit the **500-player growth target**, staked volume scales with competitive PvP adoption: ~100 matches per day at the same average pool size points to **~$100 in average daily escrow TVL**.

In a **mature leaderboard season** — repeat competitive players, higher confidence in stakes — we model ~200 staked matches per day at ~2 USDT average pool (higher per-player stakes as players graduate from Cipher rewards). That implies **~$400 in average daily escrow TVL**.

These are conservative, flow-based estimates. Actual TVL at any moment depends on how many matches are mid-game with funds locked; the daily average smooths open matches across the day.

**Cipher rewards — on-contract reward pool (agent-triggered):**

Promotional USDT lives in a **dedicated reward pool** inside `GuessMyCode`, separate from player escrow stakes. Anyone can top it up; only the backend agent can pay players out. This gives verifiable `RewardPaid` events on the contract address (better for grant reporting than opaque EOA transfers) while keeping eligibility logic in the backend.

**Campaign rules (phased):**

**Phase 1 — Cipher acquisition (Milestone 1, live from grant start):** Each wallet may play **up to 5 Cipher games per day**. Each **win** earns **0.1 USDT** via `rewardCipherWin(player)` after backend verification (max **0.5 USDT/day** per wallet). Goal: grow to **500+ active registered players**.

**Phase 2 — Weekly retention (Milestone 3, activates only after 500 players):** Every **Monday**, backend audits the prior week and the agent pays **top 3 on the CMC leaderboard** and **most games played** via `rewardWeekly`. This layer is **not** turned on during the Cipher growth push — it rewards habit and competition once the base community exists.

**Planned contract surface (UUPS upgrade):** Public `depositToRewardPool` (anyone funds the pool). Agent-only `rewardCipherWin` and `rewardWeekly` after backend verification. Owner-configurable amounts via `setCipherWinReward`, `setWeeklyPrizes`, and existing `setTreasuryFeeBps`. Escrow unchanged: `createChallenge`, `joinChallenge`, `resolveMatch`.

**Accounting separation (important):** escrowed match stakes and `accumulatedFees` are **not** mixed with `rewardPoolBalance`. Escrow TVL = USDT locked in active staked matches. Reward pool = pre-funded USDT waiting to be distributed — a treasury line item, not player TVL.

Grant USDT is deposited via public `depositToRewardPool` — transparent on Celoscan.

---

## Milestones

*Grant structure: 20% upfront, 80% on milestone completion. Each milestone uses the four required headings.*

**Funnel:** Milestone 1 acquires players (Cipher USDT rewards → 500 wallets). Milestone 2 monetizes engagement (staked PvP escrow). Milestone 3 retains the community (weekly leaderboard + activity prizes) and **only activates after Milestone 1 is complete**.

---

### Milestone 1 — Cipher rewards: grow to 500 players (acquisition)

**Description of target**

Ship the on-contract reward pool and launch **Cipher-only USDT rewards** to drive acquisition. Each wallet gets **up to 5 Cipher games per day**; every **win** pays **0.1 USDT** (max 0.5 USDT/day) via agent-called `rewardCipherWin` after backend verification. Fund the pool through public `depositToRewardPool` (grant USDT deposits go here).

Pair every paid win with a Farcaster share prompt (*"I cracked Cipher and earned 0.1 USDT — can you?"*). Push discovery through Game ID invites, casts, X, Farcaster, and MiniPay. **Success criterion: 500+ registered wallet players** (from ~75 today). Weekly leaderboard prizes are **not** active in this milestone — they unlock in Milestone 3 once this target is met.

**TVL increase objective in cUSD**

$0 — acquisition milestone. No escrow TVL until staked PvP launches in Milestone 2.

**Tx increase objective in cUSD**

Scale toward **300+ daily on-chain txs** (14-day moving average) as Cipher volume grows — each win adds `trackGame` + `rewardCipherWin`, plus ongoing PvP lifecycle txs. Reward pool deposits count as additional contract txs.

**Contract address, or other verifiable proof**

- Live app: https://crack-my-code.vercel.app
- Player growth + 14-day tx average: https://crack-my-code.vercel.app/api/stats?scope=all
- Farcaster manifest: https://crack-my-code.vercel.app/.well-known/farcaster.json
- `GuessMyCode` (Celo mainnet): `0x0317e55136a46557516aa40EA96d66772767C72C` — `CipherRewardPaid` / `GameTracked` events on Celoscan

---

### Milestone 2 — Raise the stakes (Professional USDT PvP)

**Description of target**

Enable **Professional mode** while Cipher rewards continue: two players lock USDT on-chain before a PvP match; winner takes ~99% of the pool. Turn on `PROFESSIONAL_MODE_ENABLED`, complete gas-sponsored wallet flows, and validate end-to-end staking (approve → escrow → resolve → payout). Target **50+ staked matches per week** within 60 days of enabling Professional mode. This converts Cipher-trained players into real escrow TVL on Celo.

**TVL increase objective in cUSD**

**$500+ average daily escrow TVL** within 90 days of Professional launch (based on 50–100 staked matches/day at ~0.5–1 USDT per player).

**Tx increase objective in cUSD**

**1,000+ daily on-chain txs** (14-day moving average) — **3 txs per PvP match** plus USDT approve/escrow on staked games, ongoing Cipher `trackGame` + `rewardCipherWin`, and pool deposits.

**Contract address, or other verifiable proof**

- `GuessMyCode` proxy (Celo mainnet): `0x0317e55136a46557516aa40EA96d66772767C72C`
- USDT (Celo): `0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e`
- Celoscan: https://celoscan.io/address/0x0317e55136a46557516aa40EA96d66772767C72C

---

### Milestone 3 — Weekly prizes: retention (activates at 500+ players)

**Description of target**

**Gate:** This milestone activates **only after Milestone 1 is complete** (500+ registered players verified via `/api/stats`). Cipher rewards continue; we add the **retention layer** on top.

Every **Monday**, backend audits the prior week and the agent pays on-chain via `rewardWeekly`: **top 3 on the CMC leaderboard**, plus the **most games played** that week across Cipher and PvP.

Spotlight winners in-app and on Farcaster. The weekly cycle gives established players a reason to return beyond the daily Cipher cap — fighting for rank and activity, not just beating the AI once. Target **30% week-over-week retention** among the top 100 leaderboard players within 60 days of activation.

**TVL increase objective in cUSD**

Maintain **$500–1,000+ average daily escrow TVL** from ongoing staked PvP (carried from Milestone 2). Weekly prize payouts come from the reward pool — outflows, not escrow TVL.

**Tx increase objective in cUSD**

**2,500+ daily on-chain txs** (14-day moving average), progressing toward **Stage 1 (>5,000 daily)** as Cipher rewards, weekly `rewardWeekly` batches, and staked PvP compound.

**Contract address, or other verifiable proof**

- 500+ player gate: https://crack-my-code.vercel.app/api/stats?scope=all (`totalUsers`)
- Leaderboard: https://crack-my-code.vercel.app/api/leaderboard
- Weekly payouts: `WeeklyRewardPaid` events on `0x0317e55136a46557516aa40EA96d66772767C72C`
- Farcaster winner announcements (FID 1077932)

---

## Have you conducted a landscape review of competitors, the actual demand for this product and likely uptake.

Please explain your findings here, supported with data.

**Competitive landscape**

Against **Wordle clones and daily puzzles** (Wordle, various Farcaster word games), we offer **real-time PvP duels** — not a once-a-day solo puzzle.

Against **on-chain casinos and luck games** (prediction markets, coin-flip dApps), we are **skill-based logic**: players outthink opponents; outcomes are not RNG-driven.

Against **other Web3 mini-games on Farcaster**, few combine an **instant AI opponent, invite-only PvP, and USDT stakes** in one Celo-native flow.

Against **classic Mastermind** (board game, offline apps), we add **on-chain stakes, social invites, and Farcaster/MiniPay distribution**.

**Demand signals (our data)**

We have **75 registered wallet users** and **137 completed games** (each recorded on-chain) with minimal paid marketing — organic interest from Farcaster and word-of-mouth. The split is **113 Cipher AI games vs 24 PvP**, which shows a strong solo funnel; PvP and staking are the conversion layers we are building toward. Our **Farcaster Mini App manifest is verified** — the distribution channel is live. The growth bottleneck is incentives and awareness, not product readiness.

**Likely uptake**

**Cipher rewards (0.1 USDT/win)** lower the barrier to a first on-chain payout and create shareable moments. **Game ID invites** already work today — private challenges spread naturally inside friend groups and Farcaster casts. **MiniPay** fits our mobile-first, stablecoin-reward design for emerging-market users on Celo.

**Risk:** casual gamers may not convert to staked PvP. We mitigate with a graduated funnel: Cipher → free PvP → 0.1 USDT minimum stake → higher stakes.

---

## Briefly describe your revenue projections.

If these plans include transaction fees please let us know what percentage you plan to take and why.

**Primary revenue: protocol fee on staked USDT matches**

We take a **1% treasury fee** (`treasuryFeeBps = 100`) on each staked match pool at `resolveMatch`. That is low enough that winners still receive ~99% (competitive with informal betting) and high enough to sustain operations, gas sponsorship, and leaderboard prizes at scale.

**Conservative example (6 months post-Professional launch):** ~3,000 staked matches per month at an average pool of 1 USDT (two players × 0.5 USDT) → ~3,000 USDT monthly volume → **~30 USDT/month** in protocol fees at 1%.

**Growth example (12 months post-Professional launch):** ~15,000 staked matches per month at an average pool of 2 USDT → ~30,000 USDT monthly volume → **~300 USDT/month** in protocol fees at 1%.

**Costs (not revenue)**

Cipher reward campaign (0.1 USDT × rewarded wins, grant-funded initially), weekly leaderboard prizes after 500 players (Milestone 3), and gas sponsorship for smart-wallet users (subsidized early; fee revenue covers at scale).

We do **not** plan to charge fees on free Cipher or Friendly PvP modes — those are acquisition channels.

---

## Tell us a bit about your team's experience to deliver for Celo. *

Where are you all based, what previous work can you share that's relevant to help us understand your skills.

<!-- TODO: Jeff — personalize this section with your location, prior projects, and links -->

**Lead:** Jeff Muchiri

**What we've already shipped on Celo for this project:**

- Full-stack **Next.js 14** app with **Prisma + PostgreSQL** backend, **Pusher** realtime PvP, and production deployment on Vercel
- **Cipher AI** — custom entropy/minimax solver (`apps/web/src/lib/cipher.ts`), documented and live
- **GuessMyCode** UUPS smart contract on **Celo mainnet** — PvP: `createChallenge` / `joinChallenge` / `resolveMatch`; Cipher: `trackGame`; IPFS match history on resolve
- **Privy** smart wallet integration with USDT balance UI and gas sponsorship path
- **Farcaster Mini App** — verified manifest, embed sharing, webhook integration
- **MiniPay-compatible** mobile web experience

**Relevant skills:** Solidity smart contract development, React/Next.js, realtime multiplayer systems, Farcaster mini app ecosystem, stablecoin (USDT) payment flows on Celo.

**Location:** [Your city/country — e.g. Kenya / Nairobi]

**Previous work / links:**
- Crack My Code (live): https://crack-my-code.vercel.app
- GitHub: [your repo or profile URL]
- Farcaster: [your handle]
- Other relevant projects: [add links]

---

## Additional information you consider relevant

- **Product is built; grant funds distribution, not core development.** The game loop, AI, PvP, contract, on-chain game recording, and wallet layer are production-ready. Grant funding accelerates user acquisition (Cipher USDT rewards), staked PvP launch (Professional mode), and retention (leaderboard prizes).
- **Farcaster FID:** 1077932 (verified domain association for `crack-my-code.vercel.app`).
- **Tech reference:** See `PROJECT.md` in this repository for full architecture, milestone plans, and status snapshot.
- **Support:** In-app Telegram support channel for player issues and transaction help.

---

## Grant delivery

| Field | Value |
|-------|-------|
| Grant Policies understanding: Do you agree to the policies? | **Yes** |
| Name of lead applicant (for KYC) | **Jeff Muchiri** |

---

*Draft generated from PROJECT.md and live app stats — June 2026. Review and personalize the Team Experience section before submitting.*
