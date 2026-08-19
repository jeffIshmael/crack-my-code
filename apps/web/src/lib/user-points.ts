import { prisma } from '@/lib/prisma';
import { isGuestAddress, isRegisteredPlayer } from '@/lib/guest';
import { ensureRegisteredUser, findUserByAddress, normalizeWalletAddress } from '@/lib/user-address';

/** CMC score lives in User.points only. */
export async function applyScoreDelta(address: string, delta: number) {
  if (!isRegisteredPlayer(address) || delta === 0) return;

  const normalized = normalizeWalletAddress(address);
  let user = await findUserByAddress(normalized);
  if (!user || !user.address || isGuestAddress(user.address)) {
    // If we can't resolve an existing player row for this address alias,
    // create/normalize it so scoring never "silently" fails.
    user = await ensureRegisteredUser(normalized);
  }

  const currentPoints = user?.points ?? 1000;
  const newPoints = Math.max(0, currentPoints + delta);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      points: newPoints,
      ...(user.address !== normalized ? { address: normalized } : {}),
    },
  });
}
