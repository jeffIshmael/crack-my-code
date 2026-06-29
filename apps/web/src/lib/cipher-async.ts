import { cipherNextGuess, type CipherHistory } from './cipher';
import { isLikelyMiniPayHost } from './minipay-host';

let worker: Worker | null = null;
let pendingGuess: { key: string; promise: Promise<number[]> } | null = null;

function historyKey(history: CipherHistory): string {
  return history.map((h) => `${h.digits.join('')}:${h.clues.join('')}`).join('|');
}

function canUseCipherWorker(): boolean {
  if (typeof window === 'undefined') return false;
  // MiniPay WebViews often block or break module Workers — run inline instead.
  if (isLikelyMiniPayHost()) return false;
  return typeof Worker !== 'undefined';
}

function getCipherWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./cipher.worker.ts', import.meta.url));
  }
  return worker;
}

/** Eagerly spin up the worker when an AI match starts (desktop / Farcaster only). */
export function warmCipherWorker(): void {
  if (!canUseCipherWorker()) return;
  getCipherWorker();
}

/**
 * Start computing Cipher's next guess while the player is thinking.
 */
export function prefetchCipherGuess(history: CipherHistory): void {
  if (typeof window === 'undefined') return;
  if (history.length === 0) return;

  const key = historyKey(history);
  if (pendingGuess?.key === key) return;

  pendingGuess = { key, promise: runCipherGuess(history) };
}

function runCipherGuessInline(history: CipherHistory): Promise<number[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(cipherNextGuess(history)), 0);
  });
}

function runCipherGuessWorker(history: CipherHistory): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const w = getCipherWorker();

    const onMessage = (event: MessageEvent<number[]>) => {
      cleanup();
      resolve(event.data);
    };

    const onError = (event: ErrorEvent) => {
      cleanup();
      reject(event.error ?? new Error(event.message || 'Cipher worker failed'));
    };

    const cleanup = () => {
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
    };

    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    w.postMessage({ history });
  });
}

function runCipherGuess(history: CipherHistory): Promise<number[]> {
  if (typeof window === 'undefined') {
    return Promise.resolve(cipherNextGuess(history));
  }
  if (!canUseCipherWorker()) {
    return runCipherGuessInline(history);
  }
  return runCipherGuessWorker(history).catch(() => runCipherGuessInline(history));
}

/** Run Cipher AI off the main thread when supported; MiniPay uses a fast inline path. */
export function cipherNextGuessAsync(history: CipherHistory): Promise<number[]> {
  const key = historyKey(history);
  if (pendingGuess?.key === key) {
    const cached = pendingGuess.promise;
    pendingGuess = null;
    return cached;
  }
  return runCipherGuess(history);
}
