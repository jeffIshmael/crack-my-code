# Leaderboard UI Redesign
### CMC Pro Identity — Dark Ocean × Gold × Blue

---

## What's Wrong with the Current Design

| Issue | Current | Fix |
|---|---|---|
| Background | Flat baby blue — looks like a template | Deep ocean dark — matches the game |
| Podium cards | 3 different colours (green, blue, orange) — random, no system | One language: gold #1, blue #2, slate #3 |
| Avatar circles | Grey with white "P" — dead, no personality | Gradient rings with initials, glow on top 3 |
| Row cards | Plain white, thin border — no depth | Dark surface cards with subtle glow on hover |
| Score label | Tiny "CMC" label above number — reads as an afterthought | Bold number + small "CMC" beside it, right-aligned |
| Podium heights | All three cards the same height | True podium: #1 taller, #2 mid, #3 shortest |
| No player context | No indication of which row is "you" | Your row highlighted in blue with a "YOU" pill |
| Typography | Mixed weights, inconsistent | Syne ExtraBold for numbers, Inter for labels |

---

## Color Tokens (CMC Pro System)

```css
:root {
  --bg:           #0D1B2A;   /* page background */
  --surface:      #112233;   /* list row cards */
  --elevated:     #1A3045;   /* podium card body */
  --gold:         #F5C518;   /* rank #1, active elements */
  --gold-dim:     #7A5F00;   /* #1 avatar ring (dimmer) */
  --blue:         #3B9EFF;   /* rank #2, accent */
  --blue-dim:     #1A4A7A;   /* #2 avatar ring (dimmer) */
  --slate:        #5A7A96;   /* rank #3 */
  --text:         #FFFFFF;
  --text-muted:   #8AA4BE;
  --you-bg:       rgba(59,158,255,0.10);
  --you-border:   #3B9EFF;
}
```

---

## Full Screen Layout

```
┌───────────────────────────────────────────┐
│                                           │
│  ←   LEADERBOARD              [week ▾]   │  ← Header
│       Top players by CMC points           │
│                                           │
│  ┌───────────────────────────────────┐    │
│  │          🏆  TOP 3               │    │  ← Section label (gold pill)
│  │                                   │    │
│  │     [#2]     [  #1  ]    [#3]    │    │  ← Podium (true heights)
│  │    Player   Player_1   Player_3  │    │
│  │    1,100     1,400      1,020    │    │
│  └───────────────────────────────────┘    │
│                                           │
│  ┌───────────────────────────────────┐    │
│  │  4   [avatar]  Player_3Ec7  1,000│    │  ← List rows
│  └───────────────────────────────────┘    │
│  ┌───────────────────────────────────┐    │
│  │  5   [avatar]  Player_218A  1,000│    │
│  └───────────────────────────────────┘    │
│  ...                                      │
│  ┌───────────────────────────────────┐    │
│  │ ▶ 12  [avatar]    YOU     5,640  │    │  ← Your row (blue highlight)
│  └───────────────────────────────────┘    │
│                                           │
│  [OPEN]  [HOME]  [RANKS●]  [ABOUT]  [⚙] │  ← Bottom nav
└───────────────────────────────────────────┘
```

---

## Component 1: Page Header

```
← back          LEADERBOARD          [This Week ▾]
                Top players by CMC points
```

```css
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 8px;
}

.header-title {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 20px;
  color: #FFFFFF;
  letter-spacing: 0.5px;
}

.header-subtitle {
  text-align: center;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: #8AA4BE;
  margin-top: 2px;
}

.filter-pill {
  background: #1A3045;
  border: 1px solid #243E58;
  border-radius: 20px;
  padding: 6px 12px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #8AA4BE;
  display: flex;
  align-items: center;
  gap: 4px;
}
```

---

## Component 2: Podium (Top 3)

