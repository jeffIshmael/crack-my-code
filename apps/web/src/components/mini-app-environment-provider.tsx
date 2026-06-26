'use client';

import { createContext, useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import {
  detectMiniAppEnvironment,
  getSyncMiniAppEnvironment,
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
 * Detects MiniPay / Farcaster hosts. MiniPay is resolved synchronously;
 * Farcaster calls sdk.actions.ready() without blocking other hosts.
 */
export function MiniAppEnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [environment, setEnvironment] = useState<MiniAppEnvironment>(
    () => getSyncMiniAppEnvironment() ?? PENDING,
  );

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const detected = await detectMiniAppEnvironment();
      if (!cancelled) {
        setEnvironment(detected);
      }

      if (detected.isFarcaster) {
        try {
          await sdk.actions.ready();
        } catch (error) {
          console.debug('sdk.actions.ready() skipped:', error);
        }
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
