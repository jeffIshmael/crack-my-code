import { prisma } from '@/lib/prisma';
import { isGuestAddress, isRegisteredPlayer } from '@/lib/guest';
import { findUserByAddress, normalizeWalletAddress } from '@/lib/user-address';

/** CMC score lives in User.points only. */
export async function applyScoreDelta(address: string, delta: number) {
  if (!isRegisteredPlayer(address) || delta === 0) return;

  const normalized = normalizeWalletAddress(address);
  const user = await findUserByAddress(normalized);
  if (!user || !user.address || isGuestAddress(user.address)) return;

  const currentPoints = user.points ?? 1000;
  const newPoints = Math.max(0, currentPoints + delta);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      points: newPoints,
      ...(user.address !== normalized ? { address: normalized } : {}),
    },
  });
}
