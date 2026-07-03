'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import JoinChallenge from '@/components/JoinChallenge';

type OpenTab = 'join' | 'challenges';

export interface OpenGameItem {
  id: string;
  joinCode?: string | null;
  mode: string;
  stake: number;
  player1Address: string;
  onChainMatchId?: string | null;
  isPublic?: boolean;
}

interface OpenGamesPanelProps {
  joinGameIdInput: string;
  onJoinGameIdInputChange: (value: string) => void;
  onJoinByGameId: () => void;
  isJoining: boolean;
  isConnected: boolean;
  myActiveGames: OpenGameItem[];
  onCancelOpenChallenge: (gameId: string, onChainMatchId?: string) => Promise<void>;
  isCancellingId: string | null;
}

export default function OpenGamesPanel({
  joinGameIdInput,
  onJoinGameIdInputChange,
  onJoinByGameId,
  isJoining,
  isConnected,
  myActiveGames,
  onCancelOpenChallenge,
  isCancellingId,
}: OpenGamesPanelProps) {
  const [openTab, setOpenTab] = useState<OpenTab>('join');

  useEffect(() => {
    if (joinGameIdInput.trim()) setOpenTab('join');
  }, [joinGameIdInput]);

  return (
    <div className="flex flex-col gap-3">
      <div className="theme-tab-switcher">
        <button
          type="button"
          onClick={() => setOpenTab('join')}
          className={`theme-tab-switcher__btn text-[10px] font-black uppercase tracking-widest ${
            openTab === 'join'
              ? 'theme-tab-switcher__btn--active'
              : 'theme-tab-switcher__btn--inactive'
          }`}
        >
          Join Challenge
        </button>
        <button
          type="button"
          onClick={() => setOpenTab('challenges')}
          className={`theme-tab-switcher__btn text-[10px] font-black uppercase tracking-widest ${
            openTab === 'challenges'
              ? 'theme-tab-switcher__btn--active'
              : 'theme-tab-switcher__btn--inactive'
          }`}
        >
          My Open Challenges
        </button>
      </div>

      <AnimatePresence mode="wait">
        {openTab === 'join' ? (
          <motion.div
            key="join-tab"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <JoinChallenge
              value={joinGameIdInput}
              onChange={onJoinGameIdInputChange}
              onJoin={onJoinByGameId}
              isJoining={isJoining}
              disabled={!isConnected}
            />
          </motion.div>
        ) : (
          <motion.div
            key="challenges-tab"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-col gap-3"
          >
            {!isConnected ? (
              <p className="py-8 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)]">
                Connect wallet to manage challenges
              </p>
            ) : myActiveGames.length > 0 ? (
              myActiveGames.map((game) => (
                <div
                  key={game.id}
                  className="theme-sky-readout flex flex-col gap-3 p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)]">
                      {game.isPublic ? 'Public search' : game.mode === 'cash' ? `${game.stake} USDT` : 'Invite only'}
                    </span>
                    {!game.isPublic && (game.joinCode || game.id) && (
                      <span className="font-code text-xs font-bold tracking-widest text-[var(--accent)]">
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
                        className="flex-1 rounded-lg border border-[var(--border-mid)] py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--accent-bright)]"
                      >
                        Copy ID
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isCancellingId === game.id}
                      onClick={() => onCancelOpenChallenge(game.id, game.onChainMatchId ?? undefined)}
                      className={`rounded-lg border-2 border-red-500/20 bg-red-500/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-500 disabled:opacity-50 ${game.isPublic ? 'w-full' : ''}`}
                    >
                      {isCancellingId === game.id ? 'Closing...' : game.isPublic ? 'Cancel search' : 'Cancel'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center py-16 text-center opacity-40">
                <span className="text-[10px] font-black uppercase tracking-widest">
                  No open challenges — create an invite-only match from Home
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