### Structure
```
         ┌──────────────┐
         │  [avatar #1] │   ← Tallest: 180px card
         │  Player_4821 │
         │   1,400 CMC  │
         │     👑 1     │
┌──────┐ └──────────────┘ ┌──────┐
│  #2  │                  │  #3  │
│ 155px│                  │ 130px│
└──────┘                  └──────┘
```

### Podium Card CSS

```css
.podium-wrapper {
  display: flex;
  align-items: flex-end;       /* cards sit on same floor line */
  justify-content: center;
  gap: 10px;
  padding: 16px 20px 24px;
}

.podium-card {
  flex: 1;
  max-width: 110px;
  background: #1A3045;
  border-radius: 16px;
  padding: 16px 10px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255,255,255,0.06);
}

/* Rank-specific heights */
.podium-card.rank-1 { height: 180px; border-color: rgba(245,197,24,0.25); }
.podium-card.rank-2 { height: 155px; border-color: rgba(59,158,255,0.20); }
.podium-card.rank-3 { height: 130px; border-color: rgba(90,122,150,0.20); }

/* Rank-specific glow on card */
.podium-card.rank-1 { box-shadow: 0 0 24px rgba(245,197,24,0.12), 0 4px 16px rgba(0,0,0,0.3); }
.podium-card.rank-2 { box-shadow: 0 0 20px rgba(59,158,255,0.10), 0 4px 16px rgba(0,0,0,0.3); }
.podium-card.rank-3 { box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
```

### Avatar Ring CSS

```css
.avatar-ring {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 20px;
  color: #FFFFFF;
  position: relative;
}

/* Ring glow for each rank */
.avatar-ring.rank-1 {
  background: linear-gradient(135deg, #F5C518, #E8A900);
  box-shadow: 0 0 0 3px #0D1B2A, 0 0 0 5px #F5C518, 0 0 20px rgba(245,197,24,0.4);
}
.avatar-ring.rank-2 {
  background: linear-gradient(135deg, #3B9EFF, #1A7FE8);
  box-shadow: 0 0 0 3px #0D1B2A, 0 0 0 5px #3B9EFF, 0 0 16px rgba(59,158,255,0.35);
}
.avatar-ring.rank-3 {
  background: linear-gradient(135deg, #5A7A96, #3D5A72);
  box-shadow: 0 0 0 3px #0D1B2A, 0 0 0 5px #5A7A96;
}

/* Crown badge on #1 */
.avatar-ring.rank-1::before {
  content: '👑';
  position: absolute;
  top: -18px;
  font-size: 16px;
}
```

### Podium Name & Score

```css
.podium-name {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #FFFFFF;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
}

.podium-score {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 16px;
  color: #FFFFFF;
}

.podium-score-label {
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  color: #8AA4BE;
  margin-top: -4px;
}

/* Rank badge at bottom of card */
.rank-badge {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 13px;
  margin-top: auto;
}
.rank-badge.rank-1 { background: #F5C518; color: #0D1B2A; }
.rank-badge.rank-2 { background: #3B9EFF; color: #FFFFFF; }
.rank-badge.rank-3 { background: #5A7A96; color: #FFFFFF; }
```

---

## Component 3: List Rows (Ranks 4+)

### Normal Row

```css
.leaderboard-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #112233;
  border-radius: 14px;
  margin: 0 16px 8px;
  border: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s ease;
}

.row-rank {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 16px;
  color: #8AA4BE;
  min-width: 24px;
  text-align: center;
}

.row-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #243447, #1A2E42);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 15px;
  color: #FFFFFF;
  flex-shrink: 0;
}

.row-name {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #FFFFFF;
  flex: 1;
}

.row-score-block {
  text-align: right;
}

.row-score-number {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 16px;
  color: #FFFFFF;
}

.row-score-label {
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  color: #8AA4BE;
  text-align: right;
}
```

### Your Row (Highlighted)

