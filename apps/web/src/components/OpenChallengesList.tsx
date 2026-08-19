'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type { OpenGameItem } from '@/components/OpenGamesPanel';

const MATCH_EXPIRY_SECONDS = 300;

function modeLabel(mode: string) {
  if (mode === 'ai') return 'Cipher AI';
  if (mode === 'cash') return 'Staked';
  return 'Friendly PvP';
}

function modeIcon(mode: string) {
  if (mode === 'ai') return '🤖';
  if (mode === 'cash') return '💰';
  return '⚔️';
}

function TimeRemaining({ createdAt }: { createdAt?: string }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!createdAt) return MATCH_EXPIRY_SECONDS;
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    return Math.max(0, MATCH_EXPIRY_SECONDS - elapsed);
  });

  useEffect(() => {
    if (!createdAt) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      const remaining = Math.max(0, MATCH_EXPIRY_SECONDS - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isLow = timeLeft < 60;

  return (
    <span className={`font-code text-sm font-bold ${isLow ? 'text-red-400' : 'text-[var(--orange)]'}`}>
      {minutes}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}

interface OpenChallengesListProps {
  isConnected: boolean;
  myActiveGames: OpenGameItem[];
  onCancelOpenChallenge: (gameId: string, onChainMatchId?: string) => Promise<void>;
  isCancellingId: string | null;
}

export default function OpenChallengesList({
  isConnected,
  myActiveGames,
  onCancelOpenChallenge,
  isCancellingId,
}: OpenChallengesListProps) {
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="text-4xl" aria-hidden>🔓</span>
        <p className="font-body text-sm text-[var(--text-dim)] max-w-[240px]">
          Connect your wallet to view and manage your open challenges.
        </p>
      </div>
    );
  }

  if (myActiveGames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="text-4xl" aria-hidden>📭</span>
        <p className="font-ui text-sm font-bold text-[var(--text)]">No open challenges</p>
        <p className="font-body text-sm text-[var(--text-dim)] max-w-[260px]">
          Create a match from Home. Invite-only challenges show a Game ID to share.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {myActiveGames.map((game) => (
        <motion.div
          key={game.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="theme-sky-readout flex flex-col gap-3 rounded-2xl p-4"
        >
          {/* Top row: mode + time remaining */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>{modeIcon(game.mode)}</span>
              <div className="flex flex-col">
                <span className="font-ui text-xs font-black uppercase tracking-wider text-[var(--text)]">
                  {modeLabel(game.mode)}
                </span>
                <span className="font-body text-[10px] text-[var(--text-dim)]">
                  {game.isPublic ? 'Public matchmaking' : 'Invite only'}
                  {game.mode === 'cash' && ` · ${game.stake} USDT`}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-body text-[9px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Expires</span>
              <TimeRemaining createdAt={game.createdAt} />
            </div>
          </div>

          {/* Join code row for invite-only */}
          {!game.isPublic && (game.joinCode || game.id) && (
            <div
              onClick={() => {
                const code = game.joinCode || game.id;
                navigator.clipboard.writeText(code);
                toast.success('Game ID copied!');
              }}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--border-mid)] bg-[var(--bg-elevated)] px-3 py-2 transition-all hover:bg-[var(--bg-elevated)]/80"
            >
              <span className="font-code text-xs font-bold tracking-widest text-[var(--accent)]">
                {game.joinCode || game.id}
              </span>
              <span className="font-ui text-[9px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                Copy
              </span>
            </div>
          )}

          {/* Cancel button */}
          <button
            type="button"
            disabled={isCancellingId === game.id}
            onClick={() => onCancelOpenChallenge(game.id, game.onChainMatchId ?? undefined)}
            className="w-full rounded-xl border-2 border-red-500/20 bg-red-500/5 py-2.5 font-ui text-[10px] font-black uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/15 active:scale-[0.98] disabled:opacity-50"
          >
            {isCancellingId === game.id ? 'Cancelling…' : 'Cancel Challenge'}
          </button>
        </motion.div>
      ))}
    </div>
  );
}
