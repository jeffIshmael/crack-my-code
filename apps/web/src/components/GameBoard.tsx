'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NumberPad from '@/components/NumberPad';
import { Scoreboard } from '@/components/Scoreboard';
import type { GuessEntry } from '@/lib/game';
import { CODE_LENGTH, MAX_GUESSES } from '@/lib/game';
import type { GamePhase, TileClue } from '@/lib/game';

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
  /** Professional match stake (USDT). When > 0, show winner reward in the top bar. */
  stakeAmount?: number;
  inputLocked?: boolean;
  onDigitPress: (d: number) => void;
  onDelete: () => void;
  onSubmit: () => void;
  onQuit?: () => void;
  pendingOpponentTileClues?: TileClue[] | null;
  turnNotification?: 'player' | 'opponent' | null;
  phase?: GamePhase;
  /** PvP turn seconds remaining (null = hide timer). */
  turnSecondsLeft?: number | null;
}

export default function GameBoard({
  playerGuesses,
  opponentGuesses,
  currentInput,
  opponentCurrentInput,
  isPlayerTurn,
  opponentName,
  playerPoints,
  pointsLoading = false,
  isSubmitting = false,
  isAI = false,
  stakeAmount = 0,
  inputLocked = false,
  onDigitPress,
  onDelete,
  onSubmit,
  onQuit,
  pendingOpponentTileClues = null,
  turnNotification = null,
  phase = 'playing',
  turnSecondsLeft = null,
}: GameBoardProps) {
  const [view, setView] = useState<'player' | 'opponent'>('player');
  const canSubmit = isPlayerTurn && !inputLocked && currentInput.length === CODE_LENGTH;
  const winnerReward = stakeAmount > 0 ? stakeAmount * 2 * 0.99 : 0;

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
    if (!isAI || phase !== 'playing' || !isPlayerTurn) return;
    if (opponentCurrentInput.length > 0 || pendingOpponentTileClues !== null) return;
    setView('player');
  }, [isAI, phase, isPlayerTurn, opponentCurrentInput.length, pendingOpponentTileClues]);

  useEffect(() => {
    if (isAI || phase !== 'playing') return;
    setView(isPlayerTurn ? 'player' : 'opponent');
  }, [isAI, phase, isPlayerTurn]);

  return (
    <div className="mx-auto flex h-dvh max-h-dvh w-full flex-col overflow-hidden app-page-gutter">
      <AnimatePresence>
        {turnNotification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-6"
          >
            <div
              className="theme-card flex w-full max-w-[280px] flex-col items-center gap-3 rounded-3xl px-8 py-6 shadow-2xl"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="h-4 w-4 rounded-full"
                style={{ background: turnNotification === 'player' ? 'var(--sky-deep)' : 'var(--orange)' }}
              />
              <span
                className="font-ui text-lg font-bold tracking-widest uppercase text-center"
                style={{ color: turnNotification === 'player' ? 'var(--sky-shadow)' : 'var(--orange)' }}
              >
                {turnNotification === 'player'
                  ? 'Your Turn'
                  : isAI
                    ? "Cipher's Turn"
                    : `${opponentName}'s Turn`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="flex-shrink-0 pt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="theme-playful-header-chip py-1.5">
              <span className="font-ui text-[10px] font-bold tracking-wide text-[var(--wood-text)]">
                {pointsLoading ? '---' : `${playerPoints.toLocaleString()} CMC`}
              </span>
            </div>
            <button
              onClick={onQuit}
              type="button"
              className="text-[10px] font-bold uppercase tracking-widest text-red-400/90 hover:text-red-400 transition-colors"
            >
              Quit
            </button>
          </div>

          {winnerReward > 0 && (
            <div className="flex shrink-0 flex-col items-center rounded-xl border border-[var(--border-mid)] bg-[var(--cream)] px-2.5 py-1">
              <span className="font-ui text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                Winner
              </span>
              <span className="font-orbitron text-[11px] font-black leading-none text-[#1FA84A]">
                {winnerReward.toLocaleString(undefined, {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                })}{' '}
                USDT
              </span>
            </div>
          )}

          <div className="flex flex-1 flex-col items-end gap-1">
            {turnSecondsLeft !== null && phase === 'playing' && (
              <div
                className="rounded-full px-2.5 py-1 font-orbitron text-[11px] font-black tabular-nums tracking-wide"
                style={{
                  background:
                    turnSecondsLeft <= 15
                      ? 'rgba(255,107,43,0.2)'
                      : isPlayerTurn
                        ? 'rgba(21, 144, 214, 0.18)'
                        : 'rgba(0,0,0,0.08)',
                  color:
                    turnSecondsLeft <= 15
                      ? 'var(--orange)'
                      : isPlayerTurn
                        ? 'var(--cream)'
                        : 'var(--wood-text)',
                  border: `1px solid ${
                    turnSecondsLeft <= 15
                      ? 'rgba(255,107,43,0.45)'
                      : 'rgba(255,255,255,0.25)'
                  }`,
                }}
                aria-live="polite"
                aria-label={
                  isPlayerTurn
                    ? `${turnSecondsLeft} seconds left to guess`
                    : `Opponent has ${turnSecondsLeft} seconds left`
                }
              >
                {turnSecondsLeft <= 0
                  ? isPlayerTurn
                    ? 'TIME UP'
                    : 'FORFEIT…'
                  : `${Math.floor(turnSecondsLeft / 60)}:${(turnSecondsLeft % 60)
                      .toString()
                      .padStart(2, '0')}`}
              </div>
            )}
            <div
              className="rounded-full px-2.5 py-1 font-ui text-[10px] font-bold uppercase tracking-wide"
              style={{
                background: isPlayerTurn ? 'rgba(21, 144, 214, 0.2)' : 'var(--orange-dim)',
                color: isPlayerTurn ? 'var(--cream)' : 'var(--orange)',
                border: `1px solid ${isPlayerTurn ? 'rgba(255,255,255,0.35)' : 'rgba(255,159,67,0.35)'}`,
              }}
            >
              {isPlayerTurn ? 'Your turn' : isAI ? `${opponentName} AI` : 'Their turn'}
            </div>
          </div>
        </div>

        <div className="scoreboard-board-tabs mb-3">
          <button
            type="button"
            onClick={() => setView('player')}
            className={`scoreboard-board-tab ${view === 'player' ? 'scoreboard-board-tab--active' : 'scoreboard-board-tab--inactive'}`}
          >
            My Board
          </button>
          <button
            type="button"
            onClick={() => setView('opponent')}
            className={`scoreboard-board-tab ${view === 'opponent' ? 'scoreboard-board-tab--active' : 'scoreboard-board-tab--inactive'}`}
          >
            {isAI ? 'Cipher Board' : 'Opponent Board'}
          </button>
        </div>
      </div>

      {/* Wooden scoreboard */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        <Scoreboard
          view={view}
          guesses={activeGuesses}
          opponentName={opponentName}
          isPlayerTurn={isPlayerTurn}
          currentInput={view === 'player' ? currentInput : []}
          opponentCurrentInput={view === 'opponent' ? opponentCurrentInput : []}
          pendingOpponentTileClues={view === 'opponent' ? pendingOpponentTileClues : null}
          phase={phase}
          maxGuesses={MAX_GUESSES}
          turnLocked={inputLocked}
        />
      </div>

      {/* Hint keyboard + controls */}
      <div className="flex-shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {isPlayerTurn && !inputLocked && (
          <motion.button
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            className="game-submit-btn mb-2"
            whileTap={canSubmit && !isSubmitting ? { scale: 0.98 } : {}}
            type="button"
          >
            {isSubmitting ? 'ANALYZING…' : canSubmit ? 'SUBMIT GUESS →' : `ENTER ${CODE_LENGTH - currentInput.length} MORE`}
          </motion.button>
        )}

        {phase === 'playing' && (inputLocked || !isPlayerTurn) && (
          <p className="mb-2 text-center font-ui text-[10px] font-bold tracking-wide text-[var(--cream)]">
            {inputLocked && isPlayerTurn
              ? 'Review your hints on the board…'
              : aiReviewingPlayerGuess
                ? 'Review your hints on the board'
                : aiCrackedCode
                  ? `${opponentName} cracked your code!`
                  : isAI
                    ? `${opponentName} is guessing…`
                    : turnSecondsLeft !== null && turnSecondsLeft <= 0
                      ? 'Opponent ran out of time — claiming forfeit…'
                      : turnSecondsLeft !== null
                        ? `Waiting for opponent… ${turnSecondsLeft}s left`
                        : 'Waiting for opponent…'}
          </p>
        )}

        <NumberPad
          inputLength={currentInput.length}
          maxLength={CODE_LENGTH}
          disabled={!isPlayerTurn || inputLocked}
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
