/**
 * cipher.ts — Improved Cipher AI for Crack My Code
 *
 * Key upgrades over the original:
 *  1. No more strided sampling — Cipher evaluates ALL 10,000 codes as
 *     candidate probes once the remaining pool is small enough to be fast.
 *  2. Candidate-preference tiebreak — when two guesses score identically,
 *     Cipher prefers one that is itself a valid remaining candidate (it
 *     could win outright rather than just gaining information).
 *  3. Smarter pool switching — full-universe search kicks in at ≤ 500
 *     remaining candidates (not just ≤ 6), giving Cipher far better midgame
 *     probes without any noticeable lag.
 *  4. Optimised opening — `0123` → `4567` still covers 8 unique digits, but
 *     we now also include high-value duplicate probes in the probe library
 *     for the cases where many digits are already resolved.
 *
 * Drop-in replacement: same public API as before — `cipherNextGuess(history)`.
 * Assumes `evaluateGuess` and `allSecretCodes` are imported from `game.ts`
 * exactly as before.
 */

import { evaluateGuess, allSecretCodes } from "./game";

// ---------------------------------------------------------------------------
// Types (mirror whatever game.ts exports)
// ---------------------------------------------------------------------------

type Clue = "green" | "yellow" | "gray";

interface HistoryEntry {
  digits: string; // e.g. "1234"
  clues: Clue[];  // length 4
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a clue array to a compact string key, e.g. "green,gray,yellow,gray" */
function clueKey(clues: Clue[]): string {
  return clues.join(",");
}

/** All clues match iff they are identical element-by-element. */
function cluesMatch(a: Clue[], b: Clue[]): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

// ---------------------------------------------------------------------------
// Step 1 — Candidate pool
// ---------------------------------------------------------------------------

/**
 * Returns every code that is consistent with every entry in `history`.
 * This is identical to the original getPossibleCodes — no change needed here
 * because constraint elimination is already correct.
 */
export function getPossibleCodes(history: HistoryEntry[]): string[] {
  let pool = allSecretCodes();
  for (const h of history) {
    const targetKey = clueKey(h.clues);
    pool = pool.filter(
      (secret) => clueKey(evaluateGuess(h.digits, secret)) === targetKey
    );
  }
  return pool;
}

// ---------------------------------------------------------------------------
// Step 2 — Scoring
// ---------------------------------------------------------------------------

interface GuessScore {
  entropy: number;      // higher = better (more information)
  worstBucket: number;  // lower = better (minimax)
  bucketCount: number;  // higher = better (more distinct outcomes)
  isCandidate: boolean; // true if this guess is itself a valid remaining code
}

/**
 * Score a single guess against the current candidate pool.
 *
 * We bucket every remaining secret by the feedback it would produce, then
 * compute Shannon entropy over those buckets. Two tiebreakers follow:
 *   1. Minimax: prefer the guess whose largest bucket is smallest.
 *   2. Bucket count: prefer more distinct feedback patterns.
 * A final bonus: if the guess is itself a candidate, we note that so the
 * caller can use it as a last tiebreak (winning > just learning).
 */
function scoreGuess(
  guess: string,
  candidates: string[],
  candidateSet: Set<string>
): GuessScore {
  const buckets: Record<string, number> = {};

  for (const secret of candidates) {
    const key = clueKey(evaluateGuess(guess, secret));
    buckets[key] = (buckets[key] ?? 0) + 1;
  }

  const n = candidates.length;
  let entropy = 0;
  let worstBucket = 0;

  for (const count of Object.values(buckets)) {
    const p = count / n;
    entropy -= p * Math.log2(p);
    if (count > worstBucket) worstBucket = count;
  }

  return {
    entropy,
    worstBucket,
    bucketCount: Object.keys(buckets).length,
    isCandidate: candidateSet.has(guess),
  };
}

/**
 * Compare two scores; returns true if `a` is strictly better than `b`.
 * Priority: entropy → minimax → bucket count → candidate preference.
 */
function isBetter(a: GuessScore, b: GuessScore): boolean {
  if (a.entropy !== b.entropy) return a.entropy > b.entropy;
  if (a.worstBucket !== b.worstBucket) return a.worstBucket < b.worstBucket;
  if (a.bucketCount !== b.bucketCount) return a.bucketCount > b.bucketCount;
  // Tiebreak: prefer guesses that are themselves valid candidates —
  // we might get lucky and win this turn instead of just gaining information.
  return a.isCandidate && !b.isCandidate;
}

// ---------------------------------------------------------------------------
// Step 3 — Probe pool construction
// ---------------------------------------------------------------------------

/**
 * Hard-coded opening guesses.
 * `0123` + `4567` cover 8 unique digits in 2 turns, collapsing the 10,000-
 * code space dramatically before we reach entropy search.
 *
 * The duplicate-pattern probes are kept in the library for midgame use when
 * the opening turns are already done.
 */
const OPENING_GUESSES = ["0123", "4567"];

/**
 * Extra probes covering common duplicate patterns.
 * These are valuable when many unique digits are already resolved and the
 * remaining codes are heavily duplicate-structured.
 */
const DUPLICATE_PROBES = [
  "0011", "2233", "4455", "6677", "8899",
  "0022", "1133", "0099", "1188", "3344",
  "0000", "1111", "2222", "3333", "5555",
  "0101", "1212", "2323", "3434",
];

/**
 * Threshold: if ≤ FULL_SEARCH_THRESHOLD candidates remain, evaluate ALL
 * 10,000 codes as potential probes (not just a sample). This guarantees
 * Cipher always finds the true information-maximising guess.
 *
 * Performance: 10,000 probes × 500 candidates ≈ 5 M evaluateGuess calls.
 * Each call is ~20 simple operations → ~100 ms in a modern JS engine.
 * Well within acceptable UI latency (Cipher already types with a delay).
 *
 * Beyond this threshold we fall back to the candidate pool + duplicate
 * probes, which still outperforms the original strided sampling.
 */
const FULL_SEARCH_THRESHOLD = 500;

/**
 * Build the probe pool for a given situation.
 *
 * | Candidates | Probe pool |
 * |-----------|-----------|
 * | 1         | [that code] (immediate win) |
 * | 2         | candidates only (50 % win + always narrows to 1) |
 * | ≤ 500     | ALL 10,000 codes — guarantees optimal probe |
 * | > 500     | candidates + DUPLICATE_PROBES (fast, still good) |
 */
function buildProbePool(
  possible: string[],
  all: string[]
): string[] {
  if (possible.length <= 2) return possible;
  if (possible.length <= FULL_SEARCH_THRESHOLD) return all;
  // Large pool: use candidates + curated duplicate probes.
  // Dedup via Set so we don't score the same string twice.
  return [...new Set([...possible, ...DUPLICATE_PROBES])];
}

// ---------------------------------------------------------------------------
// Step 4 — Pick best guess
// ---------------------------------------------------------------------------

/**
 * Evaluate every guess in `probePool` against `candidates` and return the
 * one with the best composite score (entropy → minimax → buckets → candidate).
 */
function pickBestGuess(probePool: string[], candidates: string[]): string {
  const candidateSet = new Set(candidates);
  let bestGuess = probePool[0];
  let bestScore = scoreGuess(bestGuess, candidates, candidateSet);

  for (let i = 1; i < probePool.length; i++) {
    const guess = probePool[i];
    const score = scoreGuess(guess, candidates, candidateSet);
    if (isBetter(score, bestScore)) {
      bestGuess = guess;
      bestScore = score;
    }
  }

  return bestGuess;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return Cipher's next guess given the history so far.
 *
 * @param history  Array of {digits, clues} from previous AI turns.
 * @returns        4-character string representing the next guess.
 */
export function cipherNextGuess(history: HistoryEntry[]): string {
  const turnIndex = history.length;

  // --- Opening book ---
  if (turnIndex < OPENING_GUESSES.length) {
    return OPENING_GUESSES[turnIndex];
  }

  // --- Constraint elimination ---
  const possible = getPossibleCodes(history);

  // --- Edge cases ---
  if (possible.length === 0) return "0123"; // corrupted history fallback
  if (possible.length === 1) return possible[0]; // certain win

  // --- Build probe pool and pick best guess ---
  const all = allSecretCodes();
  const probePool = buildProbePool(possible, all);
  return pickBestGuess(probePool, possible);
}