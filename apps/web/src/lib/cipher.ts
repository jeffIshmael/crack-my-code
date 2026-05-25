/**
 * Cipher AI — competitive code-cracking opponent for Crack My Code.
 * See apps/web/docs/cipher-ai-strategy.md and apps/web/docs/claude-updates.md.
 *
 * Upgrades: full 10⁴ probe search when ≤500 candidates remain, candidate-preference
 * tiebreak, curated duplicate probes (no strided sampling).
 */

import {
  CODE_LENGTH,
  type Clue,
  type GuessEntry,
  evaluateGuess,
  allSecretCodes,
} from './game';

export type CipherHistory = Pick<GuessEntry, 'digits' | 'clues'>[];

const OPENING_GUESSES: number[][] = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
];

const DUPLICATE_PROBES: number[][] = [
  [0, 0, 1, 1],
  [2, 2, 3, 3],
  [4, 4, 5, 5],
  [6, 6, 7, 7],
  [8, 8, 9, 9],
  [0, 0, 2, 2],
  [1, 1, 3, 3],
  [0, 0, 9, 9],
  [1, 1, 8, 8],
  [3, 3, 4, 4],
  [0, 0, 0, 0],
  [1, 1, 1, 1],
  [2, 2, 2, 2],
  [3, 3, 3, 3],
  [5, 5, 5, 5],
  [0, 1, 0, 1],
  [1, 2, 1, 2],
  [2, 3, 2, 3],
  [3, 4, 3, 4],
];

/** When ≤ this many candidates remain, score all 10⁴ codes as probes. */
const FULL_SEARCH_THRESHOLD = 500;

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

  for (const count of buckets.values()) {
    const p = count / n;
    entropy -= p * Math.log2(p);
    if (count > worstBucket) worstBucket = count;
  }

  return {
    entropy,
    worstBucket,
    bucketCount: buckets.size,
    isCandidate: candidateKeys.has(codeKey(guess)),
  };
}

function isBetterScore(a: GuessScore, b: GuessScore): boolean {
  if (Math.abs(a.entropy - b.entropy) > 1e-9) return a.entropy > b.entropy;
  if (a.worstBucket !== b.worstBucket) return a.worstBucket < b.worstBucket;
  if (a.bucketCount !== b.bucketCount) return a.bucketCount > b.bucketCount;
  return a.isCandidate && !b.isCandidate;
}

function buildProbePool(possible: number[][], all: number[][]): number[][] {
  if (possible.length <= 2) return possible.map((c) => [...c]);
  if (possible.length <= FULL_SEARCH_THRESHOLD) return all;
  const seen = new Set<string>();
  const probes: number[][] = [];
  const add = (code: number[]) => {
    const key = codeKey(code);
    if (seen.has(key)) return;
    seen.add(key);
    probes.push([...code]);
  };
  for (const c of possible) add(c);
  for (const p of DUPLICATE_PROBES) add(p);
  return probes;
}

function pickBestGuess(probePool: number[][], candidates: number[][]): number[] {
  const candidateKeys = new Set(candidates.map(codeKey));
  let bestGuess = probePool[0];
  let bestScore = scoreGuess(bestGuess, candidates, candidateKeys);

  for (let i = 1; i < probePool.length; i++) {
    const guess = probePool[i];
    const score = scoreGuess(guess, candidates, candidateKeys);
    if (isBetterScore(score, bestScore)) {
      bestGuess = guess;
      bestScore = score;
    }
  }

  return [...bestGuess];
}

/** Cipher's next guess given guess history against the human's secret code. */
export function pickCipherGuess(possible: number[][], turnIndex: number): number[] {
  if (possible.length === 0) return [...OPENING_GUESSES[0]];
  if (possible.length === 1) return [...possible[0]];

  if (turnIndex === 0) return [...OPENING_GUESSES[0]];
  if (turnIndex === 1) return [...OPENING_GUESSES[1]];

  const all = allSecretCodes();
  const probePool = buildProbePool(possible, all);
  return pickBestGuess(probePool, possible);
}

export function cipherNextGuess(history: CipherHistory): number[] {
  const possible = getPossibleCodes(history);
  return pickCipherGuess(possible, history.length);
}
