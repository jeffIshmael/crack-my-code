import type { Game } from '@prisma/client';
import {
  isGameJoinableByTime,
  isJoinReservationActive,
} from '@/lib/join-reservation';

export type OpenChallengeSummary = {
  gameId: string;
  hostAddress: string;
  stake: number;
  onChainMatchId: string | null;
  createdAt: string;
  expiresAt: string;
};

type JoinableGame = Pick<
  Game,
  | 'status'
  | 'mode'
  | 'isPublic'
  | 'player2Address'
  | 'player1Address'
  | 'createdAt'
  | 'joinReservedBy'
  | 'joinReservedUntil'
  | 'onChainMatchId'
>;

export function isJoinableChallenge(
  game: JoinableGame,
  viewerAddress?: string,
  options?: { mode?: 'fun' | 'cash'; publicOnly?: boolean; requireOnChain?: boolean },
  now = Date.now(),
): boolean {
  const mode = options?.mode ?? (game.mode as 'fun' | 'cash');
  const requireOnChain = options?.requireOnChain ?? true;

  if (game.status !== 'PENDING') return false;
  if (game.mode !== mode) return false;
  if (options?.publicOnly && !game.isPublic) return false;
  if (game.player2Address) return false;
  if (requireOnChain && !game.onChainMatchId) return false;
  if (!isGameJoinableByTime(game.createdAt, now)) return false;
  if (
    viewerAddress &&
    isJoinReservationActive(game.joinReservedBy, game.joinReservedUntil, viewerAddress, now)
  ) {
    return false;
  }
  if (
    viewerAddress &&
    game.player1Address.toLowerCase() === viewerAddress.toLowerCase()
  ) {
    return false;
  }
  return true;
}

export function isJoinableCashChallenge(
  game: JoinableGame,
  viewerAddress?: string,
  options?: { publicOnly?: boolean },
  now = Date.now(),
): boolean {
  return isJoinableChallenge(game, viewerAddress, { mode: 'cash', ...options }, now);
}

export function isJoinableFunChallenge(
  game: JoinableGame,
  viewerAddress?: string,
  options?: { publicOnly?: boolean },
  now = Date.now(),
): boolean {
  return isJoinableChallenge(game, viewerAddress, { mode: 'fun', ...options }, now);
}

export function isJoinableOpenChallenge(
  game: JoinableGame,
  viewerAddress?: string,
  now = Date.now(),
): boolean {
  return isJoinableCashChallenge(game, viewerAddress, { publicOnly: true }, now);
}

export function toOpenChallengeSummary(game: Game): OpenChallengeSummary {
  const expiresAt = new Date(game.createdAt.getTime() + 300 * 1000);
  return {
    gameId: game.id,
    hostAddress: game.player1Address,
    stake: game.stake,
    onChainMatchId: game.onChainMatchId,
    createdAt: game.createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}
