'use client';

import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type { OpenGameItem } from '@/components/OpenGamesPanel';

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
          className="theme-card flex flex-col gap-3 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="font-body text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
              {game.isPublic ? 'Public search' : game.mode === 'cash' ? `${game.stake} USDT` : 'Invite only'}
            </span>
            {!game.isPublic && (game.joinCode || game.id) && (
              <span className="font-ui text-xs font-bold tracking-wider text-[var(--accent)]">
                {game.joinCode || game.id}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {!game.isPublic && (
              <button
                type="button"
                onClick={() => {
                  const code = game.joinCode || game.id;
                  navigator.clipboard.writeText(code);
                  toast.success('Game ID copied!');
                }}
                className="theme-game-btn theme-game-btn--ai flex-1 min-h-0 py-2.5"
              >
                <span className="theme-game-btn__title text-xs">Copy ID</span>
              </button>
            )}
            <button
              type="button"
              disabled={isCancellingId === game.id}
              onClick={() => onCancelOpenChallenge(game.id, game.onChainMatchId ?? undefined)}
              className={`rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2.5 font-ui text-xs font-bold text-red-500 disabled:opacity-50 ${game.isPublic ? 'w-full' : ''}`}
            >
              {isCancellingId === game.id ? 'Closing…' : game.isPublic ? 'Cancel search' : 'Cancel'}
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
