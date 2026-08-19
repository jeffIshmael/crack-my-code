# MiniPay Stage 1 Intake Readiness Report (Crack My Code)

## 1) Project snapshot

**Name:** Crack My Code  
**Tagline:** A competitive 4-digit code-cracking duel built on **Celo** (play in browser, MiniPay, and Farcaster Mini App).  
**Core mechanic:** Two players each set a secret 4-digit code (0–9, repeats allowed). Players take turns guessing; feedback is **Wordle-style**:
* **Green** = correct digit, correct position  
* **Yellow** = digit exists, wrong position  
* **Gray** = digit not in code (duplicates handled consistently)
**Win condition:** First to crack the opponent’s code wins (up to **8 guesses per side**).

## 2) How the product works (1-session description)

1. **Start a match**
   * **Cipher AI**: immediate match vs an entropy-based solver (no wallet friction required for gameplay).
   * **Friendly PvP**: public matchmaking or **invite-only** challenges using a shareable **Game ID**.
2. **Set / lock your secret code**
3. **Take turns guessing**
4. **Receive colored clues** and converge on the opponent’s digits
5. **Win + update CMC points** (for signed-in/registered users)

This design is intentionally built for short sessions: Cipher is playable quickly, while wallet connection is used mainly for points and (future) on-chain modes.

## 3) MiniPay hosting + auto-connect readiness

### MiniPay detection
The web app detects MiniPay vs Farcaster vs plain web via:
* `apps/web/src/components/mini-app-environment-provider.tsx`
* `apps/web/src/lib/mini-app-environment.ts`

MiniPay detection supports **instant synchronous detection** (avoids extra waiting where possible).

### Wallet behavior in MiniPay
The wallet layer attempts to connect automatically when hosted in MiniPay:
* `apps/web/src/components/wallet-provider.tsx`

This supports a “tap to play” UX expected for MiniPay, rather than a hard manual wallet gate.

## 4) UX + compliance checks (Stage 1 evidence)

### 4.1 Banned UI terms scan (source-level)
I scanned `apps/web/src` for MiniPay-banned terms commonly rejected during readiness checks:
* `Gas` / `Gas fee`
* `Crypto` / `Crypto token`
* `Onramp` / `Offramp`

Result: **no matches found** for those strings in the scanned `apps/web/src` code.

