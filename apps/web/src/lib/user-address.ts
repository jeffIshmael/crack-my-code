import { prisma } from '@/lib/prisma';
import { isGuestAddress } from '@/lib/guest';

/** Canonical wallet format: lowercase hex (matches game player addresses). */
export function normalizeWalletAddress(address: string): string {
  return address.toLowerCase();
}

export function findUserByAddressWhere(address: string) {
  const normalized = normalizeWalletAddress(address);
  return {
    address: { equals: normalized, mode: 'insensitive' as const },
  };
}

export async function findUserByAddress(address: string) {
  return prisma.user.findFirst({
    where: findUserByAddressWhere(address),
  });
}

/** Find or create a registered player; always stores lowercase address. */
export async function ensureRegisteredUser(address: string) {
  const normalized = normalizeWalletAddress(address);

  if (isGuestAddress(normalized)) {
    throw new Error('Guest accounts cannot be registered as players');
  }

  const existing = await findUserByAddress(normalized);
  if (existing) {
    if (existing.address !== normalized) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { address: normalized },
      });
    }
    return existing;
  }

  return prisma.user.create({
    data: {
      address: normalized,
      name: `Player_${normalized.slice(2, 6)}`,
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
