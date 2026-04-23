'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GuessRow, { EmptyGuessRow } from '@/components/GuessRow';
import NumberPad from '@/components/NumberPad';
import type { GuessEntry } from '@/lib/game';
import { CODE_LENGTH, MAX_GUESSES } from '@/lib/game';

interface GameBoardProps {
  playerGuesses: GuessEntry[];
  opponentGuesses: GuessEntry[];
  opponentGuessCount: number;
  currentInput: number[];
  opponentCurrentInput: number[];
  isPlayerTurn: boolean;
  opponentName: string;
  playerRating: number;
  isSubmitting?: boolean;
  onDigitPress: (d: number) => void;
  onDelete: () => void;
  onSubmit: () => void;
}

export default function GameBoard({
  playerGuesses,
  opponentGuesses,
  opponentGuessCount,
  currentInput,
  opponentCurrentInput,
  isPlayerTurn,
  opponentName,
  playerRating,
  isSubmitting = false,
  onDigitPress,
  onDelete,
  onSubmit,
}: GameBoardProps) {
  const historyRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'player' | 'opponent'>('player');
  const canSubmit = isPlayerTurn && currentInput.length === CODE_LENGTH;

  // Auto-switch view to opponent when it's their turn and they start typing
  useEffect(() => {
    if (!isPlayerTurn && opponentCurrentInput.length > 0) {
      setView('opponent');
    }
    if (isPlayerTurn) {
      setView('player');
    }
  }, [isPlayerTurn, opponentCurrentInput.length]);

  // Auto-scroll history to bottom
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [playerGuesses.length, opponentGuesses.length, view]);


  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ maxWidth: '420px', margin: '0 auto', padding: '0 16px' }}
    >

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between pb-3 pt-8">
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1.5 rounded-lg border border-[var(--clue-yellow)]/20 bg-[var(--clue-yellow)]/5 px-2 py-1">
             <span className="font-orbitron text-[10px] font-black tracking-widest text-[var(--clue-yellow)]">
               {playerRating} CMC
             </span>
           </div>
           <div className="h-4 w-px bg-white/10" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Terminal 01</span>
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
            {isPlayerTurn ? 'Your Turn' : "Opponent's Turn"}
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

      {/* ── Tabs ── */}
      <div className="mb-4 flex p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
        <button
          onClick={() => setView('player')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === 'player' ? 'bg-[var(--accent)] color-[#030C15] shadow-lg' : 'text-[var(--text-dim)]'}`}
        >
          YOUR BOARD
        </button>
        <button
          onClick={() => setView('opponent')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === 'opponent' ? 'bg-[var(--orange)] color-[#030C15] shadow-lg' : 'text-[var(--text-dim)]'}`}
        >
          OPPONENT'S BOARD
        </button>
      </div>

      {/* ── Section label ── */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: view === 'player' ? 'var(--text-2)' : 'var(--orange)' }}>
          {view === 'player' ? 'Your Guesses' : `${opponentName}'s Guesses`}
        </span>
        <span className="font-code text-xs" style={{ color: 'var(--text-dim)' }}>
          {(view === 'player' ? playerGuesses : opponentGuesses).length}/{MAX_GUESSES}
        </span>
      </div>

      {/* ── Guess history ── */}
      <div
        ref={historyRef}
        className="mb-3 flex flex-col gap-2 overflow-y-auto pr-1"
        style={{ maxHeight: '220px', minHeight: '80px' }}
      >
        <AnimatePresence mode="popLayout">
          {view === 'player' ? (
            playerGuesses.map((g, i) => (
              <GuessRow key={g.id} digits={g.digits} clues={g.clues} rowIndex={i} />
            ))
          ) : (
            <>
              {opponentGuesses.map((g, i) => (
                <GuessRow key={g.id} digits={g.digits} clues={g.clues} rowIndex={i} />
              ))}
              {/* Active Tyler Row */}
              {!isPlayerTurn && opponentCurrentInput.length > 0 && (
                <div className="flex items-center gap-2 opacity-80">
                  <span className="w-5 text-right text-xs font-medium" style={{ color: 'var(--orange)' }}>?</span>
                  <div className="flex gap-1.5">
                    {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                      <div
                        key={i}
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--orange)', opacity: i < opponentCurrentInput.length ? 1 : 0.3 }}
                      >
                        <span className="font-code text-base font-bold" style={{ color: 'var(--orange)' }}>
                          {i < opponentCurrentInput.length ? opponentCurrentInput[i] : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="h-4 w-px rounded-full bg-[var(--orange)]" />
                  <div className="text-[10px] uppercase font-bold text-[var(--orange)] animate-pulse">Typing…</div>
                </div>
              )}
            </>
          )}
          {/* Empty rows */}
          {Array.from({ length: Math.max(0, Math.min(3, MAX_GUESSES - (view === 'player' ? playerGuesses : opponentGuesses).length - (!isPlayerTurn && opponentCurrentInput.length > 0 && view === 'opponent' ? 1 : 0))) }).map((_, i) => (
            <EmptyGuessRow key={`empty-${i}`} rowIndex={(view === 'player' ? playerGuesses : opponentGuesses).length + i + (!isPlayerTurn && opponentCurrentInput.length > 0 && view === 'opponent' ? 1 : 0)} />
          ))}
        </AnimatePresence>
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
        disabled={!canSubmit || isSubmitting}
        className="mb-4 w-full rounded-[2rem] py-5 font-orbitron text-base font-black tracking-[0.25em] relative overflow-hidden"
        style={{
          background: canSubmit
            ? 'linear-gradient(135deg, #0099CC 0%, #00CFFF 60%, #0099CC 100%)'
            : 'var(--clue-gray)',
          color: canSubmit ? '#030C15' : 'var(--text-dim)',
          boxShadow: canSubmit ? '0 12px 32px rgba(0,207,255,0.3)' : 'none',
          cursor: canSubmit && !isSubmitting ? 'pointer' : 'not-allowed',
          transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        animate={canSubmit && !isSubmitting ? { boxShadow: ['0 10px 24px rgba(0,207,255,0.25)', '0 12px 40px rgba(0,207,255,0.5)', '0 10px 24px rgba(0,207,255,0.25)'] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        whileTap={canSubmit && !isSubmitting ? { scale: 0.97 } : {}}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-3">
             <motion.div 
               className="h-5 w-5 rounded-full border-2 border-[#030C15]/40 border-t-[#030C15]"
               animate={{ rotate: 360 }}
               transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
             />
             <span className="animate-pulse tracking-widest">ANALYZING...</span>
          </div>
        ) : !isPlayerTurn ? (
          <span className="flex items-center justify-center gap-2 opacity-60">
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
          <span className="text-xs opacity-50 tracking-[0.2em]">ENTER {CODE_LENGTH - currentInput.length} MORE DIGIT{CODE_LENGTH - currentInput.length !== 1 ? 'S' : ''}</span>
        )}

        {/* Loading overlay effect */}
        {isSubmitting && (
           <motion.div 
             className="absolute inset-0 bg-white/10"
             initial={{ x: '-100%' }}
             animate={{ x: '100%' }}
             transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
           />
        )}
      </motion.button>
    </div>
  );
}
