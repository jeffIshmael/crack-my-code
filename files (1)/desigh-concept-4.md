# Design Concept: CIPHER SOFT
### Aesthetic: Warm Glassmorphism / Modern Mobile-First

---

## Visual Identity

**Theme:** Warm, inviting puzzle game with a soft gradient world — feels like a premium iOS app that lives on your home screen permanently.  
**Mood:** Friendly but focused. Approachable but polished. The kind of game you open every morning.  
**Memorable hook:** A rich orange-to-purple gradient background wraps everything like ambient light. Cards float on top with frosted glass. The number grid tiles are large, soft, and deeply satisfying to tap.

---

## Inspiration Reference

The reference image shows:
- **Layered blob gradients** — deep navy left blending into warm burnt orange right, with a purple/pink mid-blob shape
- **Frosted glass cards** — white/translucent panels floating over the gradient backdrop
- **Soft rounded tile grid** — white rounded-square tiles, with blue and amber/orange highlight states
- **Gentle shadows** — no hard outlines, everything floats with `box-shadow` depth
- **Clean sans-serif UI** — light, legible, minimal chrome

---

## Color Palette

| Role | Color | Hex |
|---|---|---|
| Background gradient start (left) | Deep navy | `#1A237E` |
| Background gradient mid | Purple rose | `#7B3FA0` |
| Background gradient end (right) | Burnt orange | `#E8652A` |
| Blob accent shape | Warm lavender-pink | `#9B59B6` → `#F39C12` gradient |
| Card / surface | Frosted white | `rgba(255, 255, 255, 0.18)` |
| Card border | Soft white edge | `rgba(255, 255, 255, 0.30)` |
| Tile default | Pure white | `#FFFFFF` |
| Tile correct position | Vivid blue | `#2E86FF` |
| Tile wrong position | Warm amber | `#F5A623` |
| Tile not in code | Light grey | `#E8E8EE` |
| Text on gradient | White | `#FFFFFF` |
| Text on cards | Dark navy | `#1A1A2E` |
| Text secondary | Slate | `#7A8499` |

---

## Typography

- **Title / Logo:** `Nunito` ExtraBold — rounded, warm, approachable. "Crack My Code" feels like it belongs next to a sunrise.
- **Tile numbers:** `Nunito` Bold — same family, large and round inside each tile for visual consistency.
- **Button labels:** `Nunito` SemiBold — weight variation within one family keeps the design cohesive and clean.
- **Stats / leaderboard:** `Nunito` Regular — readable at small sizes, never clinical.

> Using one font family (`Nunito`) at varied weights keeps the design unified and app-like, exactly like the reference image.

---

## Background Treatment

### Full-Screen Gradient Backdrop
```css
background: linear-gradient(135deg, #1A237E 0%, #7B3FA0 45%, #E8652A 100%);
min-height: 100vh;
```

### Floating Blob Shapes (Decorative)
Two large blurred blobs positioned behind the UI content:

**Blob 1** — bottom-left, purple to pink:
```css
width: 280px; height: 280px;
background: radial-gradient(circle, #9B59B6, #E91E8C);
border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%;
filter: blur(60px);
opacity: 0.55;
position: absolute; bottom: -60px; left: -80px;
```

**Blob 2** — top-right, amber to orange:
```css
width: 200px; height: 200px;
background: radial-gradient(circle, #F39C12, #E8652A);
border-radius: 40% 60% 30% 70% / 60% 40% 50% 50%;
filter: blur(50px);
opacity: 0.45;
position: absolute; top: 60px; right: -40px;
```

---

## Layout & Components

### Home Screen Structure
```
┌─────────────────────────────────┐
│  [gradient backdrop + blobs]    │
│                                 │
│  ┌───────────────────────────┐  │
│  │  CRACK MY CODE  🔐        │  │  ← white text on gradient
│  └───────────────────────────┘  │
│                                 │
│  [1000 CMC]         [0.36 USDT] │  ← frosted glass pill badges
│                                 │
│  ┌─────────────────────────────┐│
│  │  [Cipher bot illustration]  ││  ← frosted card
│  │  "I crack codes in 3        ││
│  │   attempts. Think you can   ││
│  │   crack mine first?"        ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │  PLAY AGAINST CIPHER AI     ││  ← frosted card button
│  │  Computer Match             ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │  PLAY AGAINST OPPONENT      ││  ← frosted card button
│  │  Human Opponent             ││
│  └─────────────────────────────┘│
│                                 │
│  [OPEN]  [HOME]  [ABOUT]  [⚙]  │  ← frosted glass nav bar
└─────────────────────────────────┘
```

### Frosted Glass Card (Reusable Component)
```css
.glass-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.30);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}
```
Used for: button cards, balance pills, Cipher's speech panel, leaderboard rows, game grid wrapper.

### Balance Pills (Header)
```css
.balance-pill {
  /* same glass-card but smaller, pill shape */
  padding: 8px 16px;
  border-radius: 50px;
  font-size: 14px; font-weight: 700;
  color: #FFFFFF;
}
/* CMC value in white, "CMC" label slightly transparent */
/* USDT value in white, "USDT" label slightly transparent */
```

### Play Buttons
Each button is a full-width glass card with:
- Primary label in `Nunito` Bold 18px, white
- Secondary label (Computer Match / Human Opponent) in `Nunito` Regular 12px, `rgba(255,255,255,0.65)`
- Left icon: a small emoji or SVG (🤖 for AI, 👤 for Human) in a small white circle badge
- Hover/tap: card brightens to `rgba(255,255,255,0.25)`, scales to `1.02` with `transition: all 0.2s ease`
- Active/press: scales back to `0.98`, shadow reduces — satisfying physical tap

