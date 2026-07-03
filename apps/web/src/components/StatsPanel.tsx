'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { formatLastPlayed } from '@/lib/stats';

interface MyStats {
  totalPlayed: number;
  cipherPlayed: number;
  opponentPlayed: number;
  totalWon: number;
  cipherWon: number;
  opponentWon: number;
  totalLost: number;
  cipherLost: number;
  opponentLost: number;
  lastPlayedAt: string | null;
}

interface GlobalStats {
  totalUsers: number;
  totalPlayed: number;
  cipherPlayed: number;
  opponentPlayed: number;
  cipherWins: number;
  playedToday: number;
}

interface StatsPanelProps {
  address?: string;
  onBack: () => void;
}

type StatsView = 'me' | 'all';

function StatCard({
  emoji,
  label,
  value,
  breakdown,
}: {
  emoji: string;
  label: string;
  value: string | number;
  breakdown?: { cipher: number; opponent: number };
}) {
  return (
    <div className="theme-sky-readout flex h-full flex-col gap-2.5 p-3.5">
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none" aria-hidden>
          {emoji}
        </span>
        <span className="font-body text-[9px] font-bold uppercase leading-tight tracking-wider text-[var(--text-dim)]">
          {label}
        </span>
      </div>
      <span className="font-ui text-2xl font-bold leading-tight text-[var(--text)]">{value}</span>
      {breakdown && (
        <div className="flex flex-col gap-1 border-t border-[var(--border-mid)] pt-2.5">
          <div className="flex items-center justify-between gap-1 font-body text-[10px] text-[var(--text-2)]">
            <span>vs Cipher AI 🤖 </span>
            <span className="font-ui font-bold text-[var(--text)]">{breakdown.cipher.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-1 font-body text-[10px] text-[var(--text-2)]">
            <span>vs Opponent 👥</span>
            <span className="font-ui font-bold text-[var(--text)]">{breakdown.opponent.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function StatsPanel({ address, onBack }: StatsPanelProps) {
  const [view, setView] = useState<StatsView>('me');
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (view === 'me') {
          if (!address) {
            if (!cancelled) {
              setMyStats(null);
              setLoading(false);
            }
            return;
          }

          const res = await fetch(`/api/stats?scope=me&address=${encodeURIComponent(address)}`);
          if (!res.ok) throw new Error('Failed to load my stats');
          const data = await res.json();
          if (!cancelled) setMyStats(data.my ?? null);
        } else {
          const res = await fetch('/api/stats?scope=all');
          if (!res.ok) throw new Error('Failed to load global stats');
          const data = await res.json();
          if (!cancelled) setGlobalStats(data.global ?? null);
        }
      } catch {
        if (!cancelled) setError('Could not load stats.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [view, address]);

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border-mid)] bg-[var(--bg-elevated)] text-[var(--text-dim)] transition-colors hover:brightness-[0.98]"
          aria-label="Back to settings"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h2 className="font-ui text-xl font-bold text-[var(--text)]">Stats</h2>
          <p className="font-body text-xs text-[var(--text-dim)]">Track your games and platform activity</p>
        </div>
      </div>

      <div className="theme-tab-switcher">
        {([
          { id: 'me' as const, label: 'My stats' },
          { id: 'all' as const, label: 'All stats' },
        ]).map((tab) => {
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={`theme-tab-switcher__btn ${
                active ? 'theme-tab-switcher__btn--active' : 'theme-tab-switcher__btn--inactive'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-mid)] border-t-[var(--accent)]" />
          <span className="font-body text-sm text-[var(--text-dim)]">Loading stats…</span>
        </div>
      ) : error ? (
        <p className="py-12 text-center font-body text-sm text-[var(--text-dim)]">{error}</p>
      ) : view === 'me' ? (
        !address ? (
          <div className="theme-sky-readout flex flex-col items-center gap-3 p-8 text-center">
            <span className="text-4xl" aria-hidden>
              👛
            </span>
            <p className="font-body text-sm text-[var(--text-dim)] max-w-[240px]">
              Connect your wallet to see your personal game stats.
            </p>
          </div>
        ) : myStats ? (
          <motion.div
            key="my-stats"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            <StatCard
              emoji="🎮"
              label="Total games played"
              value={myStats.totalPlayed.toLocaleString()}
              breakdown={{ cipher: myStats.cipherPlayed, opponent: myStats.opponentPlayed }}
            />
            <StatCard
              emoji="🏆"
              label="Total games won"
              value={myStats.totalWon.toLocaleString()}
              breakdown={{ cipher: myStats.cipherWon, opponent: myStats.opponentWon }}
            />
            <StatCard
              emoji="💔"
              label="Total games lost"
              value={myStats.totalLost.toLocaleString()}
              breakdown={{ cipher: myStats.cipherLost, opponent: myStats.opponentLost }}
            />
            <StatCard
              emoji="🕐"
              label="Last time you played"
              value={formatLastPlayed(myStats.lastPlayedAt)}
            />
          </motion.div>
        ) : null
      ) : globalStats ? (
        <motion.div
          key="all-stats"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          <StatCard emoji="👥" label="Total players" value={globalStats.totalUsers.toLocaleString()} />
          <StatCard
            emoji="🎮"
            label="Total games played"
            value={globalStats.totalPlayed.toLocaleString()}
            breakdown={{ cipher: globalStats.cipherPlayed, opponent: globalStats.opponentPlayed }}
          />
          <StatCard
            emoji="🤖"
            label="Games won by Cipher AI"
            value={globalStats.cipherWins.toLocaleString()}
          />
          <StatCard emoji="📅" label="Games played today" value={globalStats.playedToday.toLocaleString()} />
        </motion.div>
      ) : null}
    </div>
  );
}
