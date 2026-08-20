/** Truncated wallet fallback when no profile name exists. */
export function formatAddressShort(address: string): string {
  if (!address || address.length < 10) return address || 'Opponent';
  return `${address.slice(0, 6)}…`;
}

/** Prefer a player's chosen name; fall back to a short address. */
export function displayNameFromProfile(
  name: string | null | undefined,
  address: string,
): string {
  const cleaned = typeof name === 'string' ? name.trim() : '';
  if (cleaned) return cleaned;
  return formatAddressShort(address);
}

/** Client helper: load display name for an opponent wallet. */
export async function fetchOpponentDisplayName(address: string): Promise<string> {
  const fallback = formatAddressShort(address);
  try {
    const res = await fetch(`/api/users/profile?address=${encodeURIComponent(address)}`);
    if (!res.ok) return fallback;
    const data = await res.json();
    return displayNameFromProfile(data?.name, address);
  } catch {
    return fallback;
  }
}
