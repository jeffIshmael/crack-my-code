'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { ThemeLogo } from '@/components/ThemeLogo';

export default function PoolDepletedPage() {
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/agent/balances')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || data.error) return;
        setBalance(data.rewardPool?.usdt?.formatted ?? '0');
      })
      .catch(() => {
        if (!cancelled) setBalance('0');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isEmpty = balance !== null && parseFloat(balance) <= 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))]">
      <div className="flex w-full max-w-[400px] flex-col items-center gap-5">
        <ThemeLogo className="scale-90" />

        <motion.div
          className="w-full overflow-hidden rounded-[1.75rem] border-2 border-[var(--wood-dark)] shadow-[0_6px_0_var(--wood-edge)]"
          style={{ background: 'var(--cream)' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="flex items-center gap-3 border-b-2 border-[var(--wood-dark)] px-5 py-4"
            style={{ background: 'rgba(232, 135, 46, 0.14)' }}
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[var(--orange)]"
              style={{ background: 'var(--orange-dim)' }}
            >
              <AlertTriangle className="h-5 w-5 text-[var(--orange)]" strokeWidth={2.5} />
            </div>
            <p className="font-display text-lg font-bold text-[var(--wood-text)]">
              Reward pool depleted
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
            <p className="font-ui text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-dim)]">
              Cipher reward pool
            </p>
            <p
              className="font-display text-5xl font-black tracking-tight"
              style={{ color: isEmpty ? 'var(--orange)' : 'var(--clue-green)' }}
            >
              {balance === null ? '…' : balance}
              <span className="ml-2 text-2xl font-bold text-[var(--wood-text-soft)]">USDT</span>
            </p>
            {isEmpty && (
              <p className="font-body text-sm text-[var(--wood-text-soft)]">
                Cipher win rewards are paused until the pool is refilled.
              </p>
            )}
          </div>
        </motion.div>

        <Link
          href="/"
          className="font-ui text-xs font-bold uppercase tracking-widest text-[var(--accent)] underline underline-offset-4 transition-colors hover:text-[var(--accent-bright)]"
        >
          Back to Crack My Code
        </Link>
      </div>
    </div>
  );
}
