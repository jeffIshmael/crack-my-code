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
  pointsLoading?: boolean;
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
  pointsLoading = false,
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

  const activeGuesses = view === 'player' ? playerGuesses : opponentGuesses;
  const emptyRowCount = Math.max(
    0,
    Math.min(2, MAX_GUESSES - activeGuesses.length - (!isPlayerTurn && opponentCurrentInput.length > 0 && view === 'opponent' ? 1 : 0)),
  );

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

  useEffect(() => {
    if (!isPlayerTurn) return;

    if (isAI) {
      if (opponentCurrentInput.length > 0 || pendingOpponentTileClues !== null) return;
      const timer = setTimeout(() => setView('player'), 900);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setView('player'), 2000);
    return () => clearTimeout(timer);
  }, [isPlayerTurn, isAI, opponentCurrentInput.length, pendingOpponentTileClues]);

  useEffect(() => {
    if (turnNotification === 'opponent') {
      const timer = setTimeout(() => setView('opponent'), 800);
      return () => clearTimeout(timer);
    }
    if (turnNotification === 'player') {
      setView('player');
    }
  }, [turnNotification]);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [playerGuesses.length, opponentGuesses.length, view, pendingOpponentTileClues]);

  useEffect(() => {
    if (isPlayerTurn || view !== 'player') return;
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [playerGuesses.length, isPlayerTurn, view]);

  return (
    <div
      className="mx-auto flex h-dvh max-h-dvh w-full max-w-[420px] flex-col overflow-hidden px-4"
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed top */}
      <div className="flex-shrink-0 pt-4">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-[var(--clue-yellow)]/20 bg-[var(--clue-yellow)]/5 px-2 py-1">
              <span className="font-orbitron text-[10px] font-black tracking-widest text-[var(--clue-yellow)]">
                {pointsLoading ? '---' : `${playerPoints} CMC`}
              </span>
            </div>
            <button
              onClick={onQuit}
              type="button"
              className="text-[10px] font-bold uppercase tracking-widest text-red-400/80 hover:text-red-400 transition-colors"
            >
              QUIT
            </button>
          </div>

          <motion.div
            key={isPlayerTurn ? 'your' : 'opp'}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold"
            style={{
              background: isPlayerTurn ? 'var(--accent-dim)' : 'var(--orange-dim)',
              color: isPlayerTurn ? 'var(--accent)' : 'var(--orange)',
              border: `1px solid ${isPlayerTurn ? 'var(--border-bright)' : 'rgba(255,107,43,0.3)'}`,
              whiteSpace: 'nowrap',
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {isPlayerTurn ? 'Your Turn' : isAI ? `${opponentName} AI` : "Opponent's Turn"}
          </motion.div>
        </div>

        <motion.div
          className="mb-2 flex items-center justify-center rounded-xl px-3 py-2.5"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-2 font-orbitron text-[10px] font-black tracking-[0.2em] uppercase">
            <span className="text-[var(--accent)]">YOU</span>
            <span className="text-[var(--text-dim)] opacity-50">VS</span>
            <span className="text-[var(--orange)]">{isAI ? `${opponentName.toUpperCase()} AI` : opponentName.toUpperCase()}</span>
          </div>
        </motion.div>

        <div className="mb-2 flex p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
          <button
            type="button"
            onClick={() => setView('player')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${view === 'player' ? 'bg-[var(--accent)] text-[var(--bg-base)] shadow-lg' : 'text-[var(--text-dim)]'}`}
          >
            YOUR BOARD
          </button>
          <button
            type="button"
            onClick={() => setView('opponent')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${view === 'opponent' ? 'bg-[var(--orange)] text-[var(--bg-base)] shadow-lg' : 'text-[var(--text-dim)]'}`}
          >
            OPPONENT&apos;S BOARD
          </button>
        </div>

        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: view === 'player' ? 'var(--text-2)' : 'var(--orange)' }}>
            {view === 'player' ? 'Your Guesses' : `${opponentName}'s Guesses`}
          </span>
          <span className="font-code text-[11px]" style={{ color: 'var(--text-dim)' }}>
            {activeGuesses.length}/{MAX_GUESSES}
          </span>
        </div>
      </div>

      {/* Scrollable guesses only */}
      <div
        ref={historyRef}
        className="min-h-0 flex-1 overflow-y-auto pr-1"
        style={{
          background: view === 'opponent' ? 'rgba(255, 107, 43, 0.03)' : 'transparent',
          borderRadius: '12px',
          padding: '4px 2px',
        }}
      >
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
              {!isPlayerTurn && phase === 'playing' && (opponentCurrentInput.length > 0 || pendingOpponentTileClues) && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 py-1">
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
                          className="flex h-9 w-9 items-center justify-center rounded-xl"
                          style={{
                            background: filled ? 'var(--orange-dim)' : 'var(--bg-elevated)',
                            border: `1px solid ${filled ? 'var(--orange)' : 'var(--border)'}`,
                            opacity: filled ? 1 : 0.3,
                          }}
                        >
                          <span className="font-code text-sm font-bold" style={{ color: 'var(--orange)' }}>
                            {filled ? opponentCurrentInput[i] : ''}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </>
          )}
          {Array.from({ length: emptyRowCount }).map((_, i) => (
            <EmptyGuessRow
              key={`empty-${i}`}
              rowIndex={activeGuesses.length + i + (!isPlayerTurn && opponentCurrentInput.length > 0 && view === 'opponent' ? 1 : 0)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Fixed bottom controls */}
      <div className="flex-shrink-0 border-t border-[var(--border-mid)] pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {isPlayerTurn && (
          <motion.button
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            className="mb-2 w-full rounded-xl py-2.5 font-ui text-xs font-black tracking-[0.16em]"
            style={{
              background: canSubmit ? 'var(--accent)' : 'rgba(255,255,255,0.75)',
              color: canSubmit ? '#fff' : 'var(--text-dim)',
              border: `2px solid ${canSubmit ? 'var(--accent)' : 'var(--border-mid)'}`,
              cursor: canSubmit && !isSubmitting ? 'pointer' : 'not-allowed',
            }}
            whileTap={canSubmit && !isSubmitting ? { scale: 0.98 } : {}}
            type="button"
          >
            {isSubmitting ? 'ANALYZING…' : canSubmit ? 'SUBMIT GUESS →' : `ENTER ${CODE_LENGTH - currentInput.length} MORE`}
          </motion.button>
        )}

        {!isPlayerTurn && phase === 'playing' && (
          <p className="mb-2 text-center font-ui text-[10px] font-bold tracking-wide text-[var(--text-dim)]">
            {aiReviewingPlayerGuess
              ? 'Review your hints above'
              : aiCrackedCode
              ? `${opponentName} cracked your code!`
              : isAI
              ? `${opponentName} is guessing…`
              : 'Waiting for opponent…'}
          </p>
        )}

        <div className="mb-1.5 flex gap-1.5">
          {Array.from({ length: CODE_LENGTH }).map((_, i) => {
            const filled = i < currentInput.length;
            const isNext = i === currentInput.length;
            return (
              <div
                key={i}
                className="flex h-11 flex-1 items-center justify-center rounded-xl"
                style={{
                  background: filled ? 'var(--bg-elevated)' : 'var(--bg-card)',
                  border: `2px solid ${filled ? 'var(--border-bright)' : isNext && isPlayerTurn ? 'var(--border-mid)' : 'var(--border)'}`,
                }}
              >
                {filled ? (
                  <span className="font-code text-xl font-bold" style={{ color: 'var(--accent)' }}>
                    {currentInput[i]}
                  </span>
                ) : isNext && isPlayerTurn ? (
                  <div className="h-5 w-0.5 rounded-full bg-[var(--accent)] animate-pulse" />
                ) : null}
              </div>
            );
          })}
        </div>

        <NumberPad
          inputLength={currentInput.length}
          maxLength={CODE_LENGTH}
          disabled={!isPlayerTurn}
          canSubmit={canSubmit}
          isSubmitting={isSubmitting}
          onDigit={onDigitPress}
          onDelete={onDelete}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}
