import { GAME_DURATION } from '@/lib/game';

/** Seconds allowed per PvP turn (matches GAME_DURATION). */
export const TURN_SECONDS = GAME_DURATION;

/** Extra ms after deadline before claim-timeout succeeds (network grace). */
export const TURN_GRACE_MS = 4_000;

export function nextTurnDeadline(from: Date = new Date()): Date {
  return new Date(from.getTime() + TURN_SECONDS * 1000);
}

export function isTurnDeadlineClaimable(
  turnDeadlineAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!turnDeadlineAt) return false;
  const deadline =
    turnDeadlineAt instanceof Date ? turnDeadlineAt : new Date(turnDeadlineAt);
  if (Number.isNaN(deadline.getTime())) return false;
  return now.getTime() >= deadline.getTime() + TURN_GRACE_MS;
}
