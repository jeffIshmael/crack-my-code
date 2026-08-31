'use client';

import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { CODE_LENGTH } from '@/lib/game';

export const SETUP_CODE_TIMEOUT_SEC = 120;

interface OpponentCodeWaitOverlayProps {
  opponentName: string;
  setupCodeTime?: number;
  onLeave?: () => void;
  isLeaving?: boolean;
}

export default function OpponentCodeWaitOverlay({
  opponentName,
  setupCodeTime = 0,
  onLeave,
  isLeaving = false,
}: OpponentCodeWaitOverlayProps) {
  const timeLeft = Math.max(0, SETUP_CODE_TIMEOUT_SEC - setupCodeTime);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#030C15]/80 p-6 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="opponent-code-wait-title"
      aria-describedby="opponent-code-wait-desc"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="theme-sky-readout flex w-full max-w-[340px] flex-col items-center gap-5 px-5 py-6"
      >
        {/* Opponent badge */}
        <div className="flex items-center gap-2 rounded-full border-2 border-[var(--wood-dark)] bg-[var(--cream)] px-3 py-1 shadow-[var(--pop-shadow)]">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--orange)', boxShadow: '0 0 8px var(--orange)' }}
          />
          <span className="font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--wood-text)]">
            vs {opponentName}
          </span>
        </div>

        {/* Your code locked */}
        <div className="set-code-badge w-full justify-center !bg-[rgba(88,199,110,0.15)] !border-[#2d8a42]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d8a42" strokeWidth="2.5">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          Your code is locked in
        </div>

        {/* Opponent code slots */}
        <div className="scoreboard-plaque w-full">
          <div className="scoreboard-plaque__header">
            <span className="scoreboard-plaque__header-label">You</span>
            <span className="scoreboard-plaque__header-count">Ready</span>
            <span className="scoreboard-plaque__header-label justify-self-end text-right">
              {opponentName}
            </span>
          </div>
          <div className="scoreboard-frame">
            <div className="flex justify-center gap-2.5">
              {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                <motion.div
                  key={i}
                  className="set-code-slot"
                  animate={{
                    opacity: [0.45, 1, 0.45],
                    scale: [0.98, 1, 0.98],
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    delay: i * 0.18,
                    ease: 'easeInOut',
                  }}
                >
                  <div className="set-code-tile set-code-tile--empty flex items-center justify-center">
                    <motion.div
                      animate={{ opacity: [0.25, 0.85, 0.25], y: [0, -2, 0] }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        delay: i * 0.18,
                        ease: 'easeInOut',
                      }}
                    >
                      <Lock size={16} className="text-[var(--wood-text-soft)]" strokeWidth={2.5} />
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center">
            {[1, 2].map((ring) => (
              <motion.div
                key={ring}
                className="absolute rounded-full border-2 border-[var(--accent)]/40"
                initial={{ width: 28, height: 28, opacity: 0.6 }}
                animate={{ width: 56, height: 56, opacity: 0 }}
                transition={{ duration: 1.6, delay: ring * 0.5, repeat: Infinity, ease: 'easeOut' }}
              />
            ))}
            <div
              className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[var(--accent-dim)]"
              style={{ boxShadow: '0 0 16px var(--accent-glow)' }}
            >
              <Lock size={20} className="text-[var(--accent)]" strokeWidth={2.5} />
            </div>
          </div>

          <h3
            id="opponent-code-wait-title"
            className="font-ui text-lg font-bold text-[var(--wood-text)]"
          >
            Waiting for their code
          </h3>
          <p
            id="opponent-code-wait-desc"
            className="font-body max-w-[260px] text-sm leading-relaxed text-[var(--wood-text-soft)]"
          >
            <span className="font-semibold text-[var(--accent)]">{opponentName}</span>{' '}
            is choosing a secret 4-digit code. The match starts when they lock it in.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 pt-1 w-full">
          <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--orange)]/30 bg-[var(--orange)]/10 px-4 py-2">
            <span className="font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--orange)]/70">
              Auto-cancel in
            </span>
            <span className="font-code text-base font-black text-[var(--orange)]">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                animate={{ scale: [1, 1.4, 1], opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>

          {onLeave && (
            <button
              type="button"
              onClick={onLeave}
              disabled={isLeaving}
              className="mt-1 w-full rounded-2xl border-2 border-red-500/20 bg-red-500/5 py-3.5 font-ui text-[10px] font-black uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/15 active:scale-[0.98] disabled:opacity-50"
            >
              {isLeaving ? 'Leaving…' : 'Leave match'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
