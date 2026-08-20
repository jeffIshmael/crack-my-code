'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { GameMode, GameResult } from '@/lib/game';

interface ResultModalProps {
  result: GameResult;
  /** When a match ends because someone quit, we show the correct copy. */
  quitContext?: 'player' | 'opponent' | null;
  gameMode: GameMode;
  stakeAmount: number;
  opponentCode: number[];
  opponentName: string;
  ratingDelta: number;
  /** Points at match start (before this game’s delta). */
  pointsBefore: number;
  /** Authoritative points after settlement (from DB). */
  pointsAfter: number;
  playerRating: number;
  guessCount: number;
  statsLoading?: boolean;
  cipherReward?: {
    paid: boolean;
    amount?: number;
    txHash?: string;
    reason?: string;
  } | null;
  onPlayAgain: () => void;
  onHome: () => void;
  /** PvP rematch (non-AI modes only) */
  rematchStatus?: 'idle' | 'waiting' | 'opponent_wants' | 'declined';
  onRematch?: () => void;
  onDeclineRematch?: () => void;
  rematchLoading?: boolean;
}

const CONFETTI_COLORS = ['#00CFFF', '#10B981', '#F59E0B', '#FF6B2B', '#A78BFA'];

function cipherRewardMessage(reason?: string): string {
  switch (reason) {
    case 'disabled':
      return 'On-chain reward is not enabled yet. Contact support if this persists.';
    case 'insufficient_pool':
      return 'Reward pool is empty — payout will resume once funded.';
    case 'daily_cap':
      return 'You reached the on-chain daily reward cap.';
    case 'simulation_failed':
      return 'Payout could not be sent. Please try again or contact support.';
    default:
      return 'Reward could not be sent this time.';
  }
}

