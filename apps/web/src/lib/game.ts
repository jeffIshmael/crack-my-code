// ─── Types and Interfaces ───────────────────────────────────────────────────────
// Added countdown phase for better pre-game sync.

export type Clue = 'green' | 'yellow' | 'gray';

/** Per-tile display state (Wordle-style, with duplicate vs absent grays) */
export type TileClue = 'green' | 'yellow' | 'absent' | 'duplicate';
export type GamePhase = 'lobby' | 'matchmaking' | 'setCode' | 'playing' | 'result' | 'countdown';
export type GameMode = 'ai' | 'fun' | 'cash';
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

/** Aggregate hint key: greens = in place, yellows = relocated (Wordle-style counts) */
export function clueCountKey(clues: Clue[]): string {
  const { green, yellow } = getClueCounts(clues);
  return `${green}-${yellow}`;
}

/** Whether a secret would produce the same green/yellow counts for a past guess */
export function secretMatchesGuessFeedback(
  secret: number[],
  guess: number[],
  expectedClues: Clue[]
): boolean {
  const simulated = evaluateGuess(guess, secret);
  return clueCountKey(simulated) === clueCountKey(expectedClues);
}

/** Filter secrets using green/yellow counts (same logic as "X correct, Y relocated") */
export function filterSecretCandidates(
  secrets: number[][],
  history: Pick<GuessEntry, 'digits' | 'clues'>[]
): number[][] {
  if (history.length === 0) return secrets;
  return secrets.filter((secret) =>
    history.every((h) => secretMatchesGuessFeedback(secret, h.digits, h.clues))
  );
}

const OPENING_GUESSES: number[][] = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 0, 1],
  [2, 4, 6, 8],
  [1, 3, 5, 7],
  [0, 2, 4, 6],
  [5, 1, 9, 3],
  [0, 0, 1, 2],
  [3, 3, 6, 6],
];

/** Probe guesses for minimax when the candidate pool is still large */
function buildProbeGuessPool(): number[][] {
  const probes = [...OPENING_GUESSES];
  const all = allSecretCodes();
  const step = Math.max(1, Math.floor(all.length / 100));
  for (let i = 0; i < all.length; i += step) {
    probes.push(all[i]);
  }
  return probes;
}

/**
 * Pick a strong guess: minimax on green/yellow count buckets (not per-tile strings).
 * When few candidates remain, guess directly from the remaining secrets.
 */
export function pickAIGuess(candidates: number[][], historyLength: number): number[] {
  if (historyLength === 0) return [...OPENING_GUESSES[0]];
  if (candidates.length === 1) return [...candidates[0]];
  if (candidates.length === 0) return [1, 2, 3, 4];

  const guessPool =
    candidates.length <= 10
      ? candidates
      : candidates.length > 250
        ? buildProbeGuessPool()
        : candidates.slice(0, Math.min(80, candidates.length));

  let bestGuess = guessPool[0];
  let bestWorst = Infinity;
  let bestSplits = -1;

  for (const guess of guessPool) {
    const buckets = new Map<string, number>();
    for (const secret of candidates) {
      const key = clueCountKey(evaluateGuess(guess, secret));
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    const sizes = [...buckets.values()];
    const worst = Math.max(...sizes);
    const splits = buckets.size;
    if (worst < bestWorst || (worst === bestWorst && splits > bestSplits)) {
      bestWorst = worst;
      bestSplits = splits;
      bestGuess = guess;
    }
  }

  return [...bestGuess];
}

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
        border: '1px solid var(--clue-green-mid)',
        color: '#fff',
        boxShadow: '0 0 10px rgba(5, 150, 105, 0.4)',
      };
    case 'yellow':
      return {
        background: 'var(--clue-yellow)',
        border: '1px solid rgba(217, 119, 6, 0.5)',
        color: '#fff',
        boxShadow: '0 0 10px rgba(217, 119, 6, 0.35)',
      };
    case 'duplicate':
      return {
        background: 'var(--clue-gray)',
        border: '1px solid rgba(75, 85, 99, 0.35)',
        color: '#fff',
      };
    case 'absent':
    case 'gray':
    default:
      return {
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-mid)',
        color: 'var(--text-dim)',
      };
  }
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



export function initialGameState(rating = 1000, points = 1000, mode: GameMode = 'fun', stake = 0): GameState {
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
    playerPoints: points,
    ratingDelta: null,
    opponentName: 'Searching...',
  };
}
