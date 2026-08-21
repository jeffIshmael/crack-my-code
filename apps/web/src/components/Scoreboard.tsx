'use client';

import { motion } from 'framer-motion';
import { ClueDigitTile } from '@/components/GuessRow';
import type { GuessEntry, TileClue } from '@/lib/game';
import { CODE_LENGTH, MAX_GUESSES, tileCluesForGuess } from '@/lib/game';

interface ScoreboardProps {
  view: 'player' | 'opponent';
  guesses: GuessEntry[];
  opponentName: string;
  isPlayerTurn: boolean;
  currentInput?: number[];
  opponentCurrentInput?: number[];
  pendingOpponentTileClues?: TileClue[] | null;
  phase: 'playing' | 'countdown' | 'result' | string;
  maxGuesses?: number;
  turnLocked?: boolean;
  /** PvP turn seconds remaining; shown centered on the wooden header. */
  turnSecondsLeft?: number | null;
}

function formatTurnClock(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function EmptySlots({ active }: { active?: boolean }) {
  return (
    <>
      {Array.from({ length: CODE_LENGTH }).map((_, i) => (
        <div key={i} className={`scoreboard-slot ${active ? 'scoreboard-slot--active' : ''}`}>
          <div className="scoreboard-tile scoreboard-tile--draft-pulse" />
        </div>
      ))}
    </>
  );
}

function DraftSlots({ digits, active }: { digits: number[]; active?: boolean }) {
  return (
    <>
      {Array.from({ length: CODE_LENGTH }).map((_, i) => {
        const filled = i < digits.length;
        return (
          <div key={i} className={`scoreboard-slot ${active && !filled ? 'scoreboard-slot--active' : ''}`}>
            {filled ? (
              <div className="scoreboard-tile scoreboard-tile--draft">{digits[i]}</div>
            ) : (
              <div className="scoreboard-tile scoreboard-tile--draft-pulse" />
            )}
          </div>
        );
      })}
    </>
  );
}

export function Scoreboard({
  view,
  guesses,
  opponentName,
  isPlayerTurn,
  currentInput = [],
  opponentCurrentInput = [],
  pendingOpponentTileClues = null,
  phase,
  maxGuesses = MAX_GUESSES,
  turnLocked = false,
  turnSecondsLeft = null,
}: ScoreboardProps) {
  const boardLabel = view === 'player' ? 'My Board' : `${opponentName}'s Board`;
  const showOpponentLive =
    view === 'opponent' &&
    phase === 'playing' &&
    !isPlayerTurn &&
    (pendingOpponentTileClues !== null ||
      (!turnLocked && opponentCurrentInput.length > 0));
  const showTimer = turnSecondsLeft !== null && phase === 'playing';
  const isUrgent = showTimer && turnSecondsLeft <= 15;

  return (
    <div className="scoreboard-plaque">
      <div className="scoreboard-plaque__header">
        <span className="scoreboard-plaque__header-label">{boardLabel}</span>
        {showTimer ? (
          <span
            className={`scoreboard-plaque__header-timer${isUrgent ? ' scoreboard-plaque__header-timer--urgent' : ''}`}
            aria-live="polite"
            aria-label={
              isPlayerTurn
                ? `${Math.max(0, turnSecondsLeft)} seconds left to guess`
                : `Opponent has ${Math.max(0, turnSecondsLeft)} seconds left`
            }
          >
            <span className="scoreboard-plaque__header-timer-emoji" aria-hidden>
              {isUrgent ? '⚠️' : '⏰'}
            </span>
            <span>
              {turnSecondsLeft <= 0
                ? isPlayerTurn
                  ? 'TIME'
                  : 'WAIT'
                : formatTurnClock(turnSecondsLeft)}
            </span>
          </span>
        ) : (
          <span aria-hidden />
        )}
        <span className="scoreboard-plaque__header-count">
          {guesses.length}/{maxGuesses}
        </span>
      </div>
      <div className="scoreboard-frame">
        <div className="scoreboard-grid">
          {Array.from({ length: maxGuesses }).map((_, rowIdx) => {
            const guess = guesses[rowIdx];
            const isPlayerDraftRow =
              view === 'player' &&
              rowIdx === guesses.length &&
              isPlayerTurn &&
              phase === 'playing' &&
              !turnLocked &&
              currentInput.length > 0;
            const isOpponentLiveRow = showOpponentLive && rowIdx === guesses.length;

            if (guess) {
              return (
                <motion.div
                  key={guess.id}
                  className="scoreboard-row"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {guess.digits.map((digit, ci) => {
                    const tiles = tileCluesForGuess(guess);
                    return (
                      <div key={ci} className="scoreboard-slot">
                        <ClueDigitTile digit={digit} tileClue={tiles[ci]} instant />
                      </div>
                    );
                  })}
                </motion.div>
              );
            }

            if (isOpponentLiveRow) {
              return (
                <div key={`opp-live-${rowIdx}`} className="scoreboard-row">
                  {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                    const filled = i < opponentCurrentInput.length;
                    if (filled && pendingOpponentTileClues) {
                      return (
                        <div key={i} className="scoreboard-slot">
                          <ClueDigitTile digit={opponentCurrentInput[i]} tileClue={pendingOpponentTileClues[i]} instant />
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="scoreboard-slot scoreboard-slot--active">
                        {filled ? (
                          <div className="scoreboard-tile scoreboard-tile--draft">{opponentCurrentInput[i]}</div>
                        ) : (
                          <div className="scoreboard-tile scoreboard-tile--draft-pulse" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }

            if (isPlayerDraftRow) {
              return (
                <div key={`draft-${rowIdx}`} className="scoreboard-row">
                  <DraftSlots digits={currentInput} active />
                </div>
              );
            }

            return (
              <div key={`empty-${rowIdx}`} className="scoreboard-row">
                <EmptySlots />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