export default function ResultModal({
  result,
  quitContext = null,
  gameMode,
  stakeAmount,
  opponentCode,
  opponentName,
  ratingDelta,
  pointsBefore,
  pointsAfter,
  playerRating,
  guessCount,
  statsLoading = false,
  cipherReward = null,
  onPlayAgain,
  onHome,
  rematchStatus = 'idle',
  onRematch,
  onDeclineRematch,
  rematchLoading = false,
}: ResultModalProps) {
  const isWin = result === 'win';
  const isDraw = result === 'draw';
  const isQuitWin = isWin && quitContext === 'opponent';
  const isQuitLose = !isDraw && !isQuitWin && result === 'lose' && quitContext === 'player';
  const prizePool = stakeAmount * 2;
  const winnings = prizePool * 0.99;

  const accentColor = isWin ? 'var(--clue-green)' : isDraw ? '#D97706' : 'var(--orange)';
  const accentBg = isWin ? 'var(--clue-green-bg)' : isDraw ? 'rgba(217,119,6,0.12)' : 'var(--orange-dim)';

  return (
    <motion.div
      className="fixed inset-x-0 inset-y-0 z-[120] flex items-end justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-md pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onHome}
      />

      {/* Confetti particles (win only) */}
      {isWin && <ConfettiLayer />}

      {/* Modal card — capped height + scroll so close/header stay visible on mobile */}
      <motion.div
        className="result-modal-card relative z-10 flex w-full max-w-[440px] max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-bottom,0px)))] flex-col overflow-hidden rounded-t-[2rem] pointer-events-auto sm:max-h-[min(94dvh,calc(100dvh-env(safe-area-inset-bottom,0px)))] sm:rounded-t-[2.5rem]"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-mid)',
          borderBottom: 'none',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 38, delay: 0.05 }}
      >
        {/* Top accent line */}
        <motion.div
          className="h-1 w-full shrink-0"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        />

        {/* Sticky header — close always visible */}
        <div
          className="sticky top-0 z-20 flex shrink-0 items-center justify-between px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top,0px))]"
          style={{ background: 'var(--bg-surface)' }}
        >
          <div className="h-1.5 w-10 rounded-full bg-[var(--border-mid)]/60" aria-hidden />
          <button
            onClick={onHome}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-mid)] bg-[var(--bg-card)] text-[var(--text-dim)] transition-all hover:border-[var(--border-bright)] hover:text-[var(--text)] active:scale-90 sm:h-10 sm:w-10"
            aria-label="Close"
          >
            <X size={20} className="sm:h-6 sm:w-6" />
          </button>
        </div>

        <div className="result-modal-scroll flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:gap-5 sm:px-6 sm:pb-6">

          {/* Result icon */}
          <motion.div
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full sm:h-20 sm:w-20"
            style={{
              background: accentBg,
              border: `2px solid ${accentColor}`,
            }}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.2 }}
          >
            {isWin ? (
              <motion.svg
                width="36" height="36" viewBox="0 0 24 24" fill="none"
                stroke="var(--clue-green)" strokeWidth="2.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.45 }}
              >
                <polyline points="20 6 9 17 4 12"/>
              </motion.svg>
            ) : isDraw ? (
              <motion.span
                className="text-2xl sm:text-3xl"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.45 }}
              >
                🤝
              </motion.span>
            ) : (
              <motion.svg
                width="36" height="36" viewBox="0 0 24 24" fill="none"
                stroke="var(--orange)" strokeWidth="2.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.45 }}
              >
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </motion.svg>
            )}
          </motion.div>

          {/* Result text */}
          <motion.div
            className="flex flex-col items-center gap-1 text-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <h2 className="font-orbitron text-2xl font-black tracking-widest sm:text-3xl"
              style={{ color: accentColor }}>
              {isWin ? (isQuitWin ? 'OPPONENT QUIT' : 'CODE CRACKED') : isDraw ? "IT'S A DRAW" : isQuitLose ? 'YOU QUIT' : 'DEFEATED'}
            </h2>
            <p className="font-body text-sm text-[var(--wood-text-soft)]">
              {isWin
                ? isQuitWin
                  ? `${opponentName} quit while you were still playing — you win!`
                  : `You broke ${opponentName}'s code in ${guessCount} guess${guessCount !== 1 ? 'es' : ''}!`
                : isDraw
                  ? `Neither you nor ${opponentName} cracked the code. Well played!`
                  : isQuitLose
                    ? `You quit — ${opponentName} wins.`
                    : `${opponentName} held their code this time.`}
            </p>
          </motion.div>

          {/* Payout (Cash mode only) */}
          {gameMode === 'cash' && (
            <motion.div
              className="flex w-full flex-col gap-2 rounded-2xl p-4"
              style={{
                background: isWin ? 'rgba(16,185,129,0.08)' : isDraw ? 'rgba(217,119,6,0.08)' : 'rgba(255,107,43,0.08)',
                border: `1px solid ${isWin ? 'rgba(16,185,129,0.2)' : isDraw ? 'rgba(217,119,6,0.2)' : 'rgba(255,107,43,0.2)'}`
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>
                  {isWin ? 'Total Payout' : isDraw ? 'Stake Returned' : 'Stake Lost'}
                </span>
                <span className={`font-orbitron text-xl font-black ${isWin ? 'text-[var(--clue-green)]' : isDraw ? 'text-amber-500' : 'text-[var(--orange)]'}`}>
                  {isWin ? `${winnings.toFixed(2)}` : isDraw ? `${stakeAmount.toFixed(2)}` : `${stakeAmount.toFixed(2)}`} USDT
                </span>
              </div>
              {isWin && (
                <div className="flex items-center justify-between border-t border-[rgba(16,185,129,0.1)] pt-2 text-[10px] text-[var(--text-dim)] uppercase">
                   <span>99% Prize Pool</span>
                   <span>1% Platform Fee Deducted</span>
                </div>
              )}
              {isDraw && (
                <div className="flex items-center justify-center border-t border-[rgba(217,119,6,0.1)] pt-2 text-[10px] text-amber-500/70 uppercase tracking-widest">
                  Both stakes returned — no winner
                </div>
              )}
            </motion.div>
          )}

          {/* Cipher USDT reward campaign ended
          {gameMode === 'ai' && isWin && cipherReward?.paid && (
            <motion.div
              className="flex w-full flex-col gap-1.5 rounded-2xl p-3 sm:gap-2 sm:p-4"
              style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-2)] sm:text-xs">
                  Cipher Reward
                </span>
                <span className="font-orbitron text-lg font-black text-[var(--clue-green)] sm:text-xl">
                  +{(cipherReward.amount ?? 0.1).toFixed(1)} USDT
                </span>
              </div>
              <p className="text-[9px] text-[var(--text-dim)] uppercase tracking-wide sm:text-[10px]">
                Sent to your wallet
              </p>
              {cipherReward.txHash && (
                <a
                  href={`https://celoscan.io/tx/${cipherReward.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent)] underline"
                >
                  View on Celoscan
                </a>
              )}
            </motion.div>
          )}

          {gameMode === 'ai' && isWin && cipherReward && !cipherReward.paid && (
            <motion.div
              className="flex w-full flex-col gap-2 rounded-2xl p-4"
              style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-2)]">
                  Cipher Reward
                </span>
                <span className="font-orbitron text-sm font-black text-[var(--orange)]">
                  Not paid
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-[var(--wood-text-soft)]">
                {cipherRewardMessage(cipherReward.reason)}
              </p>
            </motion.div>
          )}
          */}

          {/* Opponent's secret code */}
          <motion.div
            className="flex w-full flex-col items-center gap-2 rounded-2xl p-3 result-stat-card sm:gap-3 sm:p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
          >
            <p className="text-center font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--wood-text-soft)] sm:text-xs">
              {isWin ? (isQuitWin ? "Opponent's Code" : 'Code You Cracked') : isQuitLose ? "Opponent Code" : "Code You Couldn't Crack"}
            </p>
            <div className="result-code-frame">
              <div className="flex gap-1.5 sm:gap-2">
                {opponentCode.map((d, i) => (
                  <motion.div
                    key={i}
                    className="scoreboard-slot"
                    style={{ width: '2.35rem', height: '2.35rem' }}
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ delay: 0.55 + i * 0.1, duration: 0.35 }}
                  >
                    <div className="scoreboard-tile scoreboard-tile--draft">{d}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Rating delta */}
          <motion.div
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 result-stat-card sm:px-4 sm:py-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex flex-col">
              <span className="font-body text-xs text-[var(--wood-text-soft)]">CMC Points</span>
              <span className="font-ui text-lg font-bold text-[var(--wood-text)] sm:text-xl">
                {statsLoading ? '…' : pointsBefore}
              </span>
            </div>
            {isDraw ? (
              <motion.div
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-ui text-sm font-bold"
                style={{ background: 'rgba(217,119,6,0.15)', color: '#D97706' }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.75, stiffness: 400 }}
              >
                No change
              </motion.div>
            ) : ratingDelta !== 0 ? (
              <motion.div
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-ui text-lg font-bold"
                style={{
                  background: ratingDelta >= 0 ? 'var(--clue-green)' : 'var(--orange)',
                  color: '#fff',
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.75, stiffness: 400 }}
              >
                {ratingDelta >= 0 ? '+' : ''}{ratingDelta}
              </motion.div>
            ) : null}
            <div className="flex flex-col items-end">
              <span className="font-body text-xs text-[var(--wood-text-soft)]">Updated CMC</span>
              <span
                className="font-ui text-lg font-bold sm:text-xl"
                style={{ color: isDraw ? '#D97706' : ratingDelta >= 0 ? 'var(--clue-green)' : 'var(--orange)' }}
              >
                {statsLoading ? '…' : pointsAfter}
              </span>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            className="flex w-full gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            {[
              { label: 'Guesses', value: guessCount },
              { label: 'Accuracy', value: guessCount > 0 ? `${Math.round((1 / guessCount) * 100)}%` : '—' },
              { label: 'Result', value: isWin ? 'WIN' : 'LOSS' },
            ].map((s) => (
              <div
                key={s.label}
                className="result-stat-card flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 sm:py-3"
              >
                <span className="font-ui text-base font-bold text-[var(--wood-text)] sm:text-lg">
                  {s.value}
                </span>
                <span className="font-body text-xs text-[var(--wood-text-soft)]">
                  {s.label}
                </span>
              </div>
            ))}
          </motion.div>

          {gameMode === 'ai' && (
            <motion.button
              onClick={onPlayAgain}
              className={`result-modal__btn ${
                isWin ? 'result-modal__btn--primary-win' : 'result-modal__btn--primary'
              }`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
            >
              <span aria-hidden>🔄</span> Play again
            </motion.button>
          )}

          {gameMode !== 'ai' && onRematch && (
            <motion.div
              className="flex w-full flex-col gap-2.5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
            >
              {rematchStatus === 'opponent_wants' ? (
                <>
                  <p className="text-center font-body text-sm text-[var(--text-2)]">
                    <span className="font-bold text-[var(--accent)]">{opponentName}</span> wants a rematch!
                  </p>
                  <button
                    type="button"
                    onClick={onRematch}
                    disabled={rematchLoading}
                    className="result-modal__btn result-modal__btn--primary"
                  >
                    {rematchLoading ? 'Starting rematch…' : 'Accept rematch'}
                  </button>
                  <button
                    type="button"
                    onClick={onDeclineRematch ?? onHome}
                    disabled={rematchLoading}
                    className="result-modal__btn result-modal__btn--secondary result-modal__btn--danger"
                  >
                    Decline
                  </button>
                </>
              ) : rematchStatus === 'waiting' ? (
                <div className="theme-sky-readout flex flex-col items-center gap-3 px-4 py-4">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--border-mid)] border-t-[var(--accent)]" />
                  <p className="text-center font-body text-sm text-[var(--text-2)]">
                    Waiting for <span className="font-bold text-[var(--accent)]">{opponentName}</span> to accept…
                  </p>
                  <button
                    type="button"
                    onClick={onDeclineRematch ?? onHome}
                    disabled={rematchLoading}
                    className="result-modal__btn result-modal__btn--link"
                  >
                    Cancel & go home
                  </button>
                </div>
              ) : rematchStatus === 'declined' ? (
                <>
                  <p className="text-center font-body text-sm text-[var(--text-2)]">
                    <span className="font-bold text-[var(--accent)]">{opponentName}</span> declined the rematch.
                  </p>
                  <button
                    type="button"
                    onClick={onHome}
                    className="result-modal__btn result-modal__btn--secondary"
                  >
                    <span aria-hidden>🏠</span> Go home
                  </button>
                </>
              ) : (
                <div className="result-modal__btn-row">
                  <button
                    type="button"
                    onClick={onRematch}
                    disabled={rematchLoading}
                    className="result-modal__btn result-modal__btn--primary"
                  >
                    <span aria-hidden>🔄</span> {rematchLoading ? 'Requesting…' : 'Rematch'}
                  </button>
                  <button
                    type="button"
                    onClick={onHome}
                    className="result-modal__btn result-modal__btn--secondary"
                  >
                    <span aria-hidden>🏠</span> Go home
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {gameMode !== 'ai' && (
            <motion.p
              className="shrink-0 pb-1 text-[10px] sm:text-xs"
              style={{ color: 'var(--text-dim)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85 }}
            >
              Reward settlement on Celo
            </motion.p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Confetti particles ───────────────────────────────────────────────────────

function ConfettiLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 28 }).map((_, i) => {
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const left = `${5 + Math.random() * 90}%`;
        const size = 4 + Math.random() * 7;
        const delay = Math.random() * 0.6;
        const duration = 1.2 + Math.random() * 1.2;
        const rotation = Math.random() * 720;
        return (
          <motion.div
            key={i}
            className="absolute top-0 rounded-sm"
            style={{ left, width: size, height: size * 0.6, background: color }}
            initial={{ y: -20, opacity: 1, rotate: 0 }}
            animate={{ y: '110vh', opacity: [1, 1, 0], rotate: rotation }}
            transition={{ duration, delay, ease: 'easeIn' }}
          />
        );
      })}
    </div>
  );
}
