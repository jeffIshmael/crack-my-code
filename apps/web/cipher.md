# Cipher AI Architecture Specification
## Crack My Code

You are building the AI brain for a competitive code-cracking game called:

# Crack My Code

The AI opponent is called:

# Cipher

Cipher plays against human players by attempting to crack a hidden numeric code intelligently.

This document defines EXACTLY how Cipher should think, reason, and make guesses.

---

# 🎯 Objective

Cipher must feel:
- Smart
- Strategic
- Intimidating
- Human-like
- Competitive

Cipher should NOT guess randomly.

The AI should progressively deduce the secret code using logic and feedback analysis.

---

# 🧠 Game Rules

- Secret code consists of digits
- Default length: 4 digits
- Digits range from 0–9
- The human creates a secret code
- Cipher attempts to crack it
- After every guess, Cipher receives feedback

---

# 🎨 Feedback System

The game uses Wordle-style feedback.

## Feedback meanings

| Color | Meaning |
|---|---|
| Green | Correct digit in correct position |
| Yellow | Correct digit but wrong position |
| Gray | Digit does not exist in the code |

Example:

Guess:
1234

Feedback:
🟩 ⬜ 🟨 ⬜

Meaning:
- 1 is correct and correctly placed
- 3 exists but is misplaced
- 2 and 4 do not exist

---

# 🧩 Core AI Philosophy

Cipher must use:

1. Constraint elimination
2. Deductive reasoning
3. Probability optimization
4. Information maximization

Cipher should maintain a list of all possible valid codes and continuously eliminate impossible combinations after each guess.

---

# 🏗 AI Architecture

---

# Step 1 — Generate All Possible Codes

At game start:

Generate every possible code combination.

Example for 4 digits:

0000 → 9999

Total:
10,000 possible combinations

Store them in memory.

Example structure:

```ts
let possibleCodes: string[] = [];
```

---

# Step 2 — Eliminate Impossible Codes

After every Cipher guess, filter `possibleCodes`:

Keep only secrets where `evaluateGuess(guess, secret)` **exactly matches** the feedback received (green / yellow / gray per tile).

Implementation: `getPossibleCodes(history)` in `src/lib/cipher.ts`.

---

# Step 3 — Maximize Information

When choosing the next guess, score probe guesses against the remaining pool:

1. **Entropy** — prefer guesses that split candidates into many equally-sized feedback buckets
2. **Minimax** — tie-break toward lower worst-case bucket size
3. **Splits** — tie-break toward more distinct feedback patterns

When ≤6 candidates remain, guess from the candidate pool directly (attempt to crack).

Implementation: `pickCipherGuess()` in `src/lib/cipher.ts`.

---

# Step 4 — Opening Strategy

| Turn | Guess | Why |
|------|-------|-----|
| 1 | `0123` | Cover four unique digits |
| 2 | `4567` | Cover four more unique digits |
| 3+ | Entropy probe | Deduce from feedback |

---

# Usage in the app

```ts
import { cipherNextGuess } from '@/lib/cipher';

const history = opponentGuesses; // { digits, clues }[]
const nextGuess = cipherNextGuess(history);
```

Re-exported from `@/lib/game` as `cipherNextGuess` for the AI turn in `page.tsx`.

**Full walkthrough of the live algorithm:** see [docs/cipher-ai-strategy.md](./docs/cipher-ai-strategy.md).