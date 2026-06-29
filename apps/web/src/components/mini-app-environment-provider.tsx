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
 * Detects MiniPay / Farcaster hosts. MiniPay is resolved synchronously.
 * Both hosts require sdk.actions.ready() to dismiss the splash screen.
 */
export function MiniAppEnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [environment, setEnvironment] = useState<MiniAppEnvironment>(
    () => getSyncMiniAppEnvironment() ?? PENDING,
  );

  useEffect(() => {
    let cancelled = false;

    const dismissSplash = async () => {
      try {
        await sdk.actions.ready();
      } catch (error) {
        console.debug('sdk.actions.ready() skipped:', error);
      }
    };

    // MiniPay: dismiss splash immediately — waiting on async detection leaves an infinite loader.
    const sync = getSyncMiniAppEnvironment();
    if (sync?.isMiniPay) {
      void dismissSplash();
    } else {
      // Mini App hosts (Farcaster, MiniPay discover) may not expose isMiniPay synchronously.
      void sdk.isInMiniApp().then((inMiniApp) => {
        if (inMiniApp) void dismissSplash();
      });
    }

    const init = async () => {
      const detected = await detectMiniAppEnvironment();
      if (!cancelled) {
        setEnvironment(detected);
      }

      if (detected.isAutoConnect) {
        await dismissSplash();
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
