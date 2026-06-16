/** Shared CMC point deltas — keep server and client in sync. */
export const SCORE = {
  /** Cipher AI: +10 CMC on win, no change on loss. */
  ai: { win: 10, loss: 0 },
  /** PvP: winner +15, loser −15 (transferred from loser to winner). */
  pvp: { win: 15, loss: -15 },
} as const;

export function scoreDeltaForMode(mode: 'ai' | 'fun' | 'cash', won: boolean): number {
  const bucket = mode === 'ai' ? SCORE.ai : SCORE.pvp;
  return won ? bucket.win : bucket.loss;
}

/** Human-readable summary for UI copy. */
export const SCORE_COPY = {
  aiWin: '+10 CMC',
  aiLoss: 'No change',
  pvpWin: '+15 CMC',
  pvpLoss: '−15 CMC',
} as const;
