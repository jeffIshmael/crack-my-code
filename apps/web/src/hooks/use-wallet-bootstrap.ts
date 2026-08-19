'use client';

import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { useMiniAppEnvironment } from '@/hooks/use-mini-app-environment';
import { isLikelyMiniPayHost, isMiniPayClient } from '@/lib/minipay-host';

/**
 * True while MiniPay / Farcaster auto-connect is in flight (avoid "Sign in" flash).
 */
export function useWalletBootstrap() {
  const { isMiniPay, isAutoConnect } = useMiniAppEnvironment();
  const { authenticated } = usePrivy();
  const { isConnected, isConnecting, isReconnecting } = useAccount();

  const isAutoConnectHost =
    isMiniPay || isAutoConnect || isLikelyMiniPayHost() || isMiniPayClient();

  const wagmiPending = isConnecting || isReconnecting;

  const isBootstrapping =
    isAutoConnectHost &&
    !authenticated &&
    !isConnected &&
    (wagmiPending || isAutoConnectHost);

  return { isBootstrapping, isAutoConnectHost };
}
