// ─── Types ───────────────────────────────────────────────────────────────────

export type Clue = 'green' | 'yellow' | 'gray';
export type GamePhase = 'lobby' | 'matchmaking' | 'setCode' | 'playing' | 'result';
export type GameMode = 'ai' | 'fun' | 'cash';
export type GameResult = 'win' | 'lose' | 'draw' | null;

export interface GuessEntry {
  digits: number[];
  clues: Clue[];
  id: string;
}

export interface GameState {
  phase: GamePhase;
  gameMode: GameMode;
  stakeAmount: number;
  playerCode: number[];
  opponentCode: number[];        // revealed only on result screen
  playerGuesses: GuessEntry[];
  opponentGuesses: GuessEntry[]; // Track opponent's history
  opponentGuessCount: number;
  currentInput: number[];
  opponentCurrentInput: number[]; // For real-time typing simulation
  isPlayerTurn: boolean;
  timeLeft: number;              // seconds (if timer used, currently static)
  result: GameResult;
  playerRating: number;
  ratingDelta: number | null;
  opponentName: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const GAME_DURATION = 60;            // seconds per match
export const MAX_GUESSES = 8;
export const CODE_LENGTH = 4;

/** Mock opponent — never changes, allows deterministic demo */
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
  return clues.filter((c) => c === 'green').length === CODE_LENGTH;
}

export function getClueCounts(clues: Clue[]) {
  return {
    green: clues.filter((c) => c === 'green').length,
    yellow: clues.filter((c) => c === 'yellow').length,
  };
}

export function randomOpponentName(): string {
  return MOCK_OPPONENT_NAMES[Math.floor(Math.random() * MOCK_OPPONENT_NAMES.length)];
}


/**
 * Returns a verbose hint string for the given clues.
 * Logic: only show the count of 'green' (right place) clues.
 */
export function getHintText(clues: Clue[]): string {
  const greenCount = clues.filter((c) => c === 'green').length;
  const yellowCount = clues.filter((c) => c === 'yellow').length;
  
  if (greenCount === 0 && yellowCount === 0) return 'None found';
  
  const parts = [];
  if (greenCount > 0) parts.push(`${greenCount} Correct`);
  if (yellowCount > 0) parts.push(`${yellowCount} Relocated`);
  
  return parts.join(', ');
}



export function initialGameState(rating = 1240, mode: GameMode = 'fun', stake = 0): GameState {
  return {
    phase: 'lobby',
    gameMode: mode,
    stakeAmount: stake,
    playerCode: [],
    opponentCode: [], // Revealed only on result screen
    playerGuesses: [],
    opponentGuesses: [],
    opponentGuessCount: 0,
    currentInput: [],
    opponentCurrentInput: [],
    isPlayerTurn: true,
    timeLeft: GAME_DURATION,
    result: null,
    playerRating: rating,
    ratingDelta: null,
    opponentName: 'Searching...',
  };
}
