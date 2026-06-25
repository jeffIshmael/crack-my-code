"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { createConfig, WagmiProvider } from "@privy-io/wagmi";
import { http, useConnect, injected, useAccount } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { farcasterMiniApp as farcasterFrame } from "@farcaster/miniapp-wagmi-connector";
import { useMiniAppEnvironment } from "@/hooks/use-mini-app-environment";

const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const isAppIdValid = appId && appId !== 'undefined' && appId.length > 5;

  // During SSR (prerendering), we return a null or a simple div to avoid 
  // executing children that rely on Privy/Wagmi hooks, which would crash the build.
  if (!mounted) {
    return (
      <div style={{ visibility: 'hidden' }} />
    );
  }

  // If we are on the client but the appId is missing or invalid, we log a warning 
  // and render the children WITHOUT Privy to allow static generation to complete.
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
  const wagmiConfig = useMemo(() => {
    return createConfig({
      chains: [celo],
      transports: {
        [celo.id]: http(),
      },
      connectors: [
        farcasterFrame(),
        injected()
      ],
      ssr: true,
    });
  }, []);

  // Wait for host detection before gating on Privy (Farcaster / MiniPay skip Privy login).
  if (!envReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#03111C]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!ready && !isAutoConnectEnv) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#03111C]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
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

  useEffect(() => {
    if (!envReady || isConnected) return;

    if (isFarcaster) {
      console.log("Auto-connecting to Farcaster via farcasterMiniApp()");
      connect({ connector: farcasterFrame() });
      return;
    }

    if (isMiniPay) {
      const injectedConnector = connectors.find(c => c.id === 'injected' || c.id === 'metaMask');
      if (injectedConnector) {
        console.log("Auto-connecting to MiniPay");
        connect({ connector: injectedConnector });
      } else if (connectors.length > 1) {
        connect({ connector: connectors[1] });
      }
    }
  }, [connect, connectors, isConnected, isFarcaster, isMiniPay, envReady]);

  return <>{children}</>;
}
