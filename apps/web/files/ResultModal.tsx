'use client';

import { motion } from 'framer-motion';

interface ResultModalProps {
  result: 'win' | 'lose';
  opponentCode: number[];
  opponentName: string;
  ratingDelta: number;
  playerRating: number;
  guessCount: number;
  onPlayAgain: () => void;
}

const CONFETTI_COLORS = ['#00CFFF', '#10B981', '#F59E0B', '#FF6B2B', '#A78BFA'];

export default function ResultModal({
  result,
  opponentCode,
  opponentName,
  ratingDelta,
  playerRating,
  guessCount,
  onPlayAgain,
}: ResultModalProps) {
  const isWin = result === 'win';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'rgba(3,12,21,0.85)', backdropFilter: 'blur(8px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* Confetti particles (win only) */}
      {isWin && <ConfettiLayer />}

      {/* Modal card */}
      <motion.div
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-t-3xl pb-8"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-mid)',
          borderBottom: 'none',
          boxShadow: isWin
            ? '0 -12px 60px rgba(16,185,129,0.2)'
            : '0 -12px 60px rgba(255,107,43,0.15)',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 38, delay: 0.05 }}
      >
        {/* Top accent line */}
        <motion.div
          className="h-1 w-full"
          style={{
            background: isWin
              ? 'linear-gradient(90deg, transparent, var(--clue-green), transparent)'
              : 'linear-gradient(90deg, transparent, var(--orange), transparent)',
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        />

        <div className="flex flex-col items-center gap-5 px-6 pt-6">

          {/* Result icon */}
          <motion.div
            className="relative flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              background: isWin ? 'var(--clue-green-bg)' : 'var(--orange-dim)',
              border: `2px solid ${isWin ? 'var(--clue-green)' : 'var(--orange)'}`,
              boxShadow: isWin ? '0 0 28px rgba(16,185,129,0.4)' : '0 0 28px rgba(255,107,43,0.35)',
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
            <h2 className="font-orbitron text-3xl font-black tracking-widest"
              style={{ color: isWin ? 'var(--clue-green)' : 'var(--orange)' }}>
              {isWin ? 'CODE CRACKED' : 'DEFEATED'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>
              {isWin
                ? `You broke ${opponentName}'s code in ${guessCount} guess${guessCount !== 1 ? 'es' : ''}!`
                : `${opponentName} held their code this time.`}
            </p>
          </motion.div>

          {/* Opponent's secret code */}
          <motion.div
            className="flex w-full flex-col gap-2 rounded-2xl p-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-mid)' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
          >
            <p className="text-center text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>
              {opponentName}'s Secret Code
            </p>
            <div className="flex justify-center gap-2.5">
              {opponentCode.map((d, i) => (
                <motion.div
                  key={i}
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '2px solid var(--border-bright)',
                    boxShadow: '0 0 12px var(--accent-glow)',
                  }}
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ delay: 0.55 + i * 0.1, duration: 0.35 }}
                >
                  <span className="font-code text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                    {d}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Rating delta */}
          <motion.div
            className="flex w-full items-center justify-between rounded-xl px-4 py-3"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex flex-col">
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>Rating</span>
              <span className="font-orbitron text-xl font-bold" style={{ color: 'var(--text)' }}>
                {playerRating}
              </span>
            </div>
            <motion.div
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-orbitron text-lg font-bold"
              style={{
                background: ratingDelta >= 0 ? 'var(--clue-green-bg)' : 'var(--orange-dim)',
                color: ratingDelta >= 0 ? 'var(--clue-green)' : 'var(--orange)',
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.75, stiffness: 400 }}
            >
              {ratingDelta >= 0 ? '+' : ''}{ratingDelta}
            </motion.div>
            <div className="flex flex-col items-end">
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>New Rating</span>
              <span className="font-orbitron text-xl font-bold"
                style={{ color: ratingDelta >= 0 ? 'var(--clue-green)' : 'var(--orange)' }}>
                {playerRating + ratingDelta}
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
                className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-3"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <span className="font-code text-lg font-bold" style={{ color: 'var(--text)' }}>
                  {s.value}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-2)' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </motion.div>

          {/* Play again */}
          <motion.button
            onClick={onPlayAgain}
            className="w-full rounded-2xl py-4 font-orbitron text-base font-bold tracking-widest"
            style={{
              background: isWin
                ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)'
                : 'linear-gradient(135deg, #0099CC 0%, #00CFFF 100%)',
              color: '#030C15',
              boxShadow: isWin ? '0 4px 20px rgba(16,185,129,0.4)' : '0 4px 20px var(--accent-glow)',
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            whileTap={{ scale: 0.97 }}
          >
            PLAY AGAIN
          </motion.button>

          <motion.p
            className="text-xs"
            style={{ color: 'var(--text-dim)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
          >
            Reward settlement on Celo
          </motion.p>
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
