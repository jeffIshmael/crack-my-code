# Design Concept 2: NEON ARCADE
### Aesthetic: Retro Arcade / Bold Editorial

---

## Visual Identity

**Theme:** 80s arcade cabinet meets modern app design — bold, loud, and fun.  
**Mood:** Energetic, competitive, celebratory. Winning feels like getting a high score.  
**Memorable hook:** Chunky black outlines, electric yellow and hot pink, and a grid that feels like a physical game board you could reach into the screen and touch.

---

## Color Palette

| Role | Color | Hex |
|---|---|---|
| Background | Warm cream | `#FFF8EC` |
| Surface cards | Pure white | `#FFFFFF` |
| Primary accent | Electric yellow | `#FFE600` |
| Secondary accent | Hot pink | `#FF3E8A` |
| Tertiary | Electric blue | `#0033FF` |
| Success (correct) | Vivid green | `#00C853` |
| Outline / text | Near black | `#111111` |
| Muted text | Medium grey | `#666666` |

---

## Typography

- **Display / Title:** `Bebas Neue` — ultra-condensed, all-caps. "CRACK MY CODE" stacked large, fills the full width of the mobile screen.
- **UI Buttons:** `Archivo Black` — heavy weight, punchy. Button text feels physical, like a physical arcade button label.
- **Numbers / Score:** `Space Mono` — tabular digits for the game grid and leaderboard, keeps columns aligned.
- **Body / Small text:** `DM Sans` — clean modern sans for descriptions and helper text.

---

## Layout & Components

### Home Screen
- **Cream background** with a bold repeating dot-grid pattern (SVG background, `opacity: 0.15`)
- Title "CRACK MY CODE" in Bebas Neue at **80px**, stacked 2 lines, with a **thick black outline** (`-webkit-text-stroke: 3px #111`)
- Yellow rectangle behind the title as a highlight block (offset, slightly rotated `-1deg`)
- Balance pills styled as **arcade tokens**: circular badges with thick black borders
- Cipher AI bot: illustrated with flat vector style, thick outlines, hot pink highlight accents
- Speech bubble: comic-book style with jagged border and heavy black outline

### Game Buttons
```
╔══════════════════════════════╗
║  PLAY VS CIPHER AI           ║   ← Yellow fill, black outline, black shadow offset
║  COMPUTER MATCH              ║
╚══════════════════════════════╝

╔══════════════════════════════╗
║  PLAY VS OPPONENT            ║   ← Hot pink fill, same treatment
║  HUMAN OPPONENT              ║
╚══════════════════════════════╝
```
**Signature style:** Buttons have a hard `box-shadow: 4px 4px 0px #111` (no blur, sharp offset). On press/tap, shadow shrinks to `1px 1px 0px #111` and button shifts `3px 3px` — feels like physically pressing an arcade button.

### Number Grid (Gameplay)
- Thick black border on each cell (`border: 3px solid #111`)
- Cells are large, square, with slight rounded corners (`border-radius: 8px`)
- Correct position: **Yellow fill** `#FFE600` + black text + hard shadow
- Wrong position: **Blue fill** `#0033FF` + white text
- Not in code: **Grey fill** `#CCCCCC` + dark text, border dims
- **Flip animation** on reveal: 3D card flip (CSS `rotateX`) like Wordle, but snappier (0.3s vs 0.6s)

### Leaderboard
- **Podium view** for top 3: three raised platforms, different heights, yellow for 1st
- Table rows below: alternating cream/white striping
- Rank number in huge `Bebas Neue` font, faded, positioned behind the row as decorative element
- Your row: highlighted with yellow left border `border-left: 4px solid #FFE600`

### Bottom Navigation
- Pure white bar with thick top border `border-top: 3px solid #111`
- Active tab: yellow dot indicator + icon in hot pink
- Inactive: grey icons
- Nav labels in Archivo Black, small caps

---

## Key Animations

1. **Button press** — physical press `transform: translate(3px, 3px)` + shadow shrink on `:active`
2. **Cell flip reveal** — `rotateX(180deg)` 3D flip as each digit is revealed in sequence
3. **Win explosion** — confetti burst from center of grid (JS canvas, ~50 colored squares)
4. **Score counter** — leaderboard numbers count up from 0 to final value on page load
5. **Shake on wrong** — quick horizontal rattle, bold and exaggerated (400ms)
6. **Page entrance** — staggered slide-up on all home screen elements with `animation-delay`

---

## Why This Works

- The **bold editorial style** is instantly distinct from every other mobile game
- Hard drop-shadows and chunky outlines read perfectly at small sizes on mobile
- Yellow + pink + blue is an energetic palette that signals "fun competitive game"
- The physical button-press interaction creates satisfying tactile feedback
- Bebas Neue at large sizes dominates the screen — the title IS the brand

---

## Implementation Notes

- Hard shadow buttons: `box-shadow: 4px 4px 0px #111111` — no `blur-radius`, creates that flat graphic look
- Dot grid background: SVG `pattern` element with `<circle r="1.5" fill="#111" opacity="0.15"/>`
- Google Fonts: `Bebas Neue`, `Archivo Black`, `Space Mono`, `DM Sans`
- Flip animation: CSS `perspective: 600px` on parent + `rotateX` on child with `backface-visibility: hidden`
- Win confetti: lightweight `canvas-confetti` npm package (< 5kb gzipped)
- All interactive elements need `cursor: pointer` and `user-select: none` for mobile feel
