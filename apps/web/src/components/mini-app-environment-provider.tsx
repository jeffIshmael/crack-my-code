'use client';

import { createContext, useEffect, useLayoutEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import {
  detectMiniAppEnvironment,
  getSyncMiniAppEnvironment,
  type MiniAppEnvironment,
} from '@/lib/mini-app-environment';
import { isLikelyMiniPayHost, isMiniPayClient, watchForMiniPayInjection } from '@/lib/minipay-host';
import { DismissMiniAppSplash } from '@/components/dismiss-mini-app-splash';

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
 * Detects MiniPay / Farcaster hosts. MiniPay bootstraps synchronously when possible.
 */
export function MiniAppEnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [environment, setEnvironment] = useState<MiniAppEnvironment>(
    () => getSyncMiniAppEnvironment() ?? PENDING,
  );

  useLayoutEffect(() => {
    if (isLikelyMiniPayHost()) {
      setEnvironment((prev) => (prev.isMiniPay ? prev : getSyncMiniAppEnvironment() ?? prev));
      return;
    }

    return watchForMiniPayInjection(() => {
      const detected = getSyncMiniAppEnvironment();
      if (detected) {
        setEnvironment((prev) => (prev.isMiniPay ? prev : detected));
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    // MiniPay first — never wait on the Farcaster SDK in MiniPay's WebView.
    if (isLikelyMiniPayHost() || isMiniPayClient()) {
      const detected = getSyncMiniAppEnvironment();
      if (detected && !cancelled) setEnvironment(detected);
      return () => {
        cancelled = true;
      };
    }

    void sdk.isInMiniApp().then((inMiniApp) => {
      if (!cancelled && inMiniApp) {
        setEnvironment((prev) => (prev.isAutoConnect ? prev : MINI_APP_BOOTSTRAP));
      }
    });

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
      <DismissMiniAppSplash />
      {children}
    </MiniAppEnvironmentContext.Provider>
  );
}
