/** Shared CMC / rating deltas — keep server and client in sync. */
export const SCORE = {
  /** Cipher AI: +10 CMC on win, no change on loss. */
  ai: { win: { rating: 10, points: 10 }, loss: { rating: 0, points: 0 } },
  /** PvP: winner +15, loser −15 (transferred from loser to winner). */
  pvp: { win: { rating: 15, points: 15 }, loss: { rating: -15, points: -15 } },
} as const;

export function scoreDeltaForMode(mode: 'ai' | 'fun' | 'cash', won: boolean) {
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
