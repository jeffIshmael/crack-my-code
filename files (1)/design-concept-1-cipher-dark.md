# Design Concept 1: CIPHER DARK
### Aesthetic: Cyberpunk / Hacker Terminal

---

## Visual Identity

**Theme:** Dark neon terminal — like cracking classified government codes in a bunker at 3am.  
**Mood:** Tense, sleek, high-stakes. Every interaction feels like a mission.  
**Memorable hook:** Glowing green digits scroll across a pitch-black screen. The UI looks like it was built by a hacker, not a designer — and that's intentional.

---

## Color Palette

| Role | Color | Hex |
|---|---|---|
| Background | Deep black | `#0A0A0F` |
| Surface | Dark charcoal | `#111118` |
| Primary accent | Electric green | `#00FF88` |
| Secondary accent | Cyan blue | `#00D4FF` |
| Warning / wrong | Crimson red | `#FF2244` |
| Text primary | Off-white | `#E8E8EE` |
| Text muted | Steel grey | `#555566` |

---

## Typography

- **Display / Logo:** `VT323` (Google Fonts) — retro pixelated terminal font. Used for "CRACK MY CODE" title and large digit displays.
- **UI Labels:** `Share Tech Mono` — clean monospaced, techy feel for buttons and nav.
- **Body / Scores:** `IBM Plex Mono` — readable monospace for leaderboard numbers and game state.

---

## Layout & Components

### Home Screen
- Full-bleed black background with a **scanline overlay** (CSS repeating gradient) for CRT monitor effect
- Floating digit rain in background (CSS animation, low opacity `#00FF88` digits falling slowly)
- Logo "CRACK MY CODE" in VT323 at 52px with green glow (`text-shadow: 0 0 20px #00FF88`)
- CMC and USDT balances displayed as terminal readouts with blinking cursor `_`
- Cipher AI bot replaced with a minimal **ASCII-art robot** (text-based, fits the terminal aesthetic)
- Speech bubble styled as a `> terminal prompt` box with typing animation

### Game Buttons
```
┌─────────────────────────────┐
│  [ PLAY vs CIPHER AI      ] │   ← Green border glow on hover
│    COMPUTER MATCH           │
└─────────────────────────────┘

┌─────────────────────────────┐
│  [ PLAY vs OPPONENT       ] │   ← Cyan border glow on hover
│    HUMAN OPPONENT           │
└─────────────────────────────┘
```
Buttons have a `border: 1px solid #00FF88` with `box-shadow: inset 0 0 15px rgba(0,255,136,0.1)`. On hover/tap: border pulses brighter, background flashes to `rgba(0,255,136,0.05)`.

### Number Grid (Gameplay)
- Each cell: dark rounded square `#16161E` with `border: 1px solid #222233`
- Correct position: cell fills with `#00FF88` + black text + glow pulse animation
- Wrong position: `#00D4FF` fill (cyan)
- Not in code: cell dims further `#0D0D14`, text turns `#333344`
- Shake animation on wrong guess (CSS `@keyframes shake`)

### Leaderboard
- Full dark card with monospace rank numbers
- Top 3 highlighted with gold/silver/bronze using glowing text colors
- Scrollable list, each row separated by `border-bottom: 1px solid #1A1A2E`
- Player's own row highlighted with subtle green background `rgba(0,255,136,0.08)`

### Bottom Navigation
- Dark bar with icon + label
- Active tab: icon and text in `#00FF88` with underline dot glow
- Inactive: `#444455`

---

## Key Animations

1. **Background digit rain** — slow falling numbers in background, `opacity: 0.04`
2. **Scanline overlay** — CSS `repeating-linear-gradient` with 2px gaps, `opacity: 0.03`
3. **Correct cell pulse** — `@keyframes glow-pulse` scales and intensifies glow for 0.6s
4. **Terminal typewriter** — Cipher's speech types in letter by letter on load
5. **Button hover glow** — `transition: box-shadow 0.2s ease` on all interactive elements
6. **Shake on wrong guess** — fast horizontal shake, 300ms

---

## Why This Works

- Creates an **immersive, thematic experience** that matches the "code cracking" concept
- Monospace typography makes the number grid feel natural and intentional
- Dark background makes the coloured feedback (green/cyan/red) pop dramatically
- Terminal aesthetic is familiar to the target audience (gamers, puzzle fans)
- Every visual element reinforces the narrative: *you are a hacker cracking a cipher*

---

## Implementation Notes

- All animations can be pure CSS (no heavy JS libraries needed)
- Works excellent on mobile: dark themes save battery on OLED screens
- Font imports from Google Fonts: `VT323`, `Share Tech Mono`, `IBM Plex Mono`
- CRT scanline: `background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)`
