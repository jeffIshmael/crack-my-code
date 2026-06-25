'use client';

import { createContext, useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import {
  detectMiniAppEnvironment,
  type MiniAppEnvironment,
} from '@/lib/mini-app-environment';

const PENDING: MiniAppEnvironment = {
  environment: 'web',
  isMiniPay: false,
  isFarcaster: false,
  isAutoConnect: false,
  isReady: false,
};

export const MiniAppEnvironmentContext = createContext<MiniAppEnvironment>(PENDING);

/**
 * Detects MiniPay / Farcaster hosts once and calls sdk.actions.ready() only
 * inside a real Farcaster Mini App (per Neynar docs).
 */
export function MiniAppEnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [environment, setEnvironment] = useState<MiniAppEnvironment>(PENDING);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const detected = await detectMiniAppEnvironment();
      if (cancelled) return;

      if (detected.isFarcaster) {
        try {
          await sdk.actions.ready();
        } catch (error) {
          console.error('Farcaster sdk.actions.ready() failed:', error);
        }
      }

      if (!cancelled) {
        setEnvironment(detected);
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MiniAppEnvironmentContext.Provider value={environment}>
      {children}
    </MiniAppEnvironmentContext.Provider>
  );
}
