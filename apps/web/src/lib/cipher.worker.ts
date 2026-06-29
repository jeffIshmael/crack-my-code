import { cipherNextGuess, type CipherHistory } from './cipher';

self.onmessage = (event: MessageEvent<{ history: CipherHistory }>) => {
  const guess = cipherNextGuess(event.data.history);
  self.postMessage(guess);
};
