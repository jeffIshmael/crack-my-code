# Design Concept: CRACK MY CODE — Pro Edition
### Aesthetic: Wordle Pro Structure × CMC Platform Colors

---

## The Concept

Take everything that makes Wordle Pro feel premium — the rich dark background, the bold stacked tile grid, the XP progress system, the stats cards, the clean keyboard — and rebuild it in the CMC platform's own identity: **deep ocean blue** as the dominant surface, **electric gold** as the power accent, and **crisp white tiles** for the game grid. The result should feel like Wordle Pro's sharper, more exclusive cousin.

---

## Color Palette

The original CMC screenshot used sandy beige + blue. Promoted to full dark-app treatment:

| Role | Color | Hex |
|---|---|---|
| App background | Deep ocean | `#0D1B2A` |
| Surface / cards | Dark slate blue | `#112233` |
| Elevated surface | Mid navy | `#1A3045` |
| **Primary accent** | Electric gold | `#F5C518` |
| **Secondary accent** | Sky blue | `#3B9EFF` |
| Correct position tile | Sky blue fill | `#3B9EFF` |
| Wrong position tile | Gold fill | `#F5C518` |
| Absent tile | Muted slate | `#2E3F52` |
| Empty tile | Dark border only | `#1E3348` |
| Keyboard key default | Slate | `#243447` |
| Keyboard key correct | Sky blue | `#3B9EFF` |
| Keyboard key wrong pos | Gold | `#F5C518` |
| Keyboard key absent | Dim slate | `#1A2535` |
| Text primary | White | `#FFFFFF` |
| Text secondary | Silver blue | `#8AA4BE` |
| Destructive / wrong | Soft red | `#E05C5C` |
| XP bar fill | Gold → Blue gradient | `#F5C518 → #3B9EFF` |

---

## Typography

- **Logo / Hero text:** `Syne` ExtraBold — angular, modern, no-nonsense. "CRACK MY CODE" stacked vertically in large tiles mirrors the Wordle Pro splash screen energy.
- **UI labels, buttons, stats:** `Syne` Bold — same family, tighter tracking for nav and card labels.
- **Tile numbers:** `Syne` ExtraBold — large, centered, fills the tile. Numbers feel like they belong there.
- **Body / descriptions:** `Inter` Regular — reliable at small sizes for leaderboard rows and time displays.

> **Why Syne:** It has the same muscular, wide letterforms as the Wordle Pro typeface but is distinctly not it. CMC gets its own voice.

---

## Screen-by-Screen Breakdown

---

### 1. Home / Splash Screen

**Structure (mirrors Wordle Pro splash):**
```
┌─────────────────────────────────────────┐
│                                         │
│   C R A C K                             │   ← "CRACK MY CODE" stacked as
│   M Y                                   │     large coloured tile letters,
│   C O D E                               │     alternating blue/gold fills,
│                                         │     just like "SOLVE FRESH BASIC
│                  [PRO badge in gold]     │     WORDS DAILY" in the reference
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  LOGIN / SIGN UP                 │   │   ← Gold fill, dark text, rounded
│  └──────────────────────────────────┘   │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  PLAY AS GUEST                   │   │   ← White fill, dark text
│  └──────────────────────────────────┘   │
│                                         │
│  HOW TO PLAY                            │   ← Gold text link
│                                         │
└─────────────────────────────────────────┘
```

**Tile-letter treatment for "CRACK MY CODE":**
Each letter of the game name is rendered as a game tile:
```
[C] [R] [A] [C] [K]   ← Row 1: blue tiles, white letters
    [M] [Y]            ← Row 2: gold tile + grey tile
[C] [O] [D] [E]        ← Row 3: mix of blue + empty tiles
```
Tile size: `56px × 56px`, `border-radius: 8px`, `font-size: 28px`, same styling as game tiles.

---

### 2. Dashboard / Home (Logged In)

**Structure (mirrors Wordle Pro welcome screen):**
```
┌─────────────────────────────────────────┐
│  Welcome back, [Name] 🏆                 │   ← Large greeting, gold trophy
│                                         │
│  Level 4  ████████░░░░  200/1000 XP     │   ← Gold/blue gradient XP bar
│                                         │
│  ┌────────────────────────────────────┐ │
│  │  ✓  Daily Challenge                │ │   ← Blue check, gold countdown
│  │     Resets in  08:42:17  view all  │ │
│  └────────────────────────────────────┘ │
│                                         │
│  ┌──────────────────┐  ┌─────────────┐  │
│  │  PLAY CIPHER AI  │  │  UNLIMITED  │  │   ← Blue card  |  Gold badge card
│  │  Computer Match  │  │  PvP Match  │  │
│  └──────────────────┘  └─────────────┘  │
│                                         │
│  Recent Games                           │
│  ┌────────────────────────────────────┐ │
│  │  #266  8/3/2025  4/6  👁  share   │ │
│  │  #265  7/3/2025  6/6  👁  share   │ │
│  │  #264  6/3/2025  2/6  👁  share   │ │
│  └────────────────────────────────────┘ │
│                                         │
│  [home] [chart] [person] [settings]     │   ← Bottom nav
└─────────────────────────────────────────┘
```

