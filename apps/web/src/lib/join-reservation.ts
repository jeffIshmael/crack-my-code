/** Soft lock while a joiner signs approve + joinChallenge (seconds). */
export const JOIN_RESERVATION_TTL_SECONDS = 45;

export const MATCH_EXPIRY_SECONDS = 300;

export function isJoinReservationActive(
  joinReservedBy: string | null | undefined,
  joinReservedUntil: Date | null | undefined,
  joinerAddress: string,
  now = Date.now(),
): boolean {
  if (!joinReservedBy || !joinReservedUntil) return false;
  if (joinReservedBy.toLowerCase() === joinerAddress.toLowerCase()) return false;
  return joinReservedUntil.getTime() > now;
}

export function gameMatchExpiryMs(createdAt: Date, now = Date.now()): number {
  return createdAt.getTime() + MATCH_EXPIRY_SECONDS * 1000 - now;
}

export function isGameJoinableByTime(createdAt: Date, now = Date.now()): boolean {
  return gameMatchExpiryMs(createdAt, now) > 0;
}
