"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useMemo } from "react";
import { createConfig, WagmiProvider } from "@privy-io/wagmi";
import { http, useConnect, injected, useAccount } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { farcasterMiniApp as farcasterFrame } from "@farcaster/miniapp-wagmi-connector";
import { useMiniAppEnvironment } from "@/hooks/use-mini-app-environment";
import { isLikelyMiniPayHost, isMiniPayClient } from "@/lib/mini-app-environment";

const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const isAppIdValid = appId && appId !== 'undefined' && appId.length > 5;

  // SSR: Privy/Wagmi hooks are client-only. Client: render immediately (no mount flash).
  if (typeof window === 'undefined') {
    return null;
  }

  if (!isAppIdValid) {
    if (typeof window !== 'undefined') {
      console.warn("NEXT_PUBLIC_PRIVY_APP_ID is missing or invalid. Wallet functionality will be disabled.");
    }
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={appId}
        clientId={clientId}
        config={{
          appearance: {
            theme: 'light',
            accentColor: '#2F6FD6',
            showWalletLoginFirst: false,
          },
          embeddedWallets: {
            ethereum: {
              createOnLogin: 'users-without-wallets'
            }
          },
          defaultChain: celo,
          supportedChains: [celo],
        }}
      >
        <SmartWalletsProvider
          config={{
            paymasterContext: {
              mode: 'SPONSORED',
              calculateGasLimits: true,
            }
          }}
        >
          <WagmiProviderWrapper>{children}</WagmiProviderWrapper>
        </SmartWalletsProvider>
      </PrivyProvider>
    </QueryClientProvider>
  );
}

function WagmiProviderWrapper({ children }: { children: React.ReactNode }) {
  const { ready } = usePrivy();
  const { isAutoConnect: isAutoConnectEnv, isReady: envReady } = useMiniAppEnvironment();
  const miniPayHost = isLikelyMiniPayHost();
  const autoConnectHost = isAutoConnectEnv || miniPayHost;
  const wagmiConfig = useMemo(() => {
    return createConfig({
      chains: [celo],
      transports: {
        [celo.id]: http('https://forno.celo.org'),
      },
      connectors: [
        farcasterFrame(),
        injected()
      ],
      ssr: true,
    });
  }, []);

  if (!envReady && !autoConnectHost) {
    return null;
  }

  if (!ready && !autoConnectHost) {
    return null;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <WalletProviderInner>{children}</WalletProviderInner>
    </WagmiProvider>
  );
}

function WalletProviderInner({ children }: { children: React.ReactNode }) {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();
  const { isFarcaster, isMiniPay, isReady: envReady } = useMiniAppEnvironment();

  const connectMiniPay = () => {
    if (isConnected) return true;
    if (!(isMiniPay || isLikelyMiniPayHost() || isMiniPayClient())) return false;

    const injectedConnector =
      connectors.find((c) => c.id === 'injected' || c.id === 'metaMask') ??
      connectors.find((c) => c.type === 'injected');
    if (injectedConnector) {
      connect({ connector: injectedConnector });
      return true;
    }
    return false;
  };

  useLayoutEffect(() => {
    if (isConnected) return;
    if (!(isMiniPay || isLikelyMiniPayHost() || isMiniPayClient())) return;

    if (connectMiniPay()) return;

    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      if (connectMiniPay() || attempts >= 60) {
        window.clearInterval(interval);
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, [connect, connectors, isConnected, isMiniPay]);

  useEffect(() => {
    if (isConnected) return;

    if (isMiniPay || isLikelyMiniPayHost() || isMiniPayClient()) {
      connectMiniPay();
      return;
    }

    if (!envReady) return;

    if (isFarcaster) {
      connect({ connector: farcasterFrame() });
    }
  }, [connect, connectors, isConnected, isFarcaster, isMiniPay, envReady]);

  return <>{children}</>;
}