```css
.leaderboard-row.is-you {
  background: rgba(59,158,255,0.10);
  border: 1px solid rgba(59,158,255,0.30);
  box-shadow: inset 3px 0 0 #3B9EFF;
}

.leaderboard-row.is-you .row-rank { color: #3B9EFF; }
.leaderboard-row.is-you .row-name { color: #3B9EFF; }

/* "YOU" pill next to name */
.you-pill {
  background: rgba(59,158,255,0.20);
  border: 1px solid rgba(59,158,255,0.40);
  border-radius: 8px;
  padding: 2px 7px;
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: #3B9EFF;
  margin-left: 6px;
}
```

### Section Divider (between top list and "your position")

```css
.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 16px 4px;
}
.divider-line {
  flex: 1;
  height: 1px;
  background: #1A3045;
}
.divider-dots {
  font-size: 16px;
  color: #3A5570;
  letter-spacing: 3px;
}
```

Rendered as: `────  ···  ────` between the main list and your highlighted row when you're not in the visible range.

---

## Component 4: Section Label (TOP 3 Pill)

```css
.section-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #F5C518;
  color: #0D1B2A;
  border-radius: 20px;
  padding: 6px 14px;
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 0.5px;
  margin: 0 auto 16px;
  display: block;
  width: fit-content;
}
```

Replaces the current yellow "🏆 TOP 3" pill — same idea, same position, but now using the gold CMC token properly.

---

## Component 5: Bottom Navigation

```css
.nav-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #0D1B2A;
  border-top: 1px solid #1A3045;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 10px 0 22px;   /* 22px for iOS home indicator */
  max-width: 430px;
  margin: 0 auto;
}

.nav-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.nav-icon  { font-size: 22px; color: #3A5570; }
.nav-label { font-family: 'Inter', sans-serif; font-size: 10px; color: #3A5570; }

/* Active state */
.nav-item.active .nav-icon  { color: #F5C518; }
.nav-item.active .nav-label { color: #F5C518; }
.nav-item.active::after {
  content: '';
  width: 4px; height: 4px;
  border-radius: 50%;
  background: #F5C518;
  margin-top: 2px;
}
```

---

## Entrance Animations

```css
/* Podium cards stagger in from below */
.podium-card { opacity: 0; transform: translateY(20px); }
.podium-card.rank-2 { animation: rise 0.4s ease 0.1s forwards; }
.podium-card.rank-1 { animation: rise 0.4s ease 0.25s forwards; }
.podium-card.rank-3 { animation: rise 0.4s ease 0.15s forwards; }

@keyframes rise {
  to { opacity: 1; transform: translateY(0); }
}

/* List rows slide in */
.leaderboard-row {
  opacity: 0;
  transform: translateX(-12px);
  animation: slide-in 0.3s ease forwards;
}
/* Each row staggered: animation-delay: calc(var(--row-index) * 60ms) */

@keyframes slide-in {
  to { opacity: 1; transform: translateX(0); }
}

/* Score number count-up on load */
/* Use JS: count from 0 to final value over 800ms with easeOut */
```

---

## Before → After Summary

| Element | Before | After |
|---|---|---|
| Background | `#C8E6FA` baby blue | `#0D1B2A` deep ocean |
| TOP 3 area | Flat coloured cards, equal height | True podium, staggered heights, glow halos |
| Rank #1 card | Green | Gold glow + crown emoji above avatar |
| Rank #2 card | Blue | Blue glow |
| Rank #3 card | Orange | Slate — no competing warm colour |
| Avatar style | Grey circle + "P" | Gradient ring + glow ring (rank-coloured) |
| List rows | White card, light border | Dark `#112233`, barely-there border |
| Your row | Not marked | Blue glow + inset border + "YOU" pill |
| Score display | Tiny "CMC" above, big number | Bold number + small "CMC" beside it |
| Nav bar | White bar | Dark bar, gold active dot |
| Typography | Mixed weights | Syne ExtraBold (numbers) + Inter (labels) |