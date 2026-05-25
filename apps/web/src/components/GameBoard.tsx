'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GuessRow, { ClueDigitTile, EmptyGuessRow } from '@/components/GuessRow';
import NumberPad from '@/components/NumberPad';
import type { TileClue, GuessEntry } from '@/lib/game';
import { CODE_LENGTH, MAX_GUESSES } from '@/lib/game';
import type { GamePhase } from '@/lib/game';

interface GameBoardProps {
  playerGuesses: GuessEntry[];
  opponentGuesses: GuessEntry[];
  opponentGuessCount: number;
  currentInput: number[];
  opponentCurrentInput: number[];
  isPlayerTurn: boolean;
  opponentName: string;
  playerRating: number;
  playerPoints: number;
  isSubmitting?: boolean;
  isAI?: boolean;
  onDigitPress: (d: number) => void;
  onDelete: () => void;
  onSubmit: () => void;
  onQuit?: () => void;
  pendingOpponentTileClues?: TileClue[] | null;
  turnNotification?: 'player' | 'opponent' | null;
  phase?: GamePhase;
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
  playerPoints,
  isSubmitting = false,
  isAI = false,
  onDigitPress,
  onDelete,
  onSubmit,
  onQuit,
  pendingOpponentTileClues = null,
  turnNotification = null,
  phase = 'playing',
}: GameBoardProps) {
  const historyRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'player' | 'opponent'>('player');
  const canSubmit = isPlayerTurn && currentInput.length === CODE_LENGTH;
  const aiReviewingPlayerGuess =
    isAI &&
    !isPlayerTurn &&
    phase === 'playing' &&
    opponentCurrentInput.length === 0 &&
    pendingOpponentTileClues === null;
  const aiCrackedCode =
    isAI &&
    pendingOpponentTileClues !== null &&
    pendingOpponentTileClues.every((c) => c === 'green');

  // Stay on your board to read colored feedback; switch when Cipher actually starts guessing
  useEffect(() => {
    if (
      isAI &&
      phase === 'playing' &&
      !isPlayerTurn &&
      (opponentCurrentInput.length > 0 || pendingOpponentTileClues !== null)
    ) {
      setView('opponent');
    }
  }, [isAI, phase, isPlayerTurn, opponentCurrentInput.length, pendingOpponentTileClues]);

  // Return to player view when it's the player's turn again
  useEffect(() => {
    if (isPlayerTurn) {
      if (isAI) {
        setView('player');
        return;
      }
      const timer = setTimeout(() => setView('player'), 2000);
      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, isAI]);

  // Handle turn notification transitions
  useEffect(() => {
    if (turnNotification === 'opponent') {
      const timer = setTimeout(() => setView('opponent'), 800);
      return () => clearTimeout(timer);
    }
    if (turnNotification === 'player') {
      setView('player');
    }
  }, [turnNotification]);

  // Auto-scroll history to bottom
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [playerGuesses.length, opponentGuesses.length, view, pendingOpponentTileClues]);

  // After you submit, scroll your guess list so the latest feedback is visible
  useEffect(() => {
    if (isPlayerTurn || view !== 'player') return;
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [playerGuesses.length, isPlayerTurn, view]);


  return (
    <div
      className="flex min-h-dvh flex-col relative"
      style={{ maxWidth: '420px', margin: '0 auto', padding: '0 16px' }}
    >
      <AnimatePresence>
        {turnNotification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-6"
          >
            <div 
              className="rounded-3xl px-8 py-6 backdrop-blur-xl border shadow-2xl flex flex-col items-center gap-3 w-full max-w-[280px]"
              style={{
                background: turnNotification === 'player' ? 'rgba(37, 99, 235, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                borderColor: turnNotification === 'player' ? 'rgba(37, 99, 235, 0.3)' : 'rgba(220, 38, 38, 0.3)',
                boxShadow: turnNotification === 'player' ? '0 0 40px rgba(37, 99, 235, 0.1)' : '0 0 40px rgba(220, 38, 38, 0.1)',
              }}
            >
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="h-4 w-4 rounded-full"
                style={{ background: turnNotification === 'player' ? 'var(--accent)' : 'var(--orange)' }}
              />
              <span className="font-orbitron text-xl font-black tracking-[0.2em] uppercase text-center" style={{ color: turnNotification === 'player' ? 'var(--accent)' : 'var(--orange)' }}>
                {turnNotification === 'player' ? 'Your Turn' : `${opponentName}'s Turn`}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-50" style={{ color: turnNotification === 'player' ? 'var(--accent)' : 'var(--orange)' }}>
                {turnNotification === 'player' ? 'Ready to crack?' : isAI ? 'Processing data...' : 'Interception in progress...'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between pb-3 pt-8">
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1.5 rounded-lg border border-[var(--clue-yellow)]/20 bg-[var(--clue-yellow)]/5 px-2 py-1">
             <span className="font-orbitron text-[10px] font-black tracking-widest text-[var(--clue-yellow)]">
               {playerPoints} CMC
             </span>
           </div>
           <div className="h-4 w-px bg-black/10" />
           <button 
             onClick={onQuit}
             className="text-[10px] font-bold uppercase tracking-widest text-red-400/80 hover:text-red-400 transition-colors"
           >
             QUIT GAME
           </button>
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
            {isPlayerTurn ? 'Your Turn' : isAI ? `${opponentName.toUpperCase()} ANALYZING` : "Opponent's Turn"}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Opponent progress bar ── */}
      <motion.div
        className="mb-3 flex items-center justify-center rounded-2xl p-4"
        style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid var(--border)',
          backdropFilter: 'blur(10px)'
        }}
        animate={!isPlayerTurn ? { borderColor: 'rgba(255,107,43,0.3)', background: 'rgba(255,107,43,0.05)' } : {}}
      >
        <div className="flex items-center gap-3 font-orbitron">
          <span className="text-[11px] font-black tracking-[0.3em] uppercase text-[var(--accent)]">
            YOU
          </span>
          <span className="text-[9px] font-bold italic tracking-widest text-[var(--text-dim)] opacity-50">
            VS
          </span>
          <span className="text-[11px] font-black tracking-[0.3em] uppercase text-[var(--orange)]">
            {isAI ? `${opponentName.toUpperCase()} AI` : opponentName.toUpperCase()}
          </span>
        </div>
        {!isPlayerTurn && (
          <motion.div
            className="ml-4"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
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
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === 'player' ? 'bg-[var(--accent)] text-[var(--bg-base)] shadow-lg' : 'text-[var(--text-dim)]'}`}
        >
          YOUR BOARD
        </button>
        <button
          onClick={() => setView('opponent')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === 'opponent' ? 'bg-[var(--orange)] text-[var(--bg-base)] shadow-lg' : 'text-[var(--text-dim)]'}`}
        >
          OPPONENT&apos;S BOARD
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
        className="mb-3 flex flex-col gap-2 overflow-y-auto pr-1 relative"
        style={{ 
          maxHeight: '220px', 
          minHeight: '80px',
          background: view === 'opponent' ? 'rgba(255, 107, 43, 0.03)' : 'transparent',
          borderRadius: '12px',
          padding: '8px 4px'
        }}
      >
        {view === 'opponent' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none overflow-hidden">
            <span className="font-orbitron text-4xl font-black rotate-[-15deg] whitespace-nowrap">REMOTE TRACE</span>
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {view === 'player' ? (
            playerGuesses.map((g, i) => (
              <GuessRow key={g.id} digits={g.digits} clues={g.clues} tileClues={g.tileClues} rowIndex={i} type="player" />
            ))
          ) : (
            <>
              {opponentGuesses.map((g, i) => (
                <GuessRow key={g.id} digits={g.digits} clues={g.clues} tileClues={g.tileClues} rowIndex={i} type="opponent" />
              ))}
              {/* Active Typing Row */}
              {!isPlayerTurn && phase === 'playing' && (opponentCurrentInput.length > 0 || pendingOpponentTileClues) && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 py-1"
                >
                  <span className="w-5 text-right text-xs font-medium" style={{ color: 'var(--orange)' }}>
                    {opponentGuesses.length + 1}
                  </span>
                  <div className="flex gap-1.5">
                    {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                      const filled = i < opponentCurrentInput.length;
                      if (filled && pendingOpponentTileClues) {
                        return (
                          <ClueDigitTile
                            key={i}
                            digit={opponentCurrentInput[i]}
                            tileClue={pendingOpponentTileClues[i]}
                            instant
                          />
                        );
                      }
                      return (
                        <motion.div
                          key={i}
                          className="flex h-10 w-10 items-center justify-center rounded-xl"
                          style={{
                            background: filled ? 'var(--orange-dim)' : 'var(--bg-elevated)',
                            border: `1px solid ${filled ? 'var(--orange)' : 'var(--border)'}`,
                            opacity: filled ? 1 : 0.3,
                          }}
                          animate={filled ? { scale: [1, 1.1, 1] } : {}}
                          transition={{ duration: 0.2 }}
                        >
                          <span className="font-code text-base font-bold" style={{ color: 'var(--orange)' }}>
                            {filled ? opponentCurrentInput[i] : ''}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                  {!pendingOpponentTileClues && opponentCurrentInput.length < CODE_LENGTH && (
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="text-[10px] uppercase font-bold text-[var(--orange)]"
                    >
                      {isAI ? 'Processing...' : 'Typing…'}
                    </motion.span>
                  )}
                </motion.div>
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
            {isPlayerTurn
              ? 'Your Guess'
              : aiReviewingPlayerGuess
              ? 'Review your hints above'
              : aiCrackedCode
              ? `${opponentName} cracked your code!`
              : isAI && opponentCurrentInput.length > 0
              ? `Watch ${opponentName}'s guess`
              : isAI
              ? `${opponentName} is guessing…`
              : 'Waiting…'}
          </span>
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
                      key={`${i}-${currentInput[i]}`}
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
          inputLength={currentInput.length}
          maxLength={CODE_LENGTH}
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
            ? 'var(--accent)'
            : 'var(--clue-gray)',
          color: canSubmit ? 'var(--bg-base)' : 'var(--text-dim)',
          boxShadow: canSubmit ? '0 12px 32px rgba(37,99,235,0.2)' : 'none',
          cursor: canSubmit && !isSubmitting ? 'pointer' : 'not-allowed',
          transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        animate={canSubmit && !isSubmitting ? { boxShadow: ['0 10px 24px rgba(37,99,235,0.2)', '0 12px 40px rgba(37,99,235,0.4)', '0 10px 24px rgba(37,99,235,0.2)'] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        whileTap={canSubmit && !isSubmitting ? { scale: 0.97 } : {}}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-3">
             <motion.div 
               className="h-5 w-5 rounded-full border-2 border-[var(--bg-base)]/40 border-t-[var(--bg-base)]"
               animate={{ rotate: 360 }}
               transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
             />
             <span className="animate-pulse tracking-widest">ANALYZING...</span>
          </div>
        ) : aiReviewingPlayerGuess ? (
          <span className="text-xs opacity-60 tracking-[0.15em]">CIPHER WAITING…</span>
        ) : !isPlayerTurn && phase === 'playing' ? (
          <span className="flex items-center justify-center gap-2 opacity-60">
            {aiCrackedCode ? (
              <span className="tracking-widest text-[var(--orange)]">CODE BREACHED</span>
            ) : (
              <>
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ···
                </motion.span>
                {isAI && opponentCurrentInput.length >= CODE_LENGTH
                  ? 'REVEALING GUESS'
                  : isAI
                  ? `${opponentName.toUpperCase()} GUESSING`
                  : 'OPPONENT THINKING'}
              </>
            )}
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