### Cipher AI Bot Panel
- Full-width glass card
- Bot illustration sits on the right side of the card (simplified flat vector, blue/teal body, round head, glowing eyes)
- Speech text on the left in white, 14px Nunito SemiBold
- Subtle blue glow behind the bot: `box-shadow: 0 0 30px rgba(46,134,255,0.3)` on the bot illustration container

---

## Number Grid (Gameplay Screen)

### Backdrop
- Same gradient background continues from home screen (seamless navigation)
- Small glass card at top showing: attempt counter + remaining tries

### Tile Design
```css
.tile {
  width: 62px; height: 62px;
  background: #FFFFFF;
  border-radius: 14px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Nunito', sans-serif;
  font-size: 28px; font-weight: 800;
  color: #1A1A2E;
  transition: transform 0.15s ease, background 0.3s ease;
}

/* Correct position */
.tile.correct {
  background: #2E86FF;
  color: #FFFFFF;
  box-shadow: 0 4px 20px rgba(46, 134, 255, 0.45);
}

/* Wrong position */
.tile.present {
  background: #F5A623;
  color: #FFFFFF;
  box-shadow: 0 4px 20px rgba(245, 166, 35, 0.45);
}

/* Not in code */
.tile.absent {
  background: #E8E8EE;
  color: #9AA0B0;
  box-shadow: none;
}
```

### Grid Layout
- 5 columns × 6 rows (or adjust for code length)
- `gap: 10px` between tiles
- Wrapped in a glass card panel: `padding: 20px`, `border-radius: 24px`

---

## Leaderboard Screen

### Structure
- Same gradient background
- Glass card header: "LEADERBOARD" title + trophy emoji
- Top 3 on a **mini podium**: three glass cards at heights 2nd/1st/3rd, amber/blue/orange glow respectively
- Full list below: each row is a slim glass card
  - Rank number (large, faded, behind the row as decorative element)
  - Avatar circle (initials-based, gradient fill)
  - Player name + score
  - Your row: white border + blue left glow `box-shadow: inset 3px 0 0 #2E86FF`

---

## Bottom Navigation Bar

```css
.nav-bar {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: 1px solid rgba(255, 255, 255, 0.20);
  border-radius: 24px 24px 0 0;
}
```
- Icons: SF Symbols style (outline, 24px)
- Active: icon and label in white, dot indicator beneath (white, 4px circle)
- Inactive: icon and label in `rgba(255,255,255,0.45)`

---

## Key Animations

1. **Page load** — gradient backdrop fades in over 0.4s, then blobs animate in with `scale(0) → scale(1)` + `opacity: 0 → 1` (0.6s ease-out, staggered 0.2s apart)
2. **Blob drift** — both blobs slowly drift and morph using `@keyframes` with `border-radius` and `transform: translate` changes, 12s loop, `ease-in-out`, barely noticeable
3. **Card entrance** — glass cards slide up `translateY(20px) → translateY(0)` + `opacity: 0 → 1`, staggered 80ms per card
4. **Tile reveal** — bounce scale: tile pops to `scale(1.15)` then settles to `scale(1)` as color fills in, 350ms
5. **Tile tap** — immediate `scale(0.92)` on press, snaps back on release (20ms)
6. **Wrong guess shake** — grid shakes: `translateX(-8px → 8px → -6px → 6px → 0)`, 400ms
7. **Win celebration** — tiles pulse outward in a radial ripple, then soft confetti (white + amber + blue squares) rains down for 2s
8. **Button tap ripple** — circular ripple expands from tap point within the glass card (CSS `::after` pseudo-element, `transform: scale(0) → scale(4)`, `opacity: 0.3 → 0`)

---

## Screen Transitions

- All screens share the same gradient backdrop (never re-renders, feels native)
- Content cards slide in from the right (forward navigation) or left (back)
- Transition duration: `300ms cubic-bezier(0.4, 0, 0.2, 1)` — matches iOS feel

---

## Implementation Notes

### Critical CSS
```css
/* Prevent background flash on navigation */
body {
  background: linear-gradient(135deg, #1A237E 0%, #7B3FA0 45%, #E8652A 100%);
  min-height: 100vh;
  overflow-x: hidden;
}

/* Smooth blob morphing */
@keyframes blob-drift {
  0%, 100% { border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%; transform: translate(0, 0); }
  33%       { border-radius: 40% 60% 30% 70% / 60% 40% 50% 50%; transform: translate(10px, -15px); }
  66%       { border-radius: 70% 30% 50% 50% / 40% 70% 30% 60%; transform: translate(-8px, 10px); }
}
```

### Font Import
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
```

### Glassmorphism Safari Fix
```css
/* Always include both prefixed and unprefixed */
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
/* Without -webkit- prefix, glass effect breaks on all iOS Safari */
```

### Tile Grid (CSS Grid)
```css
.grid {
  display: grid;
  grid-template-columns: repeat(5, 62px);
  gap: 10px;
  justify-content: center;
}
```

### Performance
- Use `will-change: transform` on tiles that animate to hint GPU compositing
- Blob `filter: blur()` is GPU-accelerated — no performance concern on modern mobile
- Avoid animating `background-color` directly on tiles — use `opacity` on a pseudo-element overlay for smoother transitions