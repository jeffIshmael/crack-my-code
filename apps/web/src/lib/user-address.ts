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

/** Find or create a registered player; always stores lowercase address. */
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

  const existing = await findUserByAddress(normalized);
  if (existing) {
    const updates: { address?: string; smartWalletAddress?: string } = {};
    if (existing.address !== normalized && !normalizedSmart) updates.address = normalized;
    if (normalizedSmart && existing.smartWalletAddress !== normalizedSmart) {
      updates.smartWalletAddress = normalizedSmart;
    }
    if (normalizedSmart && existing.address !== normalizedSmart) {
      updates.address = normalizedSmart;
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
      address: normalizedSmart || normalized,
      smartWalletAddress: normalizedSmart,
      name: `Player_${(normalizedSmart || normalized).slice(2, 6)}`,
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
