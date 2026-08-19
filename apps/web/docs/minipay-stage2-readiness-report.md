# MiniPay Stage 2 Readiness Checklist — Crack My Code

## Evidence (provided / captured)

### Smart contract (CeloScan)
- **Contract (proxy):** `0x0317e55136a46557516aa40EA96d66772767C72C`
- Celoscan address: https://celoscan.io/address/0x0317e55136a46557516aa40EA96d66772767C72C

### Sample user-facing transactions (CeloScan)
- **createChallenge** (user stakes + opens match): https://celoscan.io/tx/0xcbc5616033bcf04065f9665f24dfa631c03e620cd8d634f75b1fc1c0ec9c6721
- **resolveMatch** (winner settled / payouts): https://celoscan.io/tx/0x758fdd2400e65d3672a82469425f76e8edacec1cbca6654829a2d8c5ad137858

### Network manifest + PageSpeed capture
- `apps/web/public/network-manifest.json`
- Mobile PageSpeed capture in manifest:
  - **mobile_performance:** `56`
  - **captured_at:** `2026-08-19`
  - PSI report URL:
    https://pagespeed.web.dev/analysis/https-www-crackmycode-fun/8s8ef3bu9k?form_factor=mobile

## MiniPay Stage 2 (Post-call) Checklist

Copy/paste the checklist below into your internal review / submission notes. Marks reflect what’s implemented/captured in-repo right now; items marked **⚠️** may still need a final human/mobile verification.

### 1) Seamless user experience
- [ ] Zero-click connect (no “Connect Wallet” button inside MiniPay when `window.ethereum.isMiniPay === true`)
- [ ] No `personal_sign` / `eth_signTypedData` anywhere in the app
- [ ] No raw `0x…` addresses shown as the **primary** user identifier (leaderboard uses names/aliases; account shows username + address as a secondary value)

### 2) Currency & stablecoin logic
- [ ] Only USDT / USDC / USDm — no CELO displayed in balances/selectors/copy
- [ ] Dynamic adaptation to user’s preferred stablecoin (if only one stablecoin is supported, show a clear single-token UX explainer)

### 3) User-facing copy (strict)
- [ ] UI copy uses **Network fee**, **Deposit**, **Withdraw**, **Stablecoin** (not gas / onramp / offramp / crypto)

### 4) Technical performance & optimization
- [ ] Tested at **360 × 640** mobile resolution
- [ ] Images are SVG or WebP (avoid PNG/JPG for anything larger than a few KB)
- [ ] PageSpeed Insights score captured for production URL (target: **90+ on mobile**)
  - ⚠️ Current manifest value is `56` mobile performance
- [ ] URL / subdomain / origin manifest prepared (see `apps/web/public/network-manifest.json`)

### 5) Smart contract standards
- [ ] All contracts verified on Celoscan
- [ ] Sample transaction hashes collected for every user-facing method
  - ⚠️ Only sample txs provided here for `createChallenge` and `resolveMatch`

### 6) Integration & support
- [ ] Redirect to MiniPay “Deposit / Add Cash” deeplink on insufficient balance (instead of showing a hard error)
- [ ] In-app support link reachable inside the Mini App (Telegram/WhatsApp/etc.)
  - ✅ Settings includes Telegram Support link
- [ ] Dedicated support + 24h SLA commitment for critical fixes

### 7) Branding & legal
- [ ] App name + logo visible and clearly distinct from MiniPay branding
- [ ] Terms of Service + Privacy Policy links accessible in-app

### 8) Analytics & operational visibility
- [ ] Stats / analytics page published (DAU/MAU/retention + on-chain metrics expectations)
  - ⚠️ App has a `Stats` screen, but this repo may not yet expose full DAU/MAU/retention + detailed on-chain breakdown

---

## Action Required (most likely)
- [ ] Bring **mobile PageSpeed** up from `56` to the **90+** target for MiniPay listing.
- [ ] Provide **sample tx links for every user-facing contract method** your MiniPay reviewer can trigger.
- [ ] Final manual verification on a real MiniPay mobile host for:
  - zero-click connect behavior
  - “no connect wallet button” compliance
  - “no raw 0x primary identifier” rule
- [ ] Confirm Stats/analytics page matches MiniPay’s metrics expectations (DAU/MAU/retention + on-chain metrics).

