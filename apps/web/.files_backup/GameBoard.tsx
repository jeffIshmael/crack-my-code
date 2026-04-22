'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GuessRow, { EmptyGuessRow } from '@/components/GuessRow';
import NumberPad from '@/components/NumberPad';
import type { GuessEntry } from '@/lib/game';
import { CODE_LENGTH, MAX_GUESSES } from '@/lib/game';

interface GameBoardProps {
  playerGuesses: GuessEntry[];
  opponentGuessCount: number;
  currentInput: number[];
  isPlayerTurn: boolean;
  timeLeft: number;
  opponentName: string;
  onDigitPress: (d: number) => void;
  onDelete: () => void;
  onSubmit: () => void;
}

export default function GameBoard({
  playerGuesses,
  opponentGuessCount,
  currentInput,
  isPlayerTurn,
  timeLeft,
  opponentName,
  onDigitPress,
  onDelete,
  onSubmit,
}: GameBoardProps) {
  const historyRef = useRef<HTMLDivElement>(null);
  const canSubmit = isPlayerTurn && currentInput.length === CODE_LENGTH;

  // Auto-scroll history to bottom
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [playerGuesses.length]);

  const timerPct = (timeLeft / 60) * 100;
  const timerColor =
    timeLeft > 30 ? 'var(--accent)' :
    timeLeft > 10 ? 'var(--clue-yellow)' :
    'var(--orange)';
  const isUrgent = timeLeft <= 10;

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ maxWidth: '420px', margin: '0 auto', padding: '0 16px' }}
    >

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 pb-3 pt-8">

        {/* Timer */}
        <motion.div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{
            background: isUrgent ? 'rgba(255,107,43,0.1)' : 'var(--bg-card)',
            border: `1px solid ${isUrgent ? 'rgba(255,107,43,0.4)' : 'var(--border-mid)'}`,
          }}
          animate={isUrgent ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={timerColor} strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span
            className="font-code text-sm font-bold tabular-nums"
            style={{ color: timerColor, minWidth: '28px' }}
          >
            {String(Math.floor(timeLeft / 60)).padStart(2,'0')}:{String(timeLeft % 60).padStart(2,'0')}
          </span>
        </motion.div>

        {/* Timer bar */}
        <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--bg-elevated)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: timerColor, boxShadow: `0 0 8px ${timerColor}40` }}
            animate={{ width: `${timerPct}%` }}
            transition={{ duration: 0.9, ease: 'linear' }}
          />
        </div>

        {/* Turn badge */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isPlayerTurn ? 'your' : 'opp'}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"
            style={{
              background: isPlayerTurn ? 'var(--accent-dim)' : 'var(--orange-dim)',
              color: isPlayerTurn ? 'var(--accent)' : 'var(--orange)',
              border: `1px solid ${isPlayerTurn ? 'var(--border-bright)' : 'rgba(255,107,43,0.3)'}`,
              whiteSpace: 'nowrap',
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: isPlayerTurn ? 'var(--accent)' : 'var(--orange)' }}
              animate={isPlayerTurn ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            {isPlayerTurn ? 'Your Turn' : 'Their Turn'}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Opponent progress bar ── */}
      <motion.div
        className="mb-3 flex items-center gap-3 rounded-2xl p-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        animate={!isPlayerTurn ? { borderColor: 'rgba(255,107,43,0.3)' } : { borderColor: 'var(--border)' }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold"
          style={{ background: 'var(--orange-dim)', color: 'var(--orange)', fontFamily: 'Space Mono, monospace' }}
        >
          {opponentName.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
              {opponentName}
            </span>
            <span className="font-code text-xs" style={{ color: 'var(--orange)' }}>
              {opponentGuessCount} guess{opponentGuessCount !== 1 ? 'es' : ''}
            </span>
          </div>
          {/* Guess attempt pips */}
          <div className="flex gap-1">
            {Array.from({ length: MAX_GUESSES }).map((_, i) => (
              <motion.div
                key={i}
                className="h-1.5 flex-1 rounded-full"
                style={{ background: i < opponentGuessCount ? 'var(--orange)' : 'var(--text-dim)' }}
                animate={i < opponentGuessCount ? { opacity: [0.6, 1] } : {}}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              />
            ))}
          </div>
        </div>
        {!isPlayerTurn && (
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ color: 'var(--orange)' }}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          </motion.div>
        )}
      </motion.div>

      {/* ── Section label ── */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>
          Your Guesses
        </span>
        <span className="font-code text-xs" style={{ color: 'var(--text-dim)' }}>
          {playerGuesses.length}/{MAX_GUESSES}
        </span>
      </div>

      {/* ── Guess history ── */}
      <div
        ref={historyRef}
        className="mb-3 flex flex-col gap-2 overflow-y-auto pr-1"
        style={{ maxHeight: '220px', minHeight: '80px' }}
      >
        {playerGuesses.map((g, i) => (
          <GuessRow key={g.id} digits={g.digits} clues={g.clues} rowIndex={i} />
        ))}
        {/* Empty rows */}
        {Array.from({ length: Math.max(0, Math.min(3, MAX_GUESSES - playerGuesses.length)) }).map((_, i) => (
          <EmptyGuessRow key={`empty-${i}`} rowIndex={playerGuesses.length + i} />
        ))}
      </div>

      {/* ── Divider ── */}
      <div className="mb-3 h-px w-full" style={{ background: 'var(--border-mid)' }} />

      {/* ── Current input display ── */}
      <div className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>
            {isPlayerTurn ? 'Your Guess' : 'Waiting…'}
          </span>
          {isPlayerTurn && (
            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
              No repeats
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {Array.from({ length: CODE_LENGTH }).map((_, i) => {
            const filled = i < currentInput.length;
            const isNext = i === currentInput.length;
            return (
              <motion.div
                key={i}
                className="flex h-14 flex-1 items-center justify-center rounded-xl"
                style={{
                  background: filled ? 'var(--bg-elevated)' : 'var(--bg-card)',
                  border: `2px solid ${
                    filled ? 'var(--border-bright)' :
                    isNext && isPlayerTurn ? 'var(--border-mid)' :
                    'var(--border)'
                  }`,
                  boxShadow: filled ? '0 0 12px var(--accent-glow)' : 'none',
                }}
              >
                <AnimatePresence mode="popLayout">
                  {filled ? (
                    <motion.span
                      key={currentInput[i]}
                      className="font-code text-2xl font-bold"
                      style={{ color: 'var(--accent)' }}
                      initial={{ scale: 0, opacity: 0, y: -8 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
                    >
                      {currentInput[i]}
                    </motion.span>
                  ) : isNext && isPlayerTurn ? (
                    <motion.div
                      key="cursor"
                      className="h-6 w-0.5 rounded-full"
                      style={{ background: 'var(--accent)' }}
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.85, repeat: Infinity }}
                    />
                  ) : null}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Number pad ── */}
      <div className="mb-3 flex-1">
        <NumberPad
          usedDigits={currentInput}
          disabled={!isPlayerTurn}
          onDigit={onDigitPress}
          onDelete={onDelete}
        />
      </div>

      {/* ── Submit button ── */}
      <motion.button
        onClick={onSubmit}
        disabled={!canSubmit}
        className="mb-4 w-full rounded-2xl py-4 font-orbitron text-base font-bold tracking-widest"
        style={{
          background: canSubmit
            ? 'linear-gradient(135deg, #0099CC 0%, #00CFFF 60%, #0099CC 100%)'
            : 'var(--clue-gray)',
          color: canSubmit ? '#030C15' : 'var(--text-dim)',
          boxShadow: canSubmit ? '0 4px 20px var(--accent-glow)' : 'none',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s',
        }}
        animate={canSubmit ? { boxShadow: ['0 4px 20px rgba(0,207,255,0.3)', '0 4px 28px rgba(0,207,255,0.55)', '0 4px 20px rgba(0,207,255,0.3)'] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
        whileTap={canSubmit ? { scale: 0.97 } : {}}
      >
        {!isPlayerTurn ? (
          <span className="flex items-center justify-center gap-2">
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ···
            </motion.span>
            OPPONENT THINKING
          </span>
        ) : canSubmit ? (
          'SUBMIT GUESS →'
        ) : (
          `ENTER ${CODE_LENGTH - currentInput.length} MORE DIGIT${CODE_LENGTH - currentInput.length !== 1 ? 'S' : ''}`
        )}
      </motion.button>
    </div>
  );
}
