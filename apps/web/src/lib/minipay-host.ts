/**
 * MiniPay detection beyond window.ethereum.isMiniPay.
 * Discover / in-app WebViews often omit the flag until late or never set it.
 */

export function markMiniPayHost(): void {
  if (typeof window === 'undefined') return;
  (window as Window & { __CMC_MINIPAY__?: boolean }).__CMC_MINIPAY__ = true;
}

export function isMiniPayClient(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as Window & { ethereum?: { isMiniPay?: boolean } }).ethereum?.isMiniPay === true;
}

/** True when running inside MiniPay's WebView (sync checks only). */
export function isLikelyMiniPayHost(): boolean {
  if (typeof window === 'undefined') return false;
  if ((window as Window & { __CMC_MINIPAY__?: boolean }).__CMC_MINIPAY__) return true;
  if (isMiniPayClient()) return true;

  const ua = navigator.userAgent ?? '';
  if (/minipay/i.test(ua)) return true;

  const referrer = document.referrer ?? '';
  if (/minipay/i.test(referrer)) return true;

  // Opened from MiniPay discover / deep link without isMiniPay injected yet.
  if (window.location.search.includes('minipay') || window.location.search.includes('miniApp')) {
    return true;
  }

  // MiniPay Android WebView often includes "wv" without the brand in UA.
  if (/; wv\)/i.test(ua) && /android/i.test(ua) && /celo|opera|chrome/i.test(ua)) {
    return true;
  }

  return false;
}

/** Poll for late window.ethereum.isMiniPay injection (common in MiniPay WebView). */
export function watchForMiniPayInjection(onDetected: () => void, maxMs = 4000): () => void {
  if (typeof window === 'undefined') return () => {};
  if (isLikelyMiniPayHost()) {
    onDetected();
    return () => {};
  }

  let cancelled = false;
  const started = Date.now();

  const tick = () => {
    if (cancelled) return;
    if (isMiniPayClient()) {
      markMiniPayHost();
      onDetected();
      return;
    }
    if (Date.now() - started < maxMs) {
      window.setTimeout(tick, 50);
    }
  };

  tick();
  return () => {
    cancelled = true;
  };
}

/** Mark MiniPay hosts for lighter Cipher AI (no Web Workers, smaller probe pools). */
export function shouldUseMiniPayCipherFastPath(): boolean {
  return isLikelyMiniPayHost();
}
