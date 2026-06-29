/**
 * Cipher AI — competitive code-cracking opponent for Crack My Code.
 *
 * Solver: constraint elimination + full 10⁴ probe search (entropy / expected
 * pool reduction; minimax when ≤50 candidates). Opening: fixed `0123`, then
 * dynamic optimal guesses from the full space.
 */

import {
  CODE_LENGTH,
  type Clue,
  type GuessEntry,
  evaluateGuess,
  allSecretCodes,
} from './game';

export type CipherHistory = Pick<GuessEntry, 'digits' | 'clues'>[];

/** First guess only — four unique digits for maximum initial coverage. */
const OPENING_GUESS: number[] = [0, 1, 2, 3];

/** Prefer minimax (worst-case bucket) when the pool is this small. */
const MINIMAX_THRESHOLD = 50;

/** Score every code as a probe when the candidate pool is at most this size. */
const FULL_PROBE_THRESHOLD = 500;

/** When the pool is larger, sample this many candidate probes (fast on mobile). */
const LARGE_POOL_PROBE_CAP = 200;

export function cluesMatch(a: Clue[], b: Clue[]): boolean {
  return a.length === b.length && a.every((c, i) => c === b[i]);
}

export function getPossibleCodes(history: CipherHistory): number[][] {
  const pool = allSecretCodes();
  if (history.length === 0) return pool;

  return pool.filter((secret) =>
    history.every((h) => cluesMatch(evaluateGuess(h.digits, secret), h.clues))
  );
}

function codeKey(code: number[]): string {
  return code.join('');
}

function feedbackSignature(guess: number[], secret: number[]): string {
  return evaluateGuess(guess, secret).join(',');
}

interface GuessScore {
  entropy: number;
  worstBucket: number;
  expectedRemaining: number;
  bucketCount: number;
  isCandidate: boolean;
}

function scoreGuess(
  guess: number[],
  candidates: number[][],
  candidateKeys: Set<string>
): GuessScore {
  const buckets = new Map<string, number>();
  for (const secret of candidates) {
    const key = feedbackSignature(guess, secret);
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  const n = candidates.length;
  let entropy = 0;
  let worstBucket = 0;
  let expectedRemaining = 0;

  for (const count of buckets.values()) {
    const p = count / n;
    entropy -= p * Math.log2(p);
    expectedRemaining += p * count;
    if (count > worstBucket) worstBucket = count;
  }

  return {
    entropy,
    worstBucket,
    expectedRemaining,
    bucketCount: buckets.size,
    isCandidate: candidateKeys.has(codeKey(guess)),
  };
}

function isBetterScore(a: GuessScore, b: GuessScore, minimaxMode: boolean): boolean {
  if (minimaxMode) {
    if (a.worstBucket !== b.worstBucket) return a.worstBucket < b.worstBucket;
    if (Math.abs(a.expectedRemaining - b.expectedRemaining) > 1e-6) {
      return a.expectedRemaining < b.expectedRemaining;
    }
    if (Math.abs(a.entropy - b.entropy) > 1e-9) return a.entropy > b.entropy;
  } else {
    if (Math.abs(a.expectedRemaining - b.expectedRemaining) > 1e-6) {
      return a.expectedRemaining < b.expectedRemaining;
    }
    if (Math.abs(a.entropy - b.entropy) > 1e-9) return a.entropy > b.entropy;
    if (a.worstBucket !== b.worstBucket) return a.worstBucket < b.worstBucket;
  }
  if (a.bucketCount !== b.bucketCount) return a.bucketCount > b.bucketCount;
  return a.isCandidate && !b.isCandidate;
}

function pickBestGuess(
  probePool: number[][],
  candidates: number[][],
): number[] {
  const candidateKeys = new Set(candidates.map(codeKey));
  const minimaxMode = candidates.length <= MINIMAX_THRESHOLD;

  let bestGuess = probePool[0];
  let bestScore = scoreGuess(bestGuess, candidates, candidateKeys);

  for (let i = 1; i < probePool.length; i++) {
    const guess = probePool[i];
    const score = scoreGuess(guess, candidates, candidateKeys);
    if (isBetterScore(score, bestScore, minimaxMode)) {
      bestGuess = guess;
      bestScore = score;
    }
  }

  return [...bestGuess];
}

function buildProbePool(candidates: number[][]): number[][] {
  if (candidates.length <= 1) {
    return candidates.length === 1 ? [[...candidates[0]]] : [[...OPENING_GUESS]];
  }
  if (candidates.length === 2) {
    return candidates.map((c) => [...c]);
  }
  if (candidates.length <= FULL_PROBE_THRESHOLD) {
    return allSecretCodes();
  }

  const cap = Math.min(LARGE_POOL_PROBE_CAP, candidates.length);
  const probes: number[][] = [];
  for (let i = 0; i < cap; i++) {
    const idx = Math.floor((i * candidates.length) / cap);
    probes.push([...candidates[idx]]);
  }
  return probes;
}

/** Cipher's next guess given guess history against the human's secret code. */
export function pickCipherGuess(possible: number[][], turnIndex: number): number[] {
  if (possible.length === 0) return [...OPENING_GUESS];
  if (possible.length === 1) return [...possible[0]];

  if (turnIndex === 0) return [...OPENING_GUESS];

  return pickBestGuess(buildProbePool(possible), possible);
}

export function cipherNextGuess(history: CipherHistory): number[] {
  const possible = getPossibleCodes(history);
  return pickCipherGuess(possible, history.length);
}

/** Uniform random secret code for Cipher matches. */
export function generateCipherSecretCode(): number[] {
  return Array.from({ length: CODE_LENGTH }, () => Math.floor(Math.random() * 10));
}
