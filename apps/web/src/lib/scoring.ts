/** Shared CMC / rating deltas — keep server and client in sync. */
export const SCORE = {
  ai: { win: { rating: 10, points: 20 }, loss: { rating: -5, points: -10 } },
  pvp: { win: { rating: 25, points: 25 }, loss: { rating: -15, points: -15 } },
} as const;

export function scoreDeltaForMode(mode: 'ai' | 'fun' | 'cash', won: boolean) {
  const bucket = mode === 'ai' ? SCORE.ai : SCORE.pvp;
  return won ? bucket.win : bucket.loss;
}
