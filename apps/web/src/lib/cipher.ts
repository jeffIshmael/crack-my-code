/**
 * Cipher AI — competitive code-cracking opponent for Crack My Code.
 *
 * Solver: constraint elimination + full 10⁴ probe search (entropy / expected
 * pool reduction; minimax when ≤50 candidates). Opening: fixed `0123`, then
 * dynamic optimal second guess and beyond.
 *
 * Defense: `generateCipherSecretCode()` prefers duplicate-heavy codes and
 * digits outside the opening probe (8/9).
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

/** Cipher's next guess given guess history against the human's secret code. */
export function pickCipherGuess(possible: number[][], turnIndex: number): number[] {
  if (possible.length === 0) return [...OPENING_GUESS];
  if (possible.length === 1) return [...possible[0]];

  if (turnIndex === 0) return [...OPENING_GUESS];

  return pickBestGuess(allSecretCodes(), possible);
}

export function cipherNextGuess(history: CipherHistory): number[] {
  const possible = getPossibleCodes(history);
  return pickCipherGuess(possible, history.length);
}

// ─── Cipher defense (secret code generation) ───────────────────────────────

function countColorHits(guess: number[], secret: number[]): number {
  return evaluateGuess(guess, secret).filter((c) => c !== 'gray').length;
}

function duplicateScore(code: number[]): number {
  const freq = new Map<number, number>();
  for (const d of code) freq.set(d, (freq.get(d) || 0) + 1);
  let score = 0;
  for (const n of freq.values()) {
    if (n >= 2) score += n * n;
  }
  return score;
}

function isTrivialCode(code: number[]): boolean {
  const key = codeKey(code);
  if (/^(\d)\1{3}$/.test(key)) return true;
  if (key === '0123' || key === '1234' || key === '3210') return true;
  return false;
}

function defenseScore(code: number[]): number {
  if (isTrivialCode(code)) return -1;

  const openingHits = countColorHits(OPENING_GUESS, code);
  const dups = duplicateScore(code);
  const eightNineCount = code.filter((d) => d >= 8).length;
  const onlyHighDigits = code.every((d) => d >= 6);

  let score = 0;
  score += (4 - openingHits) * 12;
  score += dups * 4;
  score += eightNineCount * 5;
  if (onlyHighDigits) score += 6;

  return score;
}

/**
 * Generate a secret code for Cipher that is harder to crack than uniform random:
 * duplicate digits, digits outside the `0123` opening, and 8/9 heavy patterns.
 */
export function generateCipherSecretCode(): number[] {
  const pool = allSecretCodes();
  const scored: { code: number[]; score: number }[] = [];

  for (const code of pool) {
    const score = defenseScore(code);
    if (score >= 0) scored.push({ code, score });
  }

  scored.sort((a, b) => b.score - a.score);

  const topCount = Math.max(1, Math.floor(scored.length * 0.12));
  const tier = scored.slice(0, topCount);
  const maxScore = tier[0]?.score ?? 0;
  const minTierScore = tier[tier.length - 1]?.score ?? 0;
  const span = Math.max(1, maxScore - minTierScore);

  let roll = Math.random() * tier.reduce((sum, { score }) => sum + (score - minTierScore + 1), 0);
  for (const { code, score } of tier) {
    roll -= score - minTierScore + 1;
    if (roll <= 0) return [...code];
  }

  return [...tier[tier.length - 1].code];
}
