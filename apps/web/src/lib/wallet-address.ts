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

/**
 * Address used for USDT balance, rewards, and on-chain cipher tracking.
 *
 * For externally connected wallets (MiniPay, MetaMask, Farcaster) we always
 * use the EOA so that the user has ONE canonical identity. The Privy smart
 * wallet is only used when the wallet is Privy-embedded (no external EOA).
 */
export function resolvePayoutAddress(opts: {
  smartWalletClient?: SmartWalletClientLike;
  user?: PrivyUserLike;
  wagmiAddress?: string | null;
  isExternalWallet?: boolean;
}): string | undefined {
  const eoa = opts.wagmiAddress || opts.user?.wallet?.address;

  // External wallets (MiniPay, MetaMask, etc.): always use the EOA
  if (opts.isExternalWallet && eoa) {
    return eoa.toLowerCase();
  }

  // If we have an EOA from wagmi that isn't a Privy embedded wallet, use it directly
  if (eoa && opts.wagmiAddress) {
    const privyEmbedded = opts.user?.linkedAccounts?.find(
      (a) => a.type === 'wallet' && (a as any).walletClientType === 'privy',
    );
    // If the wagmi address differs from the Privy embedded wallet, it's external
    if (!privyEmbedded || privyEmbedded.address?.toLowerCase() !== opts.wagmiAddress.toLowerCase()) {
      return opts.wagmiAddress.toLowerCase();
    }
  }

  // Privy embedded wallet: prefer smart wallet for gasless txns
  const smart = getSmartWalletAddress(opts.smartWalletClient, opts.user);
  if (smart) return smart;

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
