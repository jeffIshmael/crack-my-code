import { sdk } from '@farcaster/miniapp-sdk';

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

export function isMiniPayClient(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as Window & { ethereum?: { isMiniPay?: boolean } }).ethereum?.isMiniPay === true;
}

const MINIPAY_ENV: MiniAppEnvironment = {
  environment: 'minipay',
  isMiniPay: true,
  isFarcaster: false,
  isAutoConnect: true,
  isReady: true,
};

/** Instant MiniPay detection — avoids awaiting the Farcaster SDK. */
export function getSyncMiniAppEnvironment(): MiniAppEnvironment | null {
  if (isMiniPayClient()) return MINIPAY_ENV;
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

/**
 * Detect whether the app is running in MiniPay, a Farcaster Mini App, or the open web.
 * Uses sdk.isInMiniApp() per Neynar / Farcaster Mini App SDK guidance.
 */
export async function detectMiniAppEnvironment(): Promise<MiniAppEnvironment> {
  if (typeof window === 'undefined') {
    return { ...WEB_DEFAULT, isReady: true };
  }

  if (isMiniPayClient()) {
    return MINIPAY_ENV;
  }

  let isFarcaster = false;
  try {
    isFarcaster = await sdk.isInMiniApp();
  } catch {
    isFarcaster = false;
  }

  if (!isFarcaster) {
    isFarcaster = isFarcasterDevFallback();
  }

  const environment: AppEnvironment = isFarcaster ? 'farcaster' : 'web';

  return {
    environment,
    isMiniPay: false,
    isFarcaster,
    isAutoConnect: isFarcaster,
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
