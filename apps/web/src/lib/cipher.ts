/**
 * Cipher AI — competitive code-cracking opponent for Crack My Code.
 *
 * Solver: constraint elimination + full 10⁴ probe search (entropy / expected
 * pool reduction; minimax when ≤50 candidates). Opening: fixed `0123`, then
 * dynamic optimal guesses from the full space.
 *
 * Defense: `generateCipherSecretCode()` picks all-unique codes or exactly one
 * digit repeated twice with two other distinct digits (e.g. `8786`). No double-
 * pairs (`1122`) or triples (`1112`).
 */

import {
  CODE_LENGTH,
  type Clue,
  type GuessEntry,
  evaluateGuess,
  allSecretCodes,
} from './game';
import { shouldUseMiniPayCipherFastPath } from './minipay-host';

export type CipherHistory = Pick<GuessEntry, 'digits' | 'clues'>[];

/** First guess only — four unique digits for maximum initial coverage. */
const OPENING_GUESS: number[] = [0, 1, 2, 3];

/** Prefer minimax (worst-case bucket) when the pool is this small. */
const MINIMAX_THRESHOLD = 50;

/** Score every code as a probe when the candidate pool is at most this size. */
const FULL_PROBE_THRESHOLD = 500;

/** When the pool is larger, sample this many candidate probes (fast on mobile). */
const LARGE_POOL_PROBE_CAP = 200;

const MINIPAY_FULL_PROBE_THRESHOLD = 80;
const MINIPAY_PROBE_CAP = 40;

/** Chance Cipher picks a strong-but-not-best guess (human imperfection). */
const HUMAN_JITTER_CHANCE = 0.22;

export type DuplicateProfile = 'none' | 'one';

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

function digitsStillPossible(candidates: number[][]): Set<number> {
  const live = new Set<number>();
  for (const code of candidates) {
    for (const d of code) live.add(d);
  }
  return live;
}

/** Drop probe guesses that reuse digits ruled out by earlier gray feedback. */
function filterHumanPlausibleProbes(
  probes: number[][],
  candidates: number[][],
): number[][] {
  const live = digitsStillPossible(candidates);
  const filtered = probes.filter((guess) => guess.every((d) => live.has(d)));
  return filtered.length > 0 ? filtered : probes;
}

interface RankedGuess {
  guess: number[];
  score: GuessScore;
}

function rankGuesses(
  probePool: number[][],
  candidates: number[][],
): RankedGuess[] {
  const candidateKeys = new Set(candidates.map(codeKey));
  const minimaxMode = candidates.length <= MINIMAX_THRESHOLD;

  const ranked: RankedGuess[] = probePool.map((guess) => ({
    guess,
    score: scoreGuess(guess, candidates, candidateKeys),
  }));

  ranked.sort((a, b) => {
    if (isBetterScore(a.score, b.score, minimaxMode)) return -1;
    if (isBetterScore(b.score, a.score, minimaxMode)) return 1;
    return 0;
  });

  return ranked;
}

function pickBestGuess(
  probePool: number[][],
  candidates: number[][],
): number[] {
  const ranked = rankGuesses(probePool, candidates);
  if (ranked.length === 0) return [...OPENING_GUESS];

  if (ranked.length > 1 && Math.random() < HUMAN_JITTER_CHANCE) {
    const pick = ranked[Math.floor(Math.random() * Math.min(3, ranked.length))];
    return [...pick.guess];
  }

  return [...ranked[0].guess];
}

function buildProbePool(candidates: number[][]): number[][] {
  const mobile = shouldUseMiniPayCipherFastPath();
  const fullThreshold = mobile ? MINIPAY_FULL_PROBE_THRESHOLD : FULL_PROBE_THRESHOLD;
  const probeCap = mobile ? MINIPAY_PROBE_CAP : LARGE_POOL_PROBE_CAP;

  if (candidates.length <= 1) {
    return candidates.length === 1 ? [[...candidates[0]]] : [[...OPENING_GUESS]];
  }
  if (candidates.length === 2) {
    return candidates.map((c) => [...c]);
  }
  if (candidates.length <= fullThreshold) {
    if (mobile) {
      return sampleCandidates(candidates, probeCap);
    }
    return allSecretCodes();
  }

  return sampleCandidates(candidates, probeCap);
}

function sampleCandidates(candidates: number[][], cap: number): number[][] {
  const limit = Math.min(cap, candidates.length);
  const probes: number[][] = [];
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor((i * candidates.length) / limit);
    probes.push([...candidates[idx]]);
  }
  return probes;
}

/** Cipher's next guess given guess history against the human's secret code. */
export function pickCipherGuess(possible: number[][], turnIndex: number): number[] {
  if (possible.length === 0) return [...OPENING_GUESS];
  if (possible.length === 1) return [...possible[0]];

  if (turnIndex === 0) return [...OPENING_GUESS];

  const probes = filterHumanPlausibleProbes(buildProbePool(possible), possible);
  return pickBestGuess(probes, possible);
}

export function cipherNextGuess(history: CipherHistory): number[] {
  const possible = getPossibleCodes(history);
  return pickCipherGuess(possible, history.length);
}

// ─── Cipher defense (secret code generation) ───────────────────────────────

function isTrivialCode(code: number[]): boolean {
  const key = codeKey(code);
  if (/^(\d)\1{3}$/.test(key)) return true;
  if (key === '0123' || key === '1234' || key === '3210') return true;
  return false;
}

/** Exactly one digit appears twice; anything else (double-pair, triple) is excluded. */
export function duplicateProfile(code: number[]): DuplicateProfile {
  const counts = [...new Set(code)].map((d) => code.filter((x) => x === d).length);
  const repeated = counts.filter((n) => n >= 2);
  if (repeated.length === 0) return 'none';
  if (repeated.length === 1 && repeated[0] === 2) return 'one';
  return 'none';
}

function isValidCipherSecret(code: number[]): boolean {
  if (isTrivialCode(code)) return false;
  const counts = [...new Set(code)].map((d) => code.filter((x) => x === d).length);
  const repeated = counts.filter((n) => n >= 2);
  if (repeated.length === 0) return true;
  return repeated.length === 1 && repeated[0] === 2;
}

const SECRET_CODE_PROFILES: DuplicateProfile[] = ['none', 'one'];

function shuffleDigits<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickDistinctDigits(count: number, exclude = new Set<number>()): number[] {
  const pool = Array.from({ length: 10 }, (_, d) => d).filter((d) => !exclude.has(d));
  return shuffleDigits(pool).slice(0, count);
}

/** Build a code by shuffling digit slots — the single repeat need not be adjacent. */
function buildRandomCodeForProfile(profile: DuplicateProfile): number[] {
  if (profile === 'none') {
    return pickDistinctDigits(CODE_LENGTH);
  }

  const repeated = Math.floor(Math.random() * 10);
  const others = pickDistinctDigits(2, new Set([repeated]));
  return shuffleDigits([repeated, repeated, others[0], others[1]]);
}

/**
 * Pick a Cipher secret: all-unique, or one digit twice plus two random others.
 * Repeats can sit anywhere (`8786` and `8876` both valid).
 */
export function generateCipherSecretCode(): number[] {
  for (let attempt = 0; attempt < 50; attempt++) {
    const profile = SECRET_CODE_PROFILES[Math.floor(Math.random() * SECRET_CODE_PROFILES.length)];
    const code = buildRandomCodeForProfile(profile);
    if (isValidCipherSecret(code)) return [...code];
  }

  const fallback = allSecretCodes().filter(isValidCipherSecret);
  return [...fallback[Math.floor(Math.random() * fallback.length)]];
}
