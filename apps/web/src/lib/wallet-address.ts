/** Privy smart-wallet client shape (minimal). */
type SmartWalletClientLike = {
  account?: { address?: string };
} | null | undefined;

type PrivyUserLike = {
  wallet?: { address?: string };
  linkedAccounts?: Array<{ type?: string; address?: string }>;
} | null | undefined;

export function getSmartWalletAddress(
  smartWalletClient: SmartWalletClientLike,
  user?: PrivyUserLike,
): string | undefined {
  if (smartWalletClient?.account?.address) {
    return smartWalletClient.account.address.toLowerCase();
  }

  const linked = user?.linkedAccounts?.find(
    (account) => account.type === 'smart_wallet' && account.address,
  );
  return linked?.address?.toLowerCase();
}

/** Address used for USDT balance, rewards, and on-chain cipher tracking. */
export function resolvePayoutAddress(opts: {
  smartWalletClient?: SmartWalletClientLike;
  user?: PrivyUserLike;
  wagmiAddress?: string | null;
}): string | undefined {
  const smart = getSmartWalletAddress(opts.smartWalletClient, opts.user);
  if (smart) return smart;

  const eoa = opts.wagmiAddress || opts.user?.wallet?.address;
  return eoa ? eoa.toLowerCase() : undefined;
}

/** All wallet addresses that may identify this player in historical games. */
export function playerAddressAliases(opts: {
  payoutAddress?: string;
  wagmiAddress?: string | null;
  user?: PrivyUserLike;
}): string[] {
  const aliases = new Set<string>();
  const payout = opts.payoutAddress?.toLowerCase();
  const eoa = (opts.wagmiAddress || opts.user?.wallet?.address)?.toLowerCase();
  const smart = getSmartWalletAddress(undefined, opts.user);

  if (payout) aliases.add(payout);
  if (eoa) aliases.add(eoa);
  if (smart) aliases.add(smart);

  return [...aliases];
}
