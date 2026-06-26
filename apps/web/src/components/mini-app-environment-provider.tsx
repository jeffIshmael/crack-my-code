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
 * Detects MiniPay / Farcaster hosts once. Calls sdk.actions.ready() immediately
 * on mount so Farcaster clients dismiss the splash without waiting on detection.
 */
export function MiniAppEnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [environment, setEnvironment] = useState<MiniAppEnvironment>(PENDING);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await sdk.actions.ready();
      } catch (error) {
        // No-op outside a Farcaster Mini App host.
        console.debug('sdk.actions.ready() skipped:', error);
      }

      const detected = await detectMiniAppEnvironment();
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