**XP Progress Bar:**
```css
.xp-bar-track {
  height: 8px;
  background: #1A3045;
  border-radius: 4px;
}
.xp-bar-fill {
  background: linear-gradient(90deg, #F5C518, #3B9EFF);
  border-radius: 4px;
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

### 3. Active Game Screen

**Structure (the core Wordle Pro game view):**
```
┌─────────────────────────────────────────┐
│  ← back    DAILY CRACK #267    share    │   ← Header: back arrow + title
│                                         │
│  [ ][ ][ ][ ][ ]                        │   ← Row 1: empty
│  [ ][ ][ ][ ][ ]                        │   ← Row 2: empty
│  [🔵][🔵][⬜][🟡][🔵]                  │   ← Row 3: revealed attempt
│  [🔵][🟡][🔵][🔵][⬜]                  │   ← Row 4: revealed attempt
│  [ ][ ][ ][ ][ ]                        │   ← Row 5: current (blinking cursor)
│  [ ][ ][ ][ ][ ]                        │   ← Row 6: empty
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  [1][2][3][4][5][6][7][8][9][0]         │   ← Number keyboard row 1
│    [4][5][6][7][8][⌫]                   │   ← Keyboard row 2
│         [ENTER]                         │   ← Submit button
│                                         │
└─────────────────────────────────────────┘
```

**Tile CSS:**
```css
.tile {
  width: 58px;
  height: 58px;
  border: 2px solid #1E3348;
  border-radius: 6px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-size: 30px;
  font-weight: 800;
  color: #FFFFFF;
  transition: transform 0.1s ease;
}

/* Has a typed digit — border lights up */
.tile.filled {
  border-color: #3B5F7A;
  animation: tile-pop 0.1s ease;
}

/* Correct position */
.tile.correct {
  background: #3B9EFF;
  border-color: #3B9EFF;
  color: #FFFFFF;
}

/* Wrong position */
.tile.present {
  background: #F5C518;
  border-color: #F5C518;
  color: #0D1B2A;
}

/* Not in code */
.tile.absent {
  background: #2E3F52;
  border-color: #2E3F52;
  color: #FFFFFF;
}

