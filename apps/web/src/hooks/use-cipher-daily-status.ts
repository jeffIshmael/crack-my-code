'use client';

import { useCallback, useEffect, useState } from 'react';
import { CIPHER_DAILY_WIN_CAP } from '@/lib/game';

export type CipherDailyStatus = {
  gamesPlayedToday: number;
  gamesRemaining: number;
  dailyCap: number;
  atDailyCap: boolean;
  rewardWinsToday: number;
  signedIn: boolean;
};

const guestDefaults: CipherDailyStatus = {
  gamesPlayedToday: 0,
  gamesRemaining: CIPHER_DAILY_WIN_CAP,
  dailyCap: CIPHER_DAILY_WIN_CAP,
  atDailyCap: false,
  rewardWinsToday: 0,
  signedIn: false,
};

export function useCipherDailyStatus(
  payoutAddress: string | undefined,
  isSignedIn: boolean,
  refreshKey: number,
) {
  const [cipherStatus, setCipherStatus] = useState<CipherDailyStatus | null>(null);
  const [cipherStatusLoaded, setCipherStatusLoaded] = useState(() => !isSignedIn);

  const refreshCipherStatus = useCallback(async () => {
    if (!isSignedIn || !payoutAddress) {
      setCipherStatus(null);
      setCipherStatusLoaded(true);
      return;
    }

    setCipherStatusLoaded(false);
    try {
      const res = await fetch(
        `/api/games/cipher-status?address=${encodeURIComponent(payoutAddress)}`,
      );
      const data = (await res.json()) as CipherDailyStatus;
      setCipherStatus(data);
    } catch (err) {
      console.error('Cipher status refresh failed', err);
    } finally {
      setCipherStatusLoaded(true);
    }
  }, [isSignedIn, payoutAddress]);

  useEffect(() => {
    if (!isSignedIn || !payoutAddress) {
      setCipherStatus(null);
      setCipherStatusLoaded(true);
      return;
    }

    let cancelled = false;
    setCipherStatusLoaded(false);

    fetch(`/api/games/cipher-status?address=${encodeURIComponent(payoutAddress)}`)
      .then((res) => res.json())
      .then((data: CipherDailyStatus) => {
        if (!cancelled) setCipherStatus(data);
      })
      .catch((err) => console.error('Cipher status fetch failed', err))
      .finally(() => {
        if (!cancelled) setCipherStatusLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, payoutAddress, refreshKey]);

  return {
    cipherStatus: isSignedIn ? cipherStatus : guestDefaults,
    cipherStatusLoaded: !isSignedIn || cipherStatusLoaded,
    refreshCipherStatus,
  };
}
