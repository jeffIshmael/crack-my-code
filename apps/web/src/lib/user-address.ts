import { prisma } from '@/lib/prisma';
import { isGuestAddress } from '@/lib/guest';

/** Canonical wallet format: lowercase hex (matches game player addresses). */
export function normalizeWalletAddress(address: string): string {
  return address.toLowerCase();
}

export function findUserByAddressWhere(address: string) {
  const normalized = normalizeWalletAddress(address);
  return {
    OR: [
      { address: { equals: normalized, mode: 'insensitive' as const } },
      { smartWalletAddress: { equals: normalized, mode: 'insensitive' as const } },
    ],
  };
}

export async function findUserByAddress(address: string) {
  return prisma.user.findFirst({
    where: findUserByAddressWhere(address),
  });
}

/** Find or create a registered player; merges duplicates if both EOA and smart wallet rows exist. */
export async function ensureRegisteredUser(
  address: string,
  smartWalletAddress?: string | null,
) {
  const normalized = normalizeWalletAddress(address);
  const normalizedSmart = smartWalletAddress
    ? normalizeWalletAddress(smartWalletAddress)
    : undefined;

  if (isGuestAddress(normalized)) {
    throw new Error('Guest accounts cannot be registered as players');
  }

  // Find all rows that match either the primary or smart wallet address
  const candidates = await prisma.user.findMany({
    where: {
      OR: [
        { address: { equals: normalized, mode: 'insensitive' } },
        { smartWalletAddress: { equals: normalized, mode: 'insensitive' } },
        ...(normalizedSmart
          ? [
              { address: { equals: normalizedSmart, mode: 'insensitive' as const } },
              { smartWalletAddress: { equals: normalizedSmart, mode: 'insensitive' as const } },
            ]
          : []),
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  const canonicalAddress = normalizedSmart || normalized;

  if (candidates.length > 1) {
    // Merge: keep the oldest row, take the highest points, delete the rest
    const primary = candidates[0]!;
    const maxPoints = Math.max(...candidates.map((c) => c.points ?? 1000));

    // Move games from duplicate rows to the primary
    const dupeIds = candidates.slice(1).map((c) => c.id);
    await prisma.game.updateMany({
      where: { userId: { in: dupeIds } },
      data: { userId: primary.id },
    });
    // Delete duplicate user rows
    await prisma.user.deleteMany({ where: { id: { in: dupeIds } } });

    return prisma.user.update({
      where: { id: primary.id },
      data: {
        address: canonicalAddress,
        smartWalletAddress: normalizedSmart ?? primary.smartWalletAddress,
        points: maxPoints,
      },
    });
  }

  if (candidates.length === 1) {
    const existing = candidates[0]!;
    const updates: { address?: string; smartWalletAddress?: string } = {};
    if (existing.address !== canonicalAddress) updates.address = canonicalAddress;
    if (normalizedSmart && existing.smartWalletAddress !== normalizedSmart) {
      updates.smartWalletAddress = normalizedSmart;
    }
    if (Object.keys(updates).length > 0) {
      return prisma.user.update({
        where: { id: existing.id },
        data: updates,
      });
    }
    return existing;
  }

  return prisma.user.create({
    data: {
      address: canonicalAddress,
      smartWalletAddress: normalizedSmart,
      name: `Player_${canonicalAddress.slice(2, 6)}`,
      points: 1000,
    },
  });
}

/** Shared GUEST row for unsigned-in AI play. */
export async function ensureGuestUser() {
  return prisma.user.upsert({
    where: { address: 'GUEST' },
    update: {},
    create: {
      address: 'GUEST',
      name: 'Anonymous Guest',
      points: 1000,
    },
  });
}
