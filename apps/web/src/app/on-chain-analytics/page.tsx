'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { ThemeLogo } from '@/components/ThemeLogo';

interface OnChainAnalytics {
  contractAddress: string;
  celoscanUrl: string;
  chain: string;
  activity: {
    totalOnChainTx: number;
    onChainTxLast14Days: number;
    onChainTxLast2Days: number;
  };
  txModel: {
    cipher: { method: string; txsPerGame: number; note: string };
    pvp: {
      methods: string[];
      alternateMethods: string[];
      txsPerGame: number;
      note: string;
    };
  };
  treasury: {
    accumulatedFeesUsdt: string;
    escrowBalanceUsdt: string;
    rewardPoolUsdt: string;
    contractBalanceUsdt?: string;
    readAt: string;
  } | null;
  sampleTransactions: ReadonlyArray<{ method: string; url: string | null }>;
  updatedAt: string;
}

/** 2 decimals for non-zero treasury amounts; plain "0" when empty. */
function formatTreasuryUsdt(raw: string): string {
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n === 0) return '0';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function UsdtAmount({ amount }: { amount: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/usdt-logo.webp" alt="" width={18} height={18} className="shrink-0" aria-hidden />
      <span>{formatTreasuryUsdt(amount)}</span>
      <span className="font-ui text-sm font-bold text-[var(--text-dim)]">USDT</span>
    </span>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
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
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`/api/stats/on-chain?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError('Could not load on-chain analytics.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))]">
      <div className="mx-auto flex w-full max-w-[400px] flex-col gap-5 py-2">
        <div className="flex flex-col items-center gap-3 text-center">
          <ThemeLogo className="scale-90" />
          <div>
            <h1 className="font-ui text-xl font-bold text-[var(--text)]">On-chain analytics</h1>
            <p className="mt-1 font-body text-xs text-[var(--text-dim)]">
              Live contract reads and estimated Celo transactions
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-mid)] px-3 py-1.5 font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)] disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
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
              <h2 className="font-ui text-sm font-bold text-[var(--text)]">On-chain transactions</h2>
              <div className="grid grid-cols-1 gap-3">
                <MetricCard
                  label="Total on-chain txs"
                  value={data.activity.totalOnChainTx.toLocaleString()}
                  hint="Estimated from settled PvP matches (3 txs each)"
                />
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="Last 14 days"
                    value={data.activity.onChainTxLast14Days.toLocaleString()}
                  />
                  <MetricCard
                    label="Last 2 days"
                    value={data.activity.onChainTxLast2Days.toLocaleString()}
                  />
                </div>
              </div>
            </section>

            {data.treasury && (
              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-ui text-sm font-bold text-[var(--text)]">Live treasury</h2>
                  <span className="font-body text-[9px] text-[var(--text-dim)]">
                    Updated {new Date(data.treasury.readAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="Escrow (locked stakes)"
                    value={<UsdtAmount amount={data.treasury.escrowBalanceUsdt} />}
                  />
                  <MetricCard
                    label="Reward pool"
                    value={<UsdtAmount amount={data.treasury.rewardPoolUsdt} />}
                  />
                  <MetricCard
                    label="Accumulated fees"
                    value={<UsdtAmount amount={data.treasury.accumulatedFeesUsdt} />}
                  />
                  {data.treasury.contractBalanceUsdt != null && (
                    <MetricCard
                      label="Contract USDT balance"
                      value={<UsdtAmount amount={data.treasury.contractBalanceUsdt} />}
                    />
                  )}
                </div>
              </section>
            )}

            <section className="theme-sky-readout flex flex-col gap-3 p-4">
              <h2 className="font-ui text-sm font-bold text-[var(--text)]">Transaction model</h2>
              <div className="flex flex-col gap-3 font-body text-xs leading-relaxed text-[var(--text-2)]">
                <p>
                  <span className="font-bold text-[var(--text)]">Cipher:</span>{' '}
                  {data.txModel.cipher.note}
                </p>
                <p>
                  <span className="font-bold text-[var(--text)]">PvP:</span>{' '}
                  {data.txModel.pvp.txsPerGame} txs —{' '}
                  {data.txModel.pvp.methods.slice(0, 2).join(' → ')} → (
                  {data.txModel.pvp.methods[2]} or {data.txModel.pvp.alternateMethods[0]})
                </p>
                <p className="text-[var(--text-dim)]">{data.txModel.pvp.note}</p>
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
                      <span>{sample.method}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <p className="text-center font-body text-[10px] text-[var(--text-dim)]">
              Live JSON:{' '}
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
