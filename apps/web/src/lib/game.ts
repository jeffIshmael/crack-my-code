// ─── Types and Interfaces ───────────────────────────────────────────────────────
// Added countdown phase for better pre-game sync.

export type Clue = 'green' | 'yellow' | 'gray';

/** Per-tile display state (Wordle-style, with duplicate vs absent grays) */
export type TileClue = 'green' | 'yellow' | 'absent' | 'duplicate';
export type GamePhase = 'lobby' | 'matchmaking' | 'setCode' | 'playing' | 'result' | 'countdown';
export type GameMode = 'ai' | 'fun' | 'cash';

/** USDT staking / Professional mode — disabled until launch */
export const PROFESSIONAL_MODE_ENABLED = false;
export type GameResult = 'win' | 'lose' | 'draw' | null;

export interface GuessEntry {
  digits: number[];
  clues: Clue[];
  /** Per-tile display clues; falls back to `clues` when missing (older games) */
  tileClues?: TileClue[];
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
  playerPoints: number;
  ratingDelta: number | null;
  opponentName: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const GAME_DURATION = 60;            // seconds per match
export const MAX_GUESSES = 8;
export const MAX_CIPHER_GUESSES = 5;
/** On-chain cap: rewarded Cipher wins per wallet per UTC day */
export const CIPHER_DAILY_WIN_CAP = 5;
/** USDT paid per rewarded Cipher win */
export const CIPHER_WIN_REWARD_USDT = 0.1;

export function maxGuessesForMode(mode: GameMode): number {
  return mode === 'ai' ? MAX_CIPHER_GUESSES : MAX_GUESSES;
}
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

/** Map evaluation clues to tile colors (splits gray into absent vs duplicate) */
export function toTileClues(guess: number[], secret: number[]): TileClue[] {
  const clues = evaluateGuess(guess, secret);
  return clues.map((clue, i) => {
    if (clue === 'green') return 'green';
    if (clue === 'yellow') return 'yellow';
    const digit = guess[i];
    if (!secret.includes(digit)) return 'absent';
    return 'duplicate';
  });
}

/** Random 4-digit code; duplicates allowed */
export function generateSecretCode(length = CODE_LENGTH): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * 10));
}

let ALL_SECRET_CODES_CACHE: number[][] | null = null;

/** All 10^4 possible codes (duplicates allowed) */
export function allSecretCodes(): number[][] {
  if (!ALL_SECRET_CODES_CACHE) {
    const codes: number[][] = [];
    const build = (current: number[]) => {
      if (current.length === CODE_LENGTH) {
        codes.push(current);
        return;
      }
      for (let d = 0; d <= 9; d++) build([...current, d]);
    };
    build([]);
    ALL_SECRET_CODES_CACHE = codes;
  }
  return ALL_SECRET_CODES_CACHE;
}

// Cipher AI lives in ./cipher.ts (see apps/web/cipher.md)
export {
  getPossibleCodes as filterSecretCandidates,
  cipherNextGuess,
  pickCipherGuess as pickAIGuess,
  generateCipherSecretCode,
} from './cipher';

export function isWinningClues(clues: Clue[]): boolean {
  return clues.filter((c) => c === 'green').length === CODE_LENGTH;
}

/** Resolve tile clues for display (supports guesses saved before tileClues existed) */
export function tileCluesForGuess(entry: Pick<GuessEntry, 'clues' | 'tileClues'>): TileClue[] {
  if (entry.tileClues && entry.tileClues.length === CODE_LENGTH) {
    return entry.tileClues;
  }
  return entry.clues.map((c) => (c === 'gray' ? 'absent' : c) as TileClue);
}

export function getClueCounts(clues: Clue[]) {
  return {
    green: clues.filter((c) => c === 'green').length,
    yellow: clues.filter((c) => c === 'yellow').length,
  };
}

/** Wordle-style tile colors for each tile clue state */
export function clueTileStyle(tileClue: TileClue | Clue): {
  background: string;
  border: string;
  color: string;
  boxShadow?: string;
} {
  switch (tileClue) {
    case 'green':
      return {
        background: 'var(--clue-green)',
        border: '2px solid transparent',
        color: 'var(--clue-green-text)',
        boxShadow: 'var(--tile-shadow)',
      };
    case 'yellow':
      return {
        background: 'var(--clue-yellow)',
        border: '2px solid transparent',
        color: 'var(--clue-yellow-text)',
        boxShadow: 'var(--tile-shadow)',
      };
    case 'duplicate':
    case 'absent':
    case 'gray':
    default:
      return {
        background: 'var(--tile-absent)',
        border: '2px solid transparent',
        color: 'var(--tile-absent-text)',
        boxShadow: 'inset 0 2px 0 rgba(0, 0, 0, 0.18)',
      };
  }
}

/** Best per-digit hint across all guesses (for keyboard coloring). */
export function digitHintStates(guesses: GuessEntry[]): Partial<Record<number, TileClue>> {
  const priority: Record<TileClue, number> = {
    green: 4,
    yellow: 3,
    duplicate: 2,
    absent: 1,
  };
  const states: Partial<Record<number, TileClue>> = {};
  for (const guess of guesses) {
    const tiles = tileCluesForGuess(guess);
    guess.digits.forEach((digit, i) => {
      const clue = tiles[i];
      const prev = states[digit];
      if (!prev || priority[clue] > priority[prev]) {
        states[digit] = clue;
      }
    });
  }
  return states;
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



export function initialGameState(points = 1000, mode: GameMode = 'fun', stake = 0): GameState {
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
    playerRating: points,
    playerPoints: points,
    ratingDelta: null,
    opponentName: 'Searching...',
  };
}
