"use client";


import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { createConfig, WagmiProvider } from "@privy-io/wagmi";
import { http, useConnect, injected, useAccount } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import sdk from "@farcaster/miniapp-sdk";



const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // During SSR (prerendering), we return a null or a simple div to avoid 
  // executing children that rely on Privy/Wagmi hooks, which would crash the build.
  if (!mounted) {
    return (
      <div style={{ visibility: 'hidden' }} />
    );
  }

  // If we are on the client but the appId is missing, we log a warning 
  // but still render the children so the app doesn't stay blank.
  if (!appId) {
    console.warn("NEXT_PUBLIC_PRIVY_APP_ID is missing. Wallet functionality will be disabled.");
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
            theme: 'dark',
            accentColor: '#00CFFF',
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
  const [isAutoConnectEnv, setIsAutoConnectEnv] = useState(false);

  useEffect(() => {
    const checkEnv = async () => {
      const isMiniPay = (window as any).ethereum?.isMiniPay;
      const isFarcasterUrl = window.location.search.includes('miniApp=true') || window.location.pathname.includes('/mini');
      
      // Also check SDK context if available
      let isFarcasterSdk = false;
      try {
        const context = await sdk.context;
        if (context?.client) {
          isFarcasterSdk = true;
        }
      } catch (e) {
        // SDK not available or not in Farcaster
      }

      console.log("Environment check:", { isMiniPay, isFarcasterUrl, isFarcasterSdk });
      setIsAutoConnectEnv(!!(isMiniPay || isFarcasterUrl || isFarcasterSdk));
    };
    checkEnv();
  }, []);
  
  const wagmiConfig = useMemo(() => {
    return createConfig({
      chains: [celo],
      transports: {
        [celo.id]: http(),
      },
      connectors: [
        farcasterMiniApp(),
        injected()
      ],
      ssr: true,
    });
  }, []);

  // If we are in an auto-connect environment, we don't want to block rendering 
  // on Privy being ready, as we'll be using the injected/farcaster provider.
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
  const { ready } = usePrivy();
  const { connect, connectors } = useConnect();

  const { isConnected } = useAccount();

  useEffect(() => {
    const checkAndConnect = async () => {
      if (isConnected) return;
      
      const isMiniPay = (window as any).ethereum?.isMiniPay;
      const isFarcasterUrl = window.location.search.includes('miniApp=true') || window.location.pathname.includes('/mini');
      
      let isFarcasterSdk = false;
      try {
        const context = await sdk.context;
        if (context?.client) {
          isFarcasterSdk = true;
        }
      } catch (e) {}

      const isFarcaster = isFarcasterUrl || isFarcasterSdk;

      console.log("Auto-connect check:", { 
        isMiniPay, 
        isFarcaster, 
        connectorCount: connectors.length,
        connectors: connectors.map(c => ({ id: c.id, name: c.name }))
      });

      if (isMiniPay || isFarcaster) {
        const targetConnector = connectors.find((c) => {
          if (isFarcaster) {
            // Log each check to see why it might fail
            const matches = c.id.toLowerCase().includes("farcaster") || c.name.toLowerCase().includes("farcaster");
            console.log(`Checking connector ${c.name} (${c.id}): ${matches}`);
            return matches;
          }
          if (isMiniPay) {
            return c.id === "injected";
          }
          return false;
        });

        if (targetConnector) {
          console.log("Auto-connecting to:", targetConnector.name, targetConnector.id);
          connect({ connector: targetConnector });
        } else if (connectors.length > 0) {
          console.warn("Target connector not found for environment, but connectors are available");
        }
      }
    };

    checkAndConnect();
  }, [connect, connectors]);

  return <>{children}</>;
}
