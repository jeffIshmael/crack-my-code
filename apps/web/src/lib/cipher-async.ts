import { cipherNextGuess, type CipherHistory } from './cipher';

let worker: Worker | null = null;

function getCipherWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./cipher.worker.ts', import.meta.url));
  }
  return worker;
}

/** Run Cipher AI off the main thread so MiniPay stays responsive. */
export function cipherNextGuessAsync(history: CipherHistory): Promise<number[]> {
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
