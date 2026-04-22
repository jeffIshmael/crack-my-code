# Setting up AI Opponents in Crack-my-code

This document explains how the AI system works and how to manage the "Neural-X" automated opponent.

## How it works

The AI in Crack-my-code is managed by both the server and the frontend:

1. **Code Generation (Server-side)**:
   When a user starts an AI match, the `/api/games/find-match` endpoint identifies the `mode: 'ai'` and generates a random 4-digit code (no repeats). This is stored in `player2Code` in the database.
   
2. **Turn Simulation (Client-side)**:
   The `Home` component in `page.tsx` uses the `scheduleOpponentTurn` function to simulate the AI's "thinking" process.
   - It picks a random guess (can be improved to be smarter).
   - It simulates typing digit-by-digit to make the game feel alive.
   - It uses the same `evaluateGuess` logic as human players.

## Current AI Behavior

Currently, the AI plays with **Random Logic**. This means it picks 4 unique digits at random for every turn. 

### Implementation Tip: Making the AI Smarter
If you want the AI to be more challenging, you can update the `scheduleOpponentTurn` function in `page.tsx` to:
1. Filter the list of all possible 4-digit combinations based on the clues it has received so far.
2. Pick a guess from the remaining valid combinations.

## Adjusting Difficulty

You can adjust the "speed" of the AI by modifying these variables in `page.tsx`:
- `thinkingDelay`: How long the AI "thinks" before typing.
- `charDelay`: How fast the AI types each digit.

---

*Found a bug or need a smarter AI? Reach out to the developer or update the `scheduleOpponentTurn` callback.*
