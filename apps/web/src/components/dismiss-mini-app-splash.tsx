'use client';

import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { getSyncMiniAppEnvironment } from '@/lib/mini-app-environment';

let splashDismissed = false;

/** Dismiss the host splash only after the app shell has painted (avoids a blank blue screen). */
export function dismissMiniAppSplash(): void {
  if (splashDismissed || typeof window === 'undefined') return;

  const dismiss = () => {
    if (splashDismissed) return;
    splashDismissed = true;
    void sdk.actions.ready().catch(() => {});
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(dismiss);
  });
}

/**
 * Call sdk.actions.ready() once the interactive shell is mounted — not on first effect tick.
 * Keeps the native splash visible during JS load, then transitions straight to the homepage.
 */
export function DismissMiniAppSplash() {
  useEffect(() => {
    if (getSyncMiniAppEnvironment()?.isMiniPay) {
      dismissMiniAppSplash();
      return;
    }

    void sdk.isInMiniApp().then((inMiniApp) => {
      if (inMiniApp) dismissMiniAppSplash();
    });
  }, []);

  return null;
}
