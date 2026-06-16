import { prisma } from '@/lib/prisma';
import { isGuestAddress, isRegisteredPlayer } from '@/lib/guest';

/** CMC score lives in User.points only. */
export async function applyScoreDelta(address: string, delta: number) {
  if (!isRegisteredPlayer(address) || delta === 0) return;

  const user = await prisma.user.findFirst({
    where: { address: { equals: address, mode: 'insensitive' } },
  });
  if (!user || !user.address || isGuestAddress(user.address)) return;

  const currentPoints = user.points ?? 1000;
  const newPoints = Math.max(0, currentPoints + delta);

  await prisma.user.update({
    where: { id: user.id },
    data: { points: newPoints },
  });
}
