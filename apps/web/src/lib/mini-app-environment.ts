import { sdk } from '@farcaster/miniapp-sdk';
import { isLikelyMiniPayHost, isMiniPayClient } from '@/lib/minipay-host';

export type AppEnvironment = 'minipay' | 'farcaster' | 'web';

export interface MiniAppEnvironment {
  environment: AppEnvironment;
  isMiniPay: boolean;
  isFarcaster: boolean;
  /** True when running inside MiniPay or a Farcaster Mini App client */
  isAutoConnect: boolean;
  /** Environment detection has finished (client only) */
  isReady: boolean;
}

const WEB_DEFAULT: MiniAppEnvironment = {
  environment: 'web',
  isMiniPay: false,
  isFarcaster: false,
  isAutoConnect: false,
  isReady: false,
};

let detectionPromise: Promise<MiniAppEnvironment> | null = null;

export { isMiniPayClient, isLikelyMiniPayHost } from '@/lib/minipay-host';

const MINIPAY_ENV: MiniAppEnvironment = {
  environment: 'minipay',
  isMiniPay: true,
  isFarcaster: false,
  isAutoConnect: true,
  isReady: true,
};

/** Instant MiniPay detection — avoids awaiting the Farcaster SDK. */
export function getSyncMiniAppEnvironment(): MiniAppEnvironment | null {
  if (isLikelyMiniPayHost()) return MINIPAY_ENV;
  return null;
}

/** Dev-only fallbacks when testing outside a Farcaster host (e.g. ?miniApp=true). */
function isFarcasterDevFallback(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as Window & {
    ethereum?: { isFarcaster?: boolean };
    farcaster?: unknown;
  };
  return !!(
    win.ethereum?.isFarcaster ||
    win.farcaster ||
    window.location.search.includes('miniApp=true') ||
    window.location.pathname.includes('/mini')
  );
}

async function isInMiniAppWithTimeout(timeoutMs = 600): Promise<boolean> {
  try {
    return await Promise.race([
      sdk.isInMiniApp(),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(isLikelyMiniPayHost()), timeoutMs);
      }),
    ]);
  } catch {
    return isLikelyMiniPayHost();
  }
}

/**
 * Detect whether the app is running in MiniPay, a Farcaster Mini App, or the open web.
 */
export async function detectMiniAppEnvironment(): Promise<MiniAppEnvironment> {
  if (typeof window === 'undefined') {
    return { ...WEB_DEFAULT, isReady: true };
  }

  if (isLikelyMiniPayHost()) {
    return MINIPAY_ENV;
  }

  const isFarcaster = await isInMiniAppWithTimeout();

  if (!isFarcaster) {
    if (isFarcasterDevFallback()) {
      return {
        environment: 'farcaster',
        isMiniPay: false,
        isFarcaster: true,
        isAutoConnect: true,
        isReady: true,
      };
    }
    return { ...WEB_DEFAULT, isReady: true };
  }

  return {
    environment: 'farcaster',
    isMiniPay: false,
    isFarcaster: true,
    isAutoConnect: true,
    isReady: true,
  };
}

/** Cached detection — isInMiniApp() is also cached inside the SDK after first call. */
export function getMiniAppEnvironment(): Promise<MiniAppEnvironment> {
  if (!detectionPromise) {
    detectionPromise = detectMiniAppEnvironment();
  }
  return detectionPromise;
}

export function resetMiniAppEnvironmentCache(): void {
  detectionPromise = null;
}
