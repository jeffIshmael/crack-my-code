# Cipher AI — How It Cracks Codes (Current Implementation)

Cipher is the AI opponent in **Crack My Code**. It does not guess randomly. Each turn it narrows the space of possible secret codes using Wordle-style feedback, then picks a guess designed to learn as much as possible.

Source of truth: `apps/web/src/lib/cipher.ts` (logic) and `apps/web/src/lib/game.ts` (`evaluateGuess`, `allSecretCodes`).

---

## Game rules Cipher assumes

| Rule | Value |
|------|--------|
| Code length | 4 digits |
| Digit range | 0–9 |
| Duplicates | Allowed (e.g. `1122` is valid) |
| Feedback | Per-tile: **green** (correct place), **yellow** (in code, wrong place), **gray** (not in code) |

Cipher only sees feedback for **its own guesses** against the human’s secret code (the history passed into `cipherNextGuess`).

---

## Pipeline (every AI turn)

```
history of past guesses + clues
        ↓
getPossibleCodes(history)     ← all 10⁴ codes, filtered by constraints
        ↓
pickCipherGuess(possible, turnIndex)
        ↓
next 4-digit guess
```

Entry point: `cipherNextGuess(history)`.

---

## Step 1 — Candidate pool (10,000 codes)

At startup, `allSecretCodes()` builds every combination `0000` … `9999` (cached).

After each guess in `history`, any secret that would **not** produce the exact same clue array as recorded is removed.

```ts
// Simplified: keep secret iff every past guess matches stored clues
pool.filter(secret =>
  history.every(h =>
    cluesMatch(evaluateGuess(h.digits, secret), h.clues)
  )
);
```

`cluesMatch` requires identical green/yellow/gray per position — same rules as Wordle duplicate handling via `evaluateGuess` (two-pass green then yellow).

---

## Step 2 — Opening book (turns 0 and 1)

Human-style **digit sweep**: test eight different digits in the first two guesses, then solve placement.

| Turn index | Strategy | Intent |
|------------|----------|--------|
| 0 | **Random** 4 unique digits (shuffled) | Unpredictable opener — not always `0123` |
| 1 | Best of **C(6,4)** combos from digits *not* in guess 1 | Completes 8-digit coverage; 2 digits still untested |

Example human line: `1254` then `3698` — after two turns, greens/yellows/grays tell Cipher which of those eight digits are in the code and which two (e.g. `0`, `7`) can be deprioritized.

Turn 2+ uses entropy / minimax on the filtered candidate pool.

---

## Step 3 — Probe pool (by pool size)

| Remaining candidates | Probe pool |
|---------------------|------------|
| 1 | That code (immediate win) |
| 2 | Both candidates only |
| ≤ 500 | **All 10,000 codes** — optimal probe guaranteed |
| > 500 | Remaining candidates + curated **duplicate-pattern** probes (`0011`, `1122`, `0101`, etc.) |

No strided sampling — midgame uses explicit duplicate probes instead of sparse skips through the space.

---

## Step 4 — Pick the best guess (information maximization)

For each probe, Cipher buckets feedback against every remaining secret.

Scoring (in order):

1. **Shannon entropy** — maximize expected information.
2. **Minimax worst bucket** — prefer smaller largest bucket.
3. **Bucket count** — prefer more distinct feedback patterns.
4. **Candidate preference** — if still tied, prefer a guess that is itself a remaining secret (could win outright).

```ts
entropy -= p * log2(p)   // per feedback bucket
```

---

## Special cases

| Situation | Behavior |
|-----------|----------|
| 0 candidates left (bad history) | Fallback guess `0123` |
| 1 candidate left | Return that code exactly |
| AI turn in UI | `page.tsx` types digits with delay, then evaluates locally with `evaluateGuess` / `toTileClues` |

---

## What Cipher does *not* do (today)

- No natural-language reasoning or “personality” layer — pure constraint + entropy.
- No modeling of the human’s guesses (only cracks **your** code).
- No difficulty tiers — same algorithm every game.

---

## Quick reference — key functions

| Function | Role |
|----------|------|
| `getPossibleCodes(history)` | Constraint elimination |
| `feedbackEntropy(guess, candidates)` | Information score |
| `pickInformationMaximizingGuess` | Entropy + minimax + splits |
| `pickCipherGuess` | Opening book + pool selection + scoring |
| `cipherNextGuess` | Public API |

---

## Example mental trace

1. Guess `0123` → feedback says digit `1` is green at position 0.
2. Pool drops from 10,000 to all codes starting with `1` at index 0 that are consistent with yellow/grays on other tiles.
3. Turn 2 might use `4567` (opening) or an entropy probe if the pool is still large.
4. As the pool shrinks, probes target duplicate-digit patterns (`0012`, `1122`, …).
5. With ≤6 codes left, Cipher guesses one of the survivors directly.

This matches a standard **optimal Wordle-style solver**: maintain possibilities, maximize expected information, finish by guessing from the remaining set.
