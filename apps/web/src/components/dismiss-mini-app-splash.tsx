'use client';

import { useLayoutEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { isLikelyMiniPayHost } from '@/lib/minipay-host';

let splashDismissed = false;

export function dismissMiniAppSplash(): void {
  if (splashDismissed || typeof window === 'undefined') return;
  splashDismissed = true;
  void sdk.actions.ready().catch(() => {});
}

/**
 * Dismiss the MiniPay / Farcaster splash as early as possible.
 * Must live above WalletProvider — Privy gates must not block this.
 */
export function DismissMiniAppSplash() {
  useLayoutEffect(() => {
    if (isLikelyMiniPayHost()) {
      dismissMiniAppSplash();
      return;
    }

    void sdk.isInMiniApp().then((inMiniApp) => {
      if (inMiniApp) dismissMiniAppSplash();
    });
  }, []);

  return null;
}
