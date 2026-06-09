'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface LeaderboardEntry {
  rank: number;
  address: string;
  name: string | null;
  points: number;
  rating: number;
}

interface LeaderboardPanelProps {
  currentAddress?: string;
}

function formatAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function rankEmoji(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export function LeaderboardPanel({ currentAddress }: LeaderboardPanelProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/leaderboard');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        if (!cancelled) setEntries(data.leaderboard ?? []);
      } catch {
        if (!cancelled) setError('Could not load leaderboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>🏆</span>
          <h2 className="font-ui text-xl font-bold text-[var(--text)]">CMC Leaderboard</h2>
        </div>
        <p className="font-body text-sm text-[var(--text-2)]">
          Players ranked by CMC balance. Win matches to climb the board.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-mid)] border-t-[var(--accent)]" />
          <span className="font-body text-sm text-[var(--text-dim)]">Loading ranks…</span>
        </div>
      ) : error ? (
        <p className="py-12 text-center font-body text-sm text-[var(--text-dim)]">{error}</p>
      ) : entries.length === 0 ? (
        <p className="py-12 text-center font-body text-sm text-[var(--text-dim)]">
          No players on the board yet. Be the first to earn CMC!
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => {
            const isYou =
              currentAddress &&
              entry.address.toLowerCase() === currentAddress.toLowerCase();

            return (
              <motion.div
                key={entry.address}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(entry.rank * 0.03, 0.3) }}
                className={`flex items-center justify-between rounded-2xl border-2 px-4 py-3 ${
                  isYou
                    ? 'border-[var(--accent)] bg-[#E8F4FC]'
                    : 'border-[var(--border-mid)] bg-white/70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 flex-shrink-0 text-center font-ui text-sm font-bold text-[var(--text)]">
                    {rankEmoji(entry.rank)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-ui text-sm font-bold text-[var(--text)]">
                      {entry.name || formatAddress(entry.address)}
                      {isYou ? ' (You)' : ''}
                    </p>
                    <p className="font-body text-xs text-[var(--text-dim)]">
                      {formatAddress(entry.address)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <span className="theme-playful-coin font-ui" aria-hidden>CMC</span>
                  <span className="font-ui text-sm font-bold text-[var(--text)]">
                    {entry.points.toLocaleString()}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
