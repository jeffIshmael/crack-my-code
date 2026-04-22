'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import Lobby       from '@/components/Lobby';
import SetCode     from '@/components/SetCode';
import GameBoard   from '@/components/GameBoard';
import ResultModal from '@/components/ResultModal';

import {
  type GameState,
  type GuessEntry,
  CODE_LENGTH,
  GAME_DURATION,
  MAX_GUESSES,
  evaluateGuess,
  initialGameState,
  isWinningClues,
  randomOpponentName,
} from '@/lib/game';

// ─── Matchmaking fake delay ───────────────────────────────────────────────────
const MATCHMAKING_MS = 2800;
// Opponent "thinking" time range (ms)
const OPP_MIN_MS = 1800;
const OPP_MAX_MS = 3200;
// Opponent never actually wins in demo — they slow down after 6 guesses
const OPP_WIN_AFTER = 99;

// ─── Screen transition variants ──────────────────────────────────────────────
const screenVariants = {
  initial:  { opacity: 0, y: 24, scale: 0.98 },
  animate:  { opacity: 1, y: 0,  scale: 1,   transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit:     { opacity: 0, y: -16, scale: 0.97, transition: { duration: 0.2 } },
};

export default function CodebreakerApp() {
  const [gs, setGs] = useState<GameState>(() => initialGameState());
  const oppTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const clearOppTimer  = () => { if (oppTimerRef.current)  clearTimeout(oppTimerRef.current); };
  const clearGameTimer = () => { if (gameTimerRef.current) clearInterval(gameTimerRef.current); };

  // ─── Game countdown ───────────────────────────────────────────────────────

  const startGameTimer = useCallback(() => {
    clearGameTimer();
    gameTimerRef.current = setInterval(() => {
      setGs((prev) => {
        if (prev.phase !== 'playing') { clearGameTimer(); return prev; }
        if (prev.timeLeft <= 1) {
          clearGameTimer();
          return { ...prev, phase: 'result', result: 'lose', ratingDelta: -12, timeLeft: 0 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
  }, []); // eslint-disable-line

  // ─── Opponent simulated turn ──────────────────────────────────────────────

  const scheduleOpponentTurn = useCallback((currentCount: number) => {
    clearOppTimer();
    const delay = OPP_MIN_MS + Math.random() * (OPP_MAX_MS - OPP_MIN_MS);
    oppTimerRef.current = setTimeout(() => {
      setGs((prev) => {
        if (prev.phase !== 'playing' || prev.isPlayerTurn) return prev;
        const newCount = currentCount + 1;
        if (newCount >= OPP_WIN_AFTER) {
          clearGameTimer();
          return { ...prev, phase: 'result', result: 'lose', opponentGuessCount: newCount, ratingDelta: -15 };
        }
        return { ...prev, opponentGuessCount: newCount, isPlayerTurn: true };
      });
    }, delay);
  }, []); // eslint-disable-line

  // ─── Phase: Lobby → Matchmaking ───────────────────────────────────────────

  const handleFindMatch = useCallback((_mode: any, _stake: any) => {
    setGs((prev) => ({ ...prev, phase: 'matchmaking', opponentName: randomOpponentName() }));
    setTimeout(() => {
      setGs((prev) => ({
        ...prev,
        phase: 'setCode',
        playerCode: [],
        playerGuesses: [],
        opponentGuessCount: 0,
        currentInput: [],
        isPlayerTurn: true,
        timeLeft: GAME_DURATION,
        result: null,
        ratingDelta: null,
      }));
    }, MATCHMAKING_MS);
  }, []);

  // ─── Phase: SetCode → Playing ─────────────────────────────────────────────

  const handleLockCode = useCallback((code: number[]) => {
    setGs((prev) => ({ ...prev, playerCode: code, phase: 'playing' }));
    startGameTimer();
  }, [startGameTimer]);

  // ─── Phase: Playing — submit guess ────────────────────────────────────────

  const handleSubmitGuess = useCallback((digits: number[]) => {
    setGs((prev) => {
      if (!prev.isPlayerTurn || prev.phase !== 'playing') return prev;
      if (digits.length !== CODE_LENGTH) return prev;

      const clues = evaluateGuess(digits, prev.opponentCode);
      const entry: GuessEntry = { digits, clues, id: `${Date.now()}` };
      const newGuesses = [...prev.playerGuesses, entry];

      // Win check
      if (isWinningClues(clues)) {
        clearGameTimer();
        clearOppTimer();
        return { ...prev, playerGuesses: newGuesses, phase: 'result', result: 'win', ratingDelta: +22, currentInput: [] };
      }

      // Max guesses exhausted
      if (newGuesses.length >= MAX_GUESSES) {
        clearGameTimer();
        return { ...prev, playerGuesses: newGuesses, phase: 'result', result: 'lose', ratingDelta: -10, currentInput: [] };
      }

      // Opponent's turn
      const nextCount = prev.opponentGuessCount;
      scheduleOpponentTurn(nextCount);
      return { ...prev, playerGuesses: newGuesses, isPlayerTurn: false, currentInput: [] };
    });
  }, [scheduleOpponentTurn]); // eslint-disable-line

  // ─── Number pad: add / remove digit ──────────────────────────────────────

  const handleDigitPress = useCallback((digit: number) => {
    setGs((prev) => {
      if (!prev.isPlayerTurn || prev.phase !== 'playing') return prev;
      if (prev.currentInput.length >= CODE_LENGTH) return prev;
      if (prev.currentInput.includes(digit)) return prev; // no repeats
      return { ...prev, currentInput: [...prev.currentInput, digit] };
    });
  }, []);

  const handleDeleteDigit = useCallback(() => {
    setGs((prev) => ({ ...prev, currentInput: prev.currentInput.slice(0, -1) }));
  }, []);

  // ─── Phase: Result → Lobby ────────────────────────────────────────────────

  const handlePlayAgain = useCallback(() => {
    clearOppTimer();
    clearGameTimer();
    setGs(initialGameState(gs.playerRating + (gs.ratingDelta ?? 0)));
  }, [gs.playerRating, gs.ratingDelta]); // eslint-disable-line

  // ─── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => () => { clearOppTimer(); clearGameTimer(); }, []); // eslint-disable-line

  // ─── Keyboard support (desktop / testing) ────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gs.phase !== 'playing') return;
      if (e.key >= '0' && e.key <= '9') handleDigitPress(Number(e.key));
      if (e.key === 'Backspace')         handleDeleteDigit();
      if (e.key === 'Enter' && gs.currentInput.length === CODE_LENGTH)
        handleSubmitGuess(gs.currentInput);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gs.phase, gs.currentInput, handleDigitPress, handleDeleteDigit, handleSubmitGuess]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        {gs.phase === 'lobby' || gs.phase === 'matchmaking' ? (
          <motion.div key="lobby" className="w-full" {...screenVariants}>
            <Lobby
              rating={gs.playerRating}
              isMatchmaking={gs.phase === 'matchmaking'}
              opponentName={gs.opponentName}
              onFindMatch={handleFindMatch}
              onMatchFound={() => {}}
            />
          </motion.div>
        ) : gs.phase === 'setCode' ? (
          <motion.div key="setcode" className="w-full" {...screenVariants}>
            <SetCode opponentName={gs.opponentName} onLockCode={handleLockCode} />
          </motion.div>
        ) : (gs.phase === 'playing' || gs.phase === 'result') ? (
          <motion.div key="game" className="w-full h-full" {...screenVariants}>
            <GameBoard
              playerGuesses={gs.playerGuesses}
              opponentGuesses={gs.opponentGuesses}
              opponentGuessCount={gs.opponentGuessCount}
              currentInput={gs.currentInput}
              opponentCurrentInput={gs.opponentCurrentInput}
              isPlayerTurn={gs.isPlayerTurn}
              timeLeft={gs.timeLeft}
              opponentName={gs.opponentName}
              playerRating={gs.playerRating}
              onDigitPress={handleDigitPress}
              onDelete={handleDeleteDigit}
              onSubmit={() => handleSubmitGuess(gs.currentInput)}
            />
            <AnimatePresence>
              {gs.phase === 'result' && gs.result && (
                <ResultModal
                  result={gs.result}
                  gameMode={gs.gameMode}
                  stakeAmount={gs.stakeAmount}
                  opponentCode={gs.opponentCode}
                  opponentName={gs.opponentName}
                  ratingDelta={gs.ratingDelta ?? 0}
                  playerRating={gs.playerRating}
                  guessCount={gs.playerGuesses.length}
                  onPlayAgain={handlePlayAgain}
                />
              )}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
