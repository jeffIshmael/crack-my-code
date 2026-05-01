# Cipher: The AI Opponent Logic

This document outlines how the AI opponent (now named **Cipher**) operates within the Codebreaker game. The logic is handled entirely on the client side to ensure a smooth, low-latency experience, utilizing an optimized approach derived from Donald Knuth's algorithm for solving Mastermind.

## The AI Game Loop

The AI's decision-making process is encapsulated within the `scheduleOpponentTurn` function in the main gameplay loop (`page.tsx`). When it is the AI's turn, it follows these distinct phases:

### 1. Simulated "Thinking" Delay
To make the AI feel more human, it initiates its turn with a randomized delay between 1 to 2 seconds (`1000 + Math.random() * 1000` ms) before it begins processing its next move.

### 2. Candidate Filtering (Deductive Reasoning)
The game initializes a master list of all possible 4-digit permutations (`allPermutations`) where all digits are unique (no repeated digits).

Before making a guess, Cipher filters this list down to a pool of valid `candidates` based on strict deductive reasoning:
- It iterates through its entire `history` of past guesses.
- For each past guess, it takes a potential candidate and evaluates what clues (`green` and `yellow` pegs) that candidate *would* have yielded.
- If the hypothetical clues exactly match the actual clues Cipher received for that past guess, the candidate is kept. Otherwise, it is discarded. 
- This ensures the AI never makes a mathematically illogical guess that contradicts known information.

### 3. Guess Selection Strategy
Once the valid candidate pool is filtered, Cipher chooses its next guess based on the size of the pool:

* **Opening Move:** If there is no history (the very first turn), Cipher statically guesses `[0, 1, 2, 3]` as its opening move.
* **Sure Thing:** If the candidate pool is reduced to exactly 1 possibility, Cipher selects it and wins.
* **Early Game (Broad Pool):** If there are more than 200 valid candidates remaining, computing the optimal move is expensive. To maintain game performance, Cipher simply picks a random guess from the valid candidate pool.
* **Mid-to-Late Game (Knuth-lite Minimax):** Once the candidate pool shrinks to 200 or fewer, Cipher employs a "minimax" strategy to find the mathematically optimal guess:
  - **Sampling:** To optimize performance, if there are more than 50 candidates, it samples the first 50 as its test pool.
  - **Minimax Calculation:** For each guess in the test pool, it categorizes all remaining candidates by the clue signature (`green-yellow`) they would produce. It finds the largest resulting group (the "worst-case scenario" for that guess).
  - **Selection:** It selects the guess that has the smallest "worst-case scenario" (minimizing the maximum remaining candidates). This guarantees the fastest possible elimination of wrong answers.

### 4. Humanized Typing Simulation
Rather than instantly snapping the full guess onto the board, Cipher simulates human typing:
- It pushes one digit at a time to the `opponentCurrentInput` state.
- Between each keystroke, there is a random delay of `150 + Math.random() * 100` milliseconds.
- This real-time typing visualization adds tension for the player as they watch the AI input its code.

### 5. Evaluation and Turn Handover
After the typing simulation finishes, the AI's guess is evaluated against the player's secret code. 
- The result is pushed to the game state's `opponentGuesses`.
- If the AI correctly guesses the code, it triggers the endgame sequence, revealing its own secret code and handing the player a loss.
- If the guess is incorrect, the turn is handed back to the player after a brief 1-second pause.

## Note on Naming
The AI bot was previously referred to as `Neural_X`, but has been successfully rebranded to **Cipher** across the user interface.
