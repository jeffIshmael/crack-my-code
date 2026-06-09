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

const PODIUM_EMOJI: Record<1 | 2 | 3, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

function formatAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function displayName(entry: LeaderboardEntry, isYou = false) {
  if (isYou) return 'You';
  return entry.name || formatAddress(entry.address);
}

function PodiumCard({
  entry,
  place,
  isYou,
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  isYou: boolean;
}) {
  const placeClass =
    place === 1
      ? 'leaderboard-podium__slot--first'
      : place === 2
        ? 'leaderboard-podium__slot--second'
        : 'leaderboard-podium__slot--third';

  const ringClass =
    place === 1
      ? 'leaderboard-avatar-ring--first'
      : place === 2
        ? 'leaderboard-avatar-ring--second'
        : 'leaderboard-avatar-ring--third';

  const badgeClass =
    place === 1
      ? 'leaderboard-podium__rank-badge--first'
      : place === 2
        ? 'leaderboard-podium__rank-badge--second'
        : 'leaderboard-podium__rank-badge--third';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: place === 1 ? 0.25 : place === 2 ? 0.1 : 0.15, duration: 0.4 }}
      className={`leaderboard-podium__slot ${placeClass} ${isYou ? 'leaderboard-podium__slot--you' : ''}`}
    >
      <div className={`leaderboard-avatar-ring ${ringClass}`}>
        {place === 1 && (
          <span className="leaderboard-avatar-ring__crown" aria-hidden>
            👑
          </span>
        )}
        <span className="leaderboard-avatar-ring__inner" aria-hidden>
          {PODIUM_EMOJI[place]}
        </span>
      </div>
      <p className="leaderboard-podium__name">{displayName(entry, isYou)}</p>
      <div className="leaderboard-podium__score">
        <span className="leaderboard-podium__score-value">{entry.points.toLocaleString()}</span>
        <span className="leaderboard-podium__score-label">CMC</span>
      </div>
      <div className={`leaderboard-podium__rank-badge ${badgeClass}`}>{place}</div>
    </motion.div>
  );
}

function YourRankBanner({
  currentAddress,
  viewer,
}: {
  currentAddress?: string;
  viewer: LeaderboardEntry | null;
}) {
  if (!currentAddress) {
    return (
      <div className="leaderboard-your-rank leaderboard-your-rank--muted">
        <span className="leaderboard-your-rank__hint">Connect your wallet to see your rank</span>
      </div>
    );
  }

  if (!viewer) {
    return (
      <div className="leaderboard-your-rank leaderboard-your-rank--muted">
        <span className="leaderboard-your-rank__hint">Play a match to appear on the board</span>
      </div>
    );
  }

  return (
    <div className="leaderboard-your-rank">
      <span className="leaderboard-your-rank__label">Your rank</span>
      <div className="leaderboard-your-rank__body">
        <span className="leaderboard-your-rank__number">#{viewer.rank}</span>
        <span className="leaderboard-your-rank__name truncate">{displayName(viewer, true)}</span>
        <span className="leaderboard-your-rank__points">
          {viewer.points.toLocaleString()} <span className="leaderboard-your-rank__points-label">CMC</span>
        </span>
      </div>
    </div>
  );
}

function ListRow({ entry, isYou }: { entry: LeaderboardEntry; isYou: boolean }) {
  return (
    <div className={`leaderboard-row ${isYou ? 'leaderboard-row--you' : ''}`}>
      <span className="leaderboard-row__rank">{entry.rank}</span>
      <div className="leaderboard-row__info min-w-0">
        <p className="leaderboard-row__name truncate">{displayName(entry, isYou)}</p>
      </div>
      <div className="leaderboard-row__score">
        <span className="leaderboard-row__score-value">{entry.points.toLocaleString()}</span>
        <span className="leaderboard-row__score-label">CMC</span>
      </div>
    </div>
  );
}

export function LeaderboardPanel({ currentAddress }: LeaderboardPanelProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [viewer, setViewer] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = currentAddress ? `?address=${encodeURIComponent(currentAddress)}` : '';
        const res = await fetch(`/api/leaderboard${params}`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        if (!cancelled) {
          setEntries(data.leaderboard ?? []);
          setViewer(data.viewer ?? null);
        }
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
  }, [currentAddress]);

  const isYou = (address: string) =>
    !!currentAddress && address.toLowerCase() === currentAddress.toLowerCase();

  const first = entries.find((e) => e.rank === 1);
  const second = entries.find((e) => e.rank === 2);
  const third = entries.find((e) => e.rank === 3);

  const ranksFourToTen = entries.filter((e) => e.rank >= 4 && e.rank <= 10);
  const viewerInTopTen = viewer != null && viewer.rank <= 10;
  const showViewerPinned = viewer != null && !viewerInTopTen;

  const showListPanel = ranksFourToTen.length > 0 || showViewerPinned;

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <div className="leaderboard-header__top">
          <div className="leaderboard-header__titles">
            <h2 className="leaderboard-header__title">Leaderboard</h2>
            <p className="leaderboard-header__subtitle">Top players by CMC points</p>
          </div>
        </div>
      </div>

      {!loading && !error && (
        <YourRankBanner currentAddress={currentAddress} viewer={viewer} />
      )}

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
        <>
          {first && (
            <div className="leaderboard-podium-wrap">
              <div className="leaderboard-podium-banner">🏆 TOP 3</div>
              <div className="leaderboard-podium">
                {second ? (
                  <PodiumCard entry={second} place={2} isYou={isYou(second.address)} />
                ) : (
                  <div className="leaderboard-podium__spacer" aria-hidden />
                )}
                <PodiumCard entry={first} place={1} isYou={isYou(first.address)} />
                {third ? (
                  <PodiumCard entry={third} place={3} isYou={isYou(third.address)} />
                ) : (
                  <div className="leaderboard-podium__spacer" aria-hidden />
                )}
              </div>
            </div>
          )}

          {showListPanel && (
            <div className="leaderboard-panel-card">
              {ranksFourToTen.map((entry, index) => (
                <div key={entry.address}>
                  {index > 0 && <div className="leaderboard-row-divider" aria-hidden />}
                  <ListRow entry={entry} isYou={isYou(entry.address)} />
                </div>
              ))}

              {showViewerPinned && viewer && (
                <>
                  {ranksFourToTen.length > 0 && (
                    <div className="leaderboard-panel-divider" aria-hidden>
                      <span className="leaderboard-panel-divider__line" />
                      <span className="leaderboard-panel-divider__label">Your rank</span>
                      <span className="leaderboard-panel-divider__line" />
                    </div>
                  )}
                  <ListRow entry={viewer} isYou />
                </>
              )}
            </div>
          )}

          {entries.length <= 3 && !showListPanel && (
            <p className="text-center font-body text-xs text-[var(--text-dim)] pt-2">
              Win more matches to fill the board!
            </p>
          )}
        </>
      )}
    </div>
  );
}
