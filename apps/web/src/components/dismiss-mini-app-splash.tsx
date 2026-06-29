'use client';

import { useLayoutEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

/** Retry dismiss — the Farcaster host bridge is sometimes late to attach. */
const RETRY_DELAYS_MS = [0, 100, 400, 1200];

function tryDismissSplash(): void {
  void sdk.actions.ready().catch(() => {});
}

/**
 * Dismiss the Farcaster Mini App native splash via sdk.actions.ready().
 *
 * Only Farcaster mini-app hosts (Warpcast, etc.) need this — NOT the MiniPay
 * dapp browser (window.ethereum.isMiniPay). MiniPay browser blue screens are
 * app load / render time, not the Farcaster splash.
 */
export function DismissMiniAppSplash() {
  useLayoutEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];

    const dismissForMiniAppHost = (inMiniApp: boolean) => {
      if (!inMiniApp) return;
      tryDismissSplash();
      timers = RETRY_DELAYS_MS.map((delay) => window.setTimeout(tryDismissSplash, delay));
    };

    void sdk.isInMiniApp().then(dismissForMiniAppHost).catch(() => {});

    return () => timers.forEach(clearTimeout);
  }, []);

  return null;
}

export function dismissMiniAppSplash(): void {
  void sdk.isInMiniApp().then((inMiniApp) => {
    if (inMiniApp) tryDismissSplash();
  });
}
