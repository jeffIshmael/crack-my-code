/** Shared placeholder address for unsigned-in AI play. Never ranked or scored. */
export const GUEST_ADDRESS = 'GUEST';

export function isGuestAddress(address?: string | null): boolean {
  if (!address) return false;
  return address.toLowerCase() === GUEST_ADDRESS.toLowerCase();
}

export function isRegisteredPlayer(address?: string | null): boolean {
  return !!address && !isGuestAddress(address);
}

/** Prisma filter: real players only (excludes GUEST). */
export const registeredPlayerWhere = {
  address: { not: null },
  NOT: { address: { equals: GUEST_ADDRESS, mode: 'insensitive' as const } },
} as const;
