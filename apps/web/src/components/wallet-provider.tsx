"use client";

import { RainbowKitProvider, connectorsForWallets } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createConfig, http, useConnect } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [injectedWallet],
    },
  ],
  {
    appName: "crack-my-code",
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "3a8170812b1a5b83117df95c50294977", // Fallback ID
  }
);

const wagmiConfig = createConfig({
  chains: [celo, celoSepolia],
  connectors,
  transports: {
    [celo.id]: http(),
    [celoSepolia.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

function WalletProviderInner({ children }: { children: React.ReactNode }) {
  const { connect, connectors } = useConnect();

  useEffect(() => {
    // Auto-connect for mini-app environments (MiniPay, Farcaster, etc.)
    const isMiniPay = (window as any).ethereum?.isMiniPay;
    const isFarcaster = (window as any).ethereum?.isFarcaster || (window as any).farcaster;

    if (isMiniPay || isFarcaster) {
      const injectedConnector = connectors.find((c) => c.id === "injected");
      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    }
  }, [connect, connectors]);

  return <>{children}</>;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
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
        <WagmiProvider config={wagmiConfig}>
          <RainbowKitProvider>
            {!mounted ? (
              <div style={{ visibility: 'hidden' }}>{children}</div>
            ) : (
              <WalletProviderInner>{children}</WalletProviderInner>
            )}
          </RainbowKitProvider>
        </WagmiProvider>
      </PrivyProvider>
    </QueryClientProvider>
  );
}
