// ─── Types ───────────────────────────────────────────────────────────────────

export type Clue = 'green' | 'yellow' | 'gray';
export type GamePhase = 'lobby' | 'matchmaking' | 'setCode' | 'playing' | 'result';

export interface GuessEntry {
  digits: number[];
  clues: Clue[];
  id: string;
}

export interface GameState {
  phase: GamePhase;
  playerCode: number[];
  opponentCode: number[];        // revealed only on result screen
  playerGuesses: GuessEntry[];
  opponentGuessCount: number;
  currentInput: number[];
  isPlayerTurn: boolean;
  timeLeft: number;              // seconds
  result: 'win' | 'lose' | null;
  playerRating: number;
  ratingDelta: number | null;
  opponentName: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const GAME_DURATION = 60;            // seconds per match
export const MAX_GUESSES = 8;
export const CODE_LENGTH = 4;

/** Mock opponent — never changes, allows deterministic demo */
export const MOCK_OPPONENT_CODE: number[] = [2, 8, 4, 6];
export const MOCK_OPPONENT_NAMES = [
  'Cipher_X', 'n0vax', 'byte_wolf', 'reaper77', 'l0gic_phantom',
];

// ─── Core logic ──────────────────────────────────────────────────────────────

/**
 * Evaluate a guess against the secret code.
 * Returns an array of clues: 'green' | 'yellow' | 'gray'
 */
export function evaluateGuess(guess: number[], secret: number[]): Clue[] {
  const clues: Clue[] = Array(CODE_LENGTH).fill('gray');
  const secretUsed = Array(CODE_LENGTH).fill(false);
  const guessUsed  = Array(CODE_LENGTH).fill(false);

  // Pass 1: exact position matches → green
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guess[i] === secret[i]) {
      clues[i]      = 'green';
      secretUsed[i] = true;
      guessUsed[i]  = true;
    }
  }

  // Pass 2: correct digit, wrong position → yellow
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessUsed[i]) continue;
    for (let j = 0; j < CODE_LENGTH; j++) {
      if (secretUsed[j]) continue;
      if (guess[i] === secret[j]) {
        clues[i]      = 'yellow';
        secretUsed[j] = true;
        break;
      }
    }
  }

  return clues;
}

export function isWinningClues(clues: Clue[]): boolean {
  return clues.every((c) => c === 'green');
}

export function randomOpponentName(): string {
  return MOCK_OPPONENT_NAMES[Math.floor(Math.random() * MOCK_OPPONENT_NAMES.length)];
}

export function initialGameState(rating = 1240): GameState {
  return {
    phase: 'lobby',
    playerCode: [],
    opponentCode: MOCK_OPPONENT_CODE,
    playerGuesses: [],
    opponentGuessCount: 0,
    currentInput: [],
    isPlayerTurn: true,
    timeLeft: GAME_DURATION,
    result: null,
    playerRating: rating,
    ratingDelta: null,
    opponentName: randomOpponentName(),
  };
}
