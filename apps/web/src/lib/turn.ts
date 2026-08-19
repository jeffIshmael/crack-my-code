/** Guess.isPlayer in the DB marks player1 vs player2 (not "local player"). */

import { MAX_GUESSES } from './game';

export function getNextTurnAddress(
  player1Address: string,
  player2Address: string | null | undefined,
  p1GuessCount: number,
  p2GuessCount: number,
): string | null {
  if (!player2Address) return player1Address.toLowerCase();

  const p1Exhausted = p1GuessCount >= MAX_GUESSES;
  const p2Exhausted = p2GuessCount >= MAX_GUESSES;

  if (p1Exhausted && !p2Exhausted) return player2Address.toLowerCase();
  if (p2Exhausted && !p1Exhausted) return player1Address.toLowerCase();
  if (p1Exhausted && p2Exhausted) return null;

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
