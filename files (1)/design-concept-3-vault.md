# Design Concept 3: VAULT
### Aesthetic: Premium Dark / Financial Intelligence

---

## Visual Identity

**Theme:** A high-end financial app crossed with a luxury puzzle game — the kind of interface that makes you feel like you're cracking a Swiss bank vault.  
**Mood:** Calm, intelligent, prestigious. Solving feels like solving something *important*.  
**Memorable hook:** Deep navy, real gold accents, and a number grid that feels like a security keypad. Clean, confident, and impossible to ignore.

---

## Color Palette

| Role | Color | Hex |
|---|---|---|
| Background | Deep navy | `#0B1221` |
| Surface | Midnight blue | `#0F1B2E` |
| Card surface | Dark slate | `#152236` |
| Primary accent | Warm gold | `#D4A843` |
| Secondary accent | Ice blue | `#4A9EFF` |
| Success (correct) | Emerald | `#22C55E` |
| Wrong position | Amber | `#F59E0B` |
| Not in code | Slate | `#334155` |
| Text primary | Pale silver | `#E2E8F0` |
| Text secondary | Steel blue | `#94A3B8` |

---

## Typography

- **Display / Logo:** `Cormorant Garamond` — high-contrast serif, elegant. "Crack My Code" feels like a luxury brand name.
- **Numbers / Grid:** `Courier Prime` — classic monospace, feels like classified documents and safety deposit boxes.
- **UI elements:** `Outfit` — clean geometric sans for nav labels, button text, and stats.
- **Leaderboard ranks:** `Barlow Condensed` — condensed, reads well for number-heavy rows.

---

## Layout & Components

### Home Screen
- **Deep navy background** with a subtle radial gradient (`#0F2040` center to `#070D1A` edges)
- Very faint **hexagonal grid pattern** as texture (SVG, `opacity: 0.04`) — suggests a vault door or security pattern
- Logo "Crack My Code" in `Cormorant Garamond` italic, 42px, with gold `#D4A843` accent on "Crack"
- Balance display: side-by-side chips with thin gold borders and monospace numbers — reads like a financial instrument dashboard
- Cipher AI bot: redesigned as a **3D-style geometric robot** head, rendered in CSS with layered divs — dark blue with glowing teal eyes
- Speech bubble: minimal card with rounded corners, thin ice-blue border, no hard outlines

### Game Buttons
```
┌──────────────────────────────────┐
│  ✦  PLAY AGAINST CIPHER AI  ✦   │   ← Gold gradient top border, dark fill
│     COMPUTER MATCH               │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  ⬡  PLAY AGAINST OPPONENT  ⬡   │   ← Ice blue gradient top border, dark fill
│     HUMAN OPPONENT               │
└──────────────────────────────────┘
```
Buttons have `border-top: 2px solid` with a linear-gradient from transparent → accent → transparent. Background: `rgba(255,255,255,0.04)`. On hover: subtle shimmer sweep animation (`@keyframes shimmer` with a white diagonal highlight that slides across).

### Number Grid (Gameplay)
- Cells: dark card look (`#152236`), subtle inner shadow, thin border `rgba(255,255,255,0.08)`
- Generous spacing between cells (`gap: 10px`) — spacious, premium feel
- Correct position: **Emerald green** fill `#22C55E` + white text + glow `box-shadow: 0 0 12px rgba(34,197,94,0.5)`
- Wrong position: **Amber** fill `#F59E0B` + dark text + soft amber glow
- Not in code: stays dark, border fades to near-invisible, number greys out
- **Reveal animation:** cells lift slightly with `translateY(-3px)` + opacity fade-in, staggered 80ms per cell

### Leaderboard
- Cards per player: subtle `background: rgba(255,255,255,0.03)` with `border: 1px solid rgba(255,255,255,0.06)`
- Rank 1: gold left border stripe `4px solid #D4A843` + gold rank number
- Rank 2–3: silver/bronze treatment
- Player row: `background: rgba(74,158,255,0.08)` with ice-blue left border
- Numbers in Courier Prime, names in Outfit, scores in Barlow Condensed
- Small sparkline bar showing win rate per player

### Bottom Navigation
- Dark frosted bar: `background: rgba(11,18,33,0.9)` + `backdrop-filter: blur(20px)`
- Gold active indicator dot beneath active icon
- Active icon: gold `#D4A843`, inactive: `#475569`
- Top separator: `1px solid rgba(255,255,255,0.06)`

---

## Key Animations

1. **Shimmer sweep on buttons** — a white diagonal highlight moves left-to-right across button on hover (CSS `@keyframes`)
2. **Cell reveal lift** — cells appear to float up as results come in, staggered 80ms delay each
3. **Background pulse** — very slow radial breathing animation (`opacity: 0.5 → 0.8`), 8s loop, barely perceptible
4. **Win screen** — gold confetti made of `✦` and `◆` characters fall across screen
5. **Score number roll** — leaderboard scores count up with spring easing on page load
6. **Cipher's eye glow** — robot eyes pulse from teal to bright white on a slow 3s loop

---

## Why This Works

- **Prestige positioning** makes the game feel worth engaging with — not just a casual time-killer
- Navy + gold is a timeless luxury color pairing that photographs well and ages well
- The serif logo is distinct from every other mobile game using sans-serif display fonts
- Frosted bottom nav feels native to modern iOS/Android design conventions (familiar UX)
- The hex grid texture subtly reinforces the "cracking a vault/cipher" metaphor

---

## Implementation Notes

- Frosted nav bar: `backdrop-filter: blur(20px)` + `background: rgba(11,18,33,0.85)` (iOS Safari needs `-webkit-backdrop-filter`)
- Hex SVG pattern: create with `<polygon points="..."/>` in SVG `<pattern>` element
- Radial background: `background: radial-gradient(ellipse at 50% 30%, #0F2040 0%, #070D1A 100%)`
- Button shimmer: `@keyframes shimmer { from { left: -100% } to { left: 200% } }` with a `::after` pseudo-element
- Google Fonts: `Cormorant Garamond`, `Courier Prime`, `Outfit`, `Barlow Condensed`
- Cell glow effect: `box-shadow: 0 0 0 1px rgba(34,197,94,0.3), 0 0 20px rgba(34,197,94,0.2)`
- All gold uses `#D4A843` — avoid pure `#FFD700` which looks cheap on dark backgrounds