### 4.2 Stablecoin-first approach
Gameplay is designed to be immediately playable (especially Cipher AI). Wallet connection is used for points / balances, and the app already references **USDT**/**USDC** flows in:
* `apps/web/src/components/connect-button.tsx`
* `apps/web/src/components/SettingsPanel.tsx`

### 4.3 Balance UI scope in-app (Settings is USDT-only)
You asked whether the CELO/cUSD balance UI (`apps/web/src/components/user-balance.tsx`) is used inside the in-app **Settings** section.

**Verified:** Settings renders `SettingsPanel` and passes `usdtFormatted` into it:
* `apps/web/src/app/page.tsx`
* `apps/web/src/components/SettingsPanel.tsx`

`SettingsPanel` uses `UsdtWalletModals` (USDT send/withdraw UX), so the Settings experience should already be **USDT**-focused:
* `apps/web/src/components/UsdtWalletModals.tsx`

So for Stage 1, the key point is that **Settings** should not show CELO/cUSD balance UI.

### 4.4 On-chain transactions: what happens in each mode (and who signs)
MiniPay reviewers often ask what blockchain transactions occur and whether the **player must sign**.

Below is the on-chain transaction behavior by mode (what a user typically experiences):

#### A) Cipher AI mode
- **1 transaction total** after the game finishes: `trackGameOnChain(...)`
- The on-chain write is submitted by the **backend AI** to “seal”/track the finished game.
- The player does **not** go through a multi-step “sign contract txs” flow during normal AI gameplay.

#### B) Friendly PvP mode (peer-to-peer)
- **3 transactions total** for a full on-chain match lifecycle:
  1. Opener creates the challenge on-chain to get the **Game ID** (`createChallenge`)
  2. Joiner joins the challenge on-chain (`joinChallenge`)
  3. After the match ends, the winner is registered / match is resolved on-chain (`resolveMatch`)
- **Optional 4th transaction**: if a player quits, a quit event can be recorded (`recordQuit`)

#### C) Professional USDT mode (coming soon / feature-gated)
- This mode is designed for real USDT-staked matches, so it is expected to include the same lifecycle pattern as PvP, plus the USDT allowance step required for staking.

- **Expected user-visible flow (USDT staking):**
  - Opener: **approve USDT** → **createChallenge** (staking/transfer is pulled from their allowance)
  - Joiner: **approve USDT** (if allowance is not already set) → **joinChallenge**
  - After the match ends: the match is **resolved on-chain**; optional **quit** can be recorded

- **Transaction counts:**
  - In a typical “first time” scenario, approvals add extra on-chain txs:
    - Opener signs **2 txs** (approve + createChallenge)
    - Joiner signs **2 txs** (approve + joinChallenge)
  - The final **resolve** (and optional **quit**) are backend-triggered, so additional player signing is not expected.

## 5) Technical readiness (what exists in-repo)

### App shell + providers
* `apps/web/src/app/layout.tsx`
  * wraps `WalletProvider` + `FarcasterProvider` + `FarcasterMiniAppProvider`
  * includes responsive mobile shell (`max-w-[440px]`)

### Main game UI (single-page app behavior)
* `apps/web/src/app/page.tsx`
  * controls the game state machine (lobby → set code → play → result)
  * triggers gameplay actions via Next.js API routes

### Backend endpoints (Next.js route handlers)
* `apps/web/src/app/api/**/route.ts`
  * `/api/games/*`: matchmaking/join/submit guess/sync/etc
  * `/api/users/*`: stats and points updates
  * `/api/leaderboard`: leaderboard reads
  * `/api/pusher/auth`: realtime auth

### Persistence + realtime
* Persistence: `apps/web/prisma/schema.prisma` (User/Game/Guess)
* Realtime: `apps/web/src/lib/pusher-server.ts` and Pusher channels

### On-chain integration (for future/pro modes and rewards)
* Smart contract:
  * `apps/contracts/contracts/GuessMyCode.sol`
* Backend agent wallet + calls:
  * `apps/web/blockchain/AgentFunctions.ts`

For Stage 1, reviewers mostly care that the MiniPay experience is stable, compliant, and fast. On-chain calls are part of the broader product roadmap.

## 6) MiniPay-specific value proposition

Why MiniPay reviewers should shortlist this:
* **Short-session gameplay** (code puzzle loop)
* **Mobile-first** UI constraints already embedded in the layout
* **No-crypto UX** intent: Cipher AI is playable immediately; wallet connection is for earning/points and later on-chain modes
* **MiniPay-ready host detection + auto-connect**
* **Clear distribution hooks** (Farcaster mini app integration exists; game embeds + invite Game IDs are described in product docs)

## 7) Assets and links for the intake form

### Live demo
* Live app: https://crack-my-code.vercel.app

### Repo docs references (for the reviewer)
* `README.md` (game rules + modes)
* `PROJECT.md` (problem/solution + milestones + tech stack)

### Screenshots / video (placeholders)
Add the following to your Stage 1 form (replace with your actual assets):
* Screenshot A: home / play options (PNG/JPG)
* Screenshot B: active match (PIN input + clue grid)
* Screenshot C: results + points/leaderboard
* Short video (30–60s) showing:
  * starting a match in MiniPay
  * set code
  * 2–3 guess cycles
  * win condition / feedback

## 8) “Before first call” checklist (what we want the checker to validate)

1. **Confirm Stage 1 compliance on UI wording** (Gas/Crypto/etc already appears clean in code scan).
2. Confirm whether any non-Settings views render `apps/web/src/components/user-balance.tsx` (CELO/cUSD)
   * If yes: we’ll gate/hide that UI before Stage 2 review.
3. Confirm:
   * MiniPay detection works reliably on real MiniPay hosts
   * Auto-connect UX doesn’t break the first-play flow
4. Confirm readiness of ToS/Privacy pages (we already expose them via Settings):
   * `apps/web/src/components/SettingsPanel.tsx`
5. Confirm reviewer understanding of transaction/signing expectations:
   * AI tracking on-chain is backend-driven (no user tx sequence expected)
   * Full contract lifecycle (create/join/resolve) applies to paid/pro when enabled

## 9) Summary for copy/paste (for the intake form)

Crack My Code is a mobile-first competitive code-cracking duel on Celo. Players set a secret 4-digit code and take turns guessing with Wordle-style clue feedback (green/yellow/gray). The app supports Cipher AI for instant matches and invite-only friendly PvP via Game ID. MiniPay readiness includes MiniPay host detection and auto-connect wallet behavior for a low-friction “tap to play” UX. Banned MiniPay terms were not found in the app source.

Additionally, the in-app **Settings** section uses `SettingsPanel` + `UsdtWalletModals` and should show the **USDT**-formatted balance (it does not render `user-balance.tsx`’s CELO/cUSD UI).

On-chain transactions are mode-dependent: Cipher AI primarily uses backend agent calls for on-chain tracking, while full create/join/resolve contract flows apply to the paid/pro lifecycle when enabled.

