/** Guess.isPlayer in the DB marks player1 vs player2 (not "local player"). */

export function getNextTurnAddress(
  player1Address: string,
  player2Address: string | null | undefined,
  p1GuessCount: number,
  p2GuessCount: number,
): string | null {
  if (!player2Address) return player1Address.toLowerCase();
  if (p1GuessCount <= p2GuessCount) return player1Address.toLowerCase();
  return player2Address.toLowerCase();
}

export function isPlayersTurn(
  playerAddress: string,
  player1Address: string,
  player2Address: string | null | undefined,
  p1GuessCount: number,
  p2GuessCount: number,
): boolean {
  const next = getNextTurnAddress(
    player1Address,
    player2Address,
    p1GuessCount,
    p2GuessCount,
  );
  return next === playerAddress.toLowerCase();
}
