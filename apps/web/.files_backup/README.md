# Codebreaker — PvP Logic Duel UI

A real-time 1v1 code-cracking game UI built for MiniPay on Celo.
Modern dark cyber-terminal aesthetic, fully animated, mobile-first.

---

## Quick Start

```bash
# 1. Create a new Next.js app (skip if you already have one)
npx create-next-app@latest codebreaker --typescript --tailwind --app --src-dir=false
cd codebreaker

# 2. Install Framer Motion
npm install framer-motion

# 3. Copy all the files from this bundle into your project:
#
#   app/globals.css          → replace the generated one
#   app/layout.tsx           → replace
#   app/page.tsx             → replace
#   components/Lobby.tsx     → new file
#   components/SetCode.tsx   → new file
#   components/GameBoard.tsx → new file
#   components/GuessRow.tsx  → new file
#   components/NumberPad.tsx → new file
#   components/ResultModal.tsx → new file
#   lib/game.ts              → new file

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on a mobile viewport (or Chrome DevTools mobile emulation).

---

## Project Structure

```
├── app/
│   ├── globals.css          # Design tokens, fonts, keyframe animations
│   ├── layout.tsx           # Root layout with metadata + viewport
│   └── page.tsx             # Main orchestrator: state machine + phase routing
│
├── components/
│   ├── Lobby.tsx            # Home screen — rating, matchmaking, radar animation
│   ├── SetCode.tsx          # Secret code picker — digit slots + number grid
│   ├── GameBoard.tsx        # Main game UI — guess history, opponent bar, number pad
│   ├── GuessRow.tsx         # Single submitted guess with animated clue dots
│   ├── NumberPad.tsx        # 0-9 digit grid with used-digit blocking
│   └── ResultModal.tsx      # Win/lose sheet with code reveal + rating delta
│
└── lib/
    └── game.ts              # Types, evaluateGuess(), constants, initialGameState()
```

---

## Game Flow

```
Lobby → (Find Match) → Matchmaking → SetCode → Playing → Result
                                                  ↑           |
                                                  └───────────┘ (Play Again)
```

### Mock demo behavior
- **Opponent code** is hardcoded as `[2, 8, 4, 6]` in `lib/game.ts`
- Guess with those exact digits to win (try `2 8 4 6`)
- Opponent simulates a turn with a 1.8–3.2s delay after each of your guesses
- The 60-second match timer ends the game with a loss if it expires
- Rating changes: +22 for win, −12 for timeout, −10 for max guesses

### Keyboard support (desktop dev)
- `0–9` keys → input digits
- `Backspace` → delete last digit
- `Enter` → submit guess (when 4 digits filled)

---

## Design System

| Token             | Value            | Usage                        |
|-------------------|------------------|------------------------------|
| `--bg-base`       | `#030C15`        | Page background              |
| `--bg-card`       | `#0A1928`        | Card surfaces                |
| `--accent`        | `#00CFFF`        | Primary CTA, active states   |
| `--orange`        | `#FF6B2B`        | Opponent, danger             |
| `--clue-green`    | `#10B981`        | Correct position             |
| `--clue-yellow`   | `#F59E0B`        | Correct digit, wrong pos     |
| `--clue-gray`     | `#172840`        | Not in code                  |

### Fonts (Google Fonts — loaded in globals.css)
- **Orbitron** — Logo, headings, CTAs (sci-fi, all-caps)
- **Space Mono** — Digits, codes, stats (monospace precision)
- **Outfit** — Body copy, labels (clean, modern)

---

## Connecting a Backend

Replace the mock in `lib/game.ts` and `app/page.tsx`:

1. **`evaluateGuess()`** → call your server to evaluate (prevents cheating)
2. **`MOCK_OPPONENT_CODE`** → remove; never send real code to client
3. **`scheduleOpponentTurn()`** in `page.tsx` → replace with WebSocket events
4. **`handleFindMatch()`** → call your matchmaking API
5. **`handleLockCode()`** → POST encrypted code hash to server

---

## Extending

- Add sound effects via the Web Audio API or `use-sound`
- Add haptic feedback via `navigator.vibrate()` for mobile
- Swap `MOCK_OPPONENT_CODE` for a real server-evaluated guess endpoint
- Add chat/emoji reactions overlay on top of GameBoard
- Persist rating in localStorage or on-chain via MiniPay wallet
