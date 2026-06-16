import { prisma } from '@/lib/prisma';
import { isGuestAddress, isRegisteredPlayer } from '@/lib/guest';

/**
 * CMC score is stored in User.points. User.rating is kept in sync as a
 * leaderboard tiebreaker only. Legacy rows may have rating >> points because
 * points defaulted to 0 while wins accrued into rating.
 */
export function reconcileLegacyPoints(user: {
  points: number | null;
  rating: number | null;
}): number {
  const points = user.points ?? 0;
  const rating = user.rating ?? 1000;
  if (points < rating) return rating;
  return points;
}

export async function ensureUserPointsSynced(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.address || isGuestAddress(user.address)) return user;

  const reconciled = reconcileLegacyPoints(user);
  if (reconciled === user.points && user.rating === reconciled) return user;

  return prisma.user.update({
    where: { id: userId },
    data: { points: reconciled, rating: reconciled },
  });
}

export async function applyScoreDelta(
  address: string,
  deltas: { rating: number; points: number },
) {
  if (!isRegisteredPlayer(address)) return;
  const delta = deltas.points;
  if (delta === 0) return;

  const user = await prisma.user.findFirst({
    where: { address: { equals: address, mode: 'insensitive' } },
  });
  if (!user || !user.address || isGuestAddress(user.address)) return;

  const synced = await ensureUserPointsSynced(user.id);
  if (!synced) return;

  const currentPoints = reconcileLegacyPoints(synced);
  const newPoints = Math.max(0, currentPoints + delta);

  await prisma.user.update({
    where: { id: synced.id },
    data: {
      points: newPoints,
      rating: newPoints,
    },
  });
}