@keyframes tile-pop {
  0%   { transform: scale(1.0); }
  50%  { transform: scale(1.12); }
  100% { transform: scale(1.0); }
}
```

**Tile Reveal (Flip Animation):**
```css
@keyframes flip-reveal {
  0%   { transform: rotateX(0deg); }
  50%  { transform: rotateX(-90deg); }
  100% { transform: rotateX(0deg); }
}
/* Applied to each tile in sequence with 300ms delay per tile */
.tile.reveal { animation: flip-reveal 0.5s ease forwards; }
.tile:nth-child(1) { animation-delay: 0ms;   }
.tile:nth-child(2) { animation-delay: 300ms; }
.tile:nth-child(3) { animation-delay: 600ms; }
.tile:nth-child(4) { animation-delay: 900ms; }
.tile:nth-child(5) { animation-delay: 1200ms;}
```

**Keyboard Key CSS:**
```css
.key {
  min-width: 36px;
  height: 52px;
  background: #243447;
  border-radius: 6px;
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: 15px;
  color: #FFFFFF;
  border: none;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
}
.key:active { transform: scale(0.93); }
.key.correct { background: #3B9EFF; }
.key.present { background: #F5C518; color: #0D1B2A; }
.key.absent  { background: #1A2535; color: #4A5F72; }
.key.enter   { min-width: 72px; background: #3B9EFF; font-size: 13px; }
```

---

### 4. Stats Screen

**Structure (mirrors Wordle Pro "Your Stats" card):**
```
┌─────────────────────────────────────────┐
│  Your Stats                             │
│                                         │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌──────┐│
│  │  42   │ │  71   │ │   2   │ │   8  ││
│  │Played │ │  Win% │ │Current│ │ Max  ││
│  │       │ │       │ │Streak │ │Streak││
│  └───────┘ └───────┘ └───────┘ └──────┘│
│                                         │
│  Guess Distribution                     │
│  1 ▓░░░░░░░░░░░░  2                    │
│  2 ▓▓▓░░░░░░░░░░  7                    │
│  3 ▓▓▓▓▓▓▓░░░░░░  18  ← gold bar       │
│  4 ▓▓▓▓▓▓▓▓▓▓░░░  28  ← longest bar   │
│  5 ▓▓░░░░░░░░░░░  6                    │
│  6 ▓░░░░░░░░░░░░  1                    │
│                                         │
└─────────────────────────────────────────┘
```

- Stat numbers: `Syne` ExtraBold, 36px, white
- Stat labels: `Inter` Regular, 11px, `#8AA4BE`
- Bars: `background: #3B9EFF`, tallest bar gets `background: #F5C518` (gold highlight)
- Each stat card: `background: #1A3045`, `border-radius: 12px`, `padding: 16px`

---

### 5. Leaderboard Screen

```
┌─────────────────────────────────────────┐
│  LEADERBOARD                   [week ▾] │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🥇  PlayerOne        14,220 pts│    │   ← Gold left accent bar
│  │  🥈  PlayerTwo        12,800 pts│    │   ← Silver
│  │  🥉  PlayerThree      11,450 pts│    │   ← Bronze
│  ├─────────────────────────────────┤    │
│  │   4  PlayerFour        9,300 pts│    │
│  │   5  PlayerFive        8,100 pts│    │
│  │  ─────────────────────────────  │    │
│  │ ▶12  YOU              5,640 pts │    │   ← Blue highlight row, arrow icon
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

- Each row: `background: #112233`, `border-radius: 10px`, `margin-bottom: 6px`
- Your row: `background: rgba(59,158,255,0.12)`, `border-left: 3px solid #3B9EFF`
- Rank 1: `border-left: 3px solid #F5C518`
- All type: `Syne` Bold for names/scores, `Inter` for dates

---

## Bottom Navigation

Mirrors Wordle Pro's minimal bottom nav:
```css
.nav-bar {
  background: #0D1B2A;
  border-top: 1px solid #1A3045;
  display: flex;
  justify-content: space-around;
  padding: 12px 0 20px; /* 20px accounts for iOS home bar */
}
.nav-icon { color: #3A5570; }           /* inactive */
.nav-icon.active { color: #F5C518; }    /* active = gold */
```
Icons: outline style, 26px. Active tab gets a 3px gold dot beneath the icon.

---

## Key Animations Summary

| Moment | Animation | Duration |
|---|---|---|
| Tile type | Scale pop `1 → 1.12 → 1` | 100ms |
| Row reveal | Sequential `rotateX` flip per tile | 300ms per tile |
| Wrong guess | Horizontal shake `±8px → ±6px → 0` | 400ms |
| Win row | Bounce: `translateY(0 → -12px → 0)` left to right | 100ms per tile |
| XP bar load | Width eases from 0% to current% | 1000ms cubic |
| Screen enter | `translateX(100%) → 0` | 280ms ease-out |
| Screen back | `translateX(0) → 100%)` | 240ms ease-in |
| Stat numbers | Count up from 0 on enter | 800ms |

---

## Font & Asset Setup

```html
<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500&display=swap" rel="stylesheet">
```

```css
:root {
  --bg:        #0D1B2A;
  --surface:   #112233;
  --elevated:  #1A3045;
  --gold:      #F5C518;
  --blue:      #3B9EFF;
  --correct:   #3B9EFF;
  --present:   #F5C518;
  --absent:    #2E3F52;
  --text:      #FFFFFF;
  --text-muted:#8AA4BE;
  --red:       #E05C5C;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Inter', sans-serif;
  background: var(--bg);
  color: var(--text);
  max-width: 430px;
  margin: 0 auto;
  min-height: 100vh;
}
```

---

## What This Gives You vs. The Reference

| Feature | Wordle Pro (reference) | CMC Pro (this spec) |
|---|---|---|
| Background | Forest dark green `#1B4332` | Ocean dark blue `#0D1B2A` |
| Primary accent | Bright green `#6AAF3D` | Electric gold `#F5C518` |
| Secondary accent | Yellow `#F5C518` | Sky blue `#3B9EFF` |
| Correct tile | Green | **Blue** |
| Wrong-pos tile | Yellow/gold | **Gold** |
| Logo font | Wide bold sans | **Syne ExtraBold** |
| XP bar | Green fill | **Gold → Blue gradient** |
| Active nav icon | Green | **Gold** |
| Leaderboard highlight | Green accent | **Blue accent + Gold rank 1** |

Same structural DNA. Completely different identity.