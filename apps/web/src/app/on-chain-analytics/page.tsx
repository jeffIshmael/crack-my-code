'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { ThemeLogo } from '@/components/ThemeLogo';

interface OnChainAnalytics {
  contractAddress: string;
  celoscanUrl: string;
  chain: string;
  windowDays: number;
  activity: {
    completedGamesInWindow: number;
    cipherGamesInWindow: number;
    pvpGamesInWindow: number;
    estimatedOnChainTxInWindow: number;
    movingAverageDailyOnChainTx: number;
  };
  txModel: {
    cipher: { method: string; txsPerGame: number };
    pvp: { methods: string[]; alternateMethods: string[]; txsPerGame: number };
    note: string;
  };
  treasury: {
    accumulatedFeesUsdt: string;
    escrowBalanceUsdt: string;
    rewardPoolUsdt: string;
    readAt: string;
  } | null;
  sampleTransactions: ReadonlyArray<{ method: string; url: string | null }>;
  updatedAt: string;
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="theme-sky-readout flex h-full flex-col gap-2 p-3.5">
      <span className="font-body text-[9px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
        {label}
      </span>
      <span className="font-ui text-2xl font-bold leading-tight text-[var(--text)]">{value}</span>
      {hint && (
        <span className="font-body text-[10px] leading-snug text-[var(--text-2)]">{hint}</span>
      )}
    </div>
  );
}

export default function OnChainAnalyticsPage() {
  const [data, setData] = useState<OnChainAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/stats/on-chain')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load on-chain analytics.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))]">
      <div className="mx-auto flex w-full max-w-[400px] flex-col gap-5 py-2">
        <div className="flex flex-col items-center gap-3 text-center">
          <ThemeLogo className="scale-90" />
          <div>
            <h1 className="font-ui text-xl font-bold text-[var(--text)]">On-chain analytics</h1>
            <p className="mt-1 font-body text-xs text-[var(--text-dim)]">
              Contract activity and treasury — no player game stats
            </p>
          </div>
        </div>

        {error ? (
          <p className="py-12 text-center font-body text-sm text-[var(--text-dim)]">{error}</p>
        ) : !data ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-mid)] border-t-[var(--accent)]" />
            <span className="font-body text-sm text-[var(--text-dim)]">Loading on-chain data…</span>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <section className="theme-sky-readout flex flex-col gap-3 p-4">
              <h2 className="font-ui text-sm font-bold text-[var(--text)]">Smart contract</h2>
              <div className="flex flex-col gap-1 font-body text-xs text-[var(--text-2)]">
                <span>{data.chain}</span>
                <span className="break-all font-mono text-[11px]">{data.contractAddress}</span>
              </div>
              <a
                href={data.celoscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-ui text-xs font-bold uppercase tracking-wide text-[var(--accent)] hover:underline"
              >
                View on Celoscan
                <ExternalLink size={14} />
              </a>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-ui text-sm font-bold text-[var(--text)]">
                Last {data.windowDays} days (estimated)
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="Est. on-chain txs"
                  value={data.activity.estimatedOnChainTxInWindow.toLocaleString()}
                  hint={`~${data.activity.movingAverageDailyOnChainTx}/day avg`}
                />
                <MetricCard
                  label="PvP matches settled"
                  value={data.activity.pvpGamesInWindow.toLocaleString()}
                />
                <MetricCard
                  label="Cipher games tracked"
                  value={data.activity.cipherGamesInWindow.toLocaleString()}
                />
                <MetricCard
                  label="Completed games (window)"
                  value={data.activity.completedGamesInWindow.toLocaleString()}
                />
              </div>
            </section>

            {data.treasury && (
              <section className="flex flex-col gap-2">
                <h2 className="font-ui text-sm font-bold text-[var(--text)]">Live contract treasury</h2>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="Reward pool"
                    value={`${parseFloat(data.treasury.rewardPoolUsdt).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`}
                  />
                  <MetricCard
                    label="Escrow balance"
                    value={`${parseFloat(data.treasury.escrowBalanceUsdt).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`}
                  />
                  <MetricCard
                    label="Accumulated fees"
                    value={`${parseFloat(data.treasury.accumulatedFeesUsdt).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`}
                  />
                </div>
              </section>
            )}

            <section className="theme-sky-readout flex flex-col gap-3 p-4">
              <h2 className="font-ui text-sm font-bold text-[var(--text)]">Transaction model</h2>
              <p className="font-body text-xs leading-relaxed text-[var(--text-2)]">{data.txModel.note}</p>
              <div className="flex flex-col gap-2 font-body text-xs text-[var(--text-2)]">
                <p>
                  <span className="font-bold text-[var(--text)]">Cipher:</span>{' '}
                  {data.txModel.cipher.txsPerGame}× {data.txModel.cipher.method}
                </p>
                <p>
                  <span className="font-bold text-[var(--text)]">PvP:</span>{' '}
                  {data.txModel.pvp.txsPerGame}× ({data.txModel.pvp.methods.join(' → ')})
                </p>
              </div>
            </section>

            <section className="theme-sky-readout flex flex-col gap-3 p-4">
              <h2 className="font-ui text-sm font-bold text-[var(--text)]">Sample transactions</h2>
              <ul className="flex flex-col gap-2">
                {data.sampleTransactions.map((sample) => (
                  <li key={sample.method} className="font-body text-xs text-[var(--text-2)]">
                    {sample.url ? (
                      <a
                        href={sample.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                      >
                        {sample.method}
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span>{sample.method} — sample pending</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <p className="text-center font-body text-[10px] text-[var(--text-dim)]">
              JSON API:{' '}
              <a href="/api/stats/on-chain" className="text-[var(--accent)] hover:underline">
                /api/stats/on-chain
              </a>
            </p>
          </motion.div>
        )}

        <Link
          href="/"
          className="pb-4 text-center font-ui text-xs font-bold uppercase tracking-widest text-[var(--accent)] underline underline-offset-4 transition-colors hover:text-[var(--accent-bright)]"
        >
          Back to Crack My Code
        </Link>
      </div>
    </div>
  );
}
