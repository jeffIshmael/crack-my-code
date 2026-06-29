import { cipherNextGuess, type CipherHistory } from './cipher';

let worker: Worker | null = null;
let pendingGuess: { key: string; promise: Promise<number[]> } | null = null;

function historyKey(history: CipherHistory): string {
  return history.map((h) => `${h.digits.join('')}:${h.clues.join('')}`).join('|');
}

function getCipherWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./cipher.worker.ts', import.meta.url));
  }
  return worker;
}

/** Eagerly spin up the worker when an AI match starts. */
export function warmCipherWorker(): void {
  if (typeof window === 'undefined') return;
  getCipherWorker();
}

/**
 * Start computing Cipher's next guess while the player is thinking.
 * Call after Cipher commits a guess so the result is ready before the next handoff.
 */
export function prefetchCipherGuess(history: CipherHistory): void {
  if (typeof window === 'undefined') return;
  if (history.length === 0) return;

  const key = historyKey(history);
  if (pendingGuess?.key === key) return;

  warmCipherWorker();
  pendingGuess = { key, promise: runCipherGuess(history) };
}

function runCipherGuess(history: CipherHistory): Promise<number[]> {
  if (typeof window === 'undefined') {
    return Promise.resolve(cipherNextGuess(history));
  }

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

/** Run Cipher AI off the main thread so MiniPay stays responsive. */
export function cipherNextGuessAsync(history: CipherHistory): Promise<number[]> {
  const key = historyKey(history);
  if (pendingGuess?.key === key) {
    const cached = pendingGuess.promise;
    pendingGuess = null;
    return cached;
  }
  return runCipherGuess(history);
}
