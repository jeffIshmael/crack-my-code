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

const MINI_APP_BOOTSTRAP: MiniAppEnvironment = {
  environment: 'farcaster',
  isMiniPay: false,
  isFarcaster: true,
  isAutoConnect: true,
  isReady: false,
};

export const MiniAppEnvironmentContext = createContext<MiniAppEnvironment>(PENDING);

/**
 * Detects MiniPay / Farcaster hosts. MiniPay is resolved synchronously.
 * Splash dismissal is handled by DismissMiniAppSplash after the shell paints.
 */
export function MiniAppEnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [environment, setEnvironment] = useState<MiniAppEnvironment>(
    () => getSyncMiniAppEnvironment() ?? PENDING,
  );

  useEffect(() => {
    let cancelled = false;

    // MiniPay discover may not expose isMiniPay immediately — unblock auto-connect early.
    if (!getSyncMiniAppEnvironment()) {
      void sdk.isInMiniApp().then((inMiniApp) => {
        if (!cancelled && inMiniApp) {
          setEnvironment((prev) => (prev.isAutoConnect ? prev : MINI_APP_BOOTSTRAP));
        }
      });
    }

    void detectMiniAppEnvironment().then((detected) => {
      if (!cancelled) {
        setEnvironment(detected);
      }
    });

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
