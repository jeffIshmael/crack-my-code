"use client";


import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { createConfig, WagmiProvider } from "@privy-io/wagmi";
import { http, useConnect } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";



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
          supportedChains: [celo, celoSepolia],
        }}
      >
        <WagmiProviderWrapper>{children}</WagmiProviderWrapper>
      </PrivyProvider>
    </QueryClientProvider>
  );
}

function WagmiProviderWrapper({ children }: { children: React.ReactNode }) {
  const { ready } = usePrivy();
  
  const wagmiConfig = useMemo(() => {
    return createConfig({
      chains: [celo, celoSepolia],
      transports: {
        [celo.id]: http(),
        [celoSepolia.id]: http(),
      },
      ssr: true,
    });
  }, []);

  if (!ready) {
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

  useEffect(() => {
    if (!ready) return;
    
    const isMiniPay = (window as any).ethereum?.isMiniPay;
    const isFarcaster = (window as any).ethereum?.isFarcaster || (window as any).farcaster;

    if (isMiniPay || isFarcaster) {
      const injectedConnector = connectors.find((c) => c.id === "injected");
      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    }
  }, [ready, connect, connectors]);

  return <>{children}</>;
}
