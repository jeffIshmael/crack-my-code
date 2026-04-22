'use client';

import { motion } from 'framer-motion';

interface LobbyProps {
  rating: number;
  isMatchmaking: boolean;
  opponentName: string;
  onFindMatch: () => void;
}

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function Lobby({ rating, isMatchmaking, opponentName, onFindMatch }: LobbyProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-between px-5 pt-16 pb-12">

      {/* ── Top status bar ── */}
      <motion.div
        className="flex w-full max-w-sm items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: 'var(--clue-green)', boxShadow: '0 0 8px var(--clue-green)' }}
          />
          <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
            Celo Mainnet
          </span>
        </div>
        <div
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border-mid)' }}
        >
          MiniPay
        </div>
      </motion.div>

      {/* ── Hero / Logo ── */}
      <motion.div className="flex flex-col items-center gap-6 text-center" variants={stagger} initial="initial" animate="animate">

        {/* Glyph icon */}
        <motion.div variants={fadeUp} className="relative">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-card) 100%)',
              border: '1px solid var(--border-bright)',
              boxShadow: '0 0 28px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Four-dot code pattern */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { c: 'var(--clue-green)' },
                { c: 'var(--clue-yellow)' },
                { c: 'var(--clue-yellow)' },
                { c: 'var(--clue-gray)' },
              ].map((dot, i) => (
                <motion.div
                  key={i}
                  className="h-4 w-4 rounded-full"
                  style={{ background: dot.c, boxShadow: `0 0 8px ${dot.c}` }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.8, delay: i * 0.25, repeat: Infinity, ease: 'easeInOut' }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div variants={fadeUp} className="flex flex-col items-center gap-2">
          <h1
            className="font-orbitron logo-shimmer text-5xl font-black tracking-wider"
            style={{ letterSpacing: '0.06em' }}
          >
            CODEBREAKER
          </h1>
          <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
            1v1 Logic Duel • Real-time • On-chain
          </p>
        </motion.div>

        {/* Rating card */}
        <motion.div
          variants={fadeUp}
          className="flex items-center gap-4 rounded-2xl px-6 py-4"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-mid)',
            minWidth: '260px',
          }}
        >
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>
              Rating
            </span>
            <span className="font-orbitron text-3xl font-bold" style={{ color: 'var(--accent)' }}>
              {rating}
            </span>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>Rank</span>
              <span
                className="rounded px-2 py-0.5 text-xs font-bold"
                style={{ background: 'var(--orange-dim)', color: 'var(--orange)' }}
              >
                Gold II
              </span>
            </div>
            <div className="flex gap-1">
              {[1,2,3,4,5].map((s) => (
                <div
                  key={s}
                  className="h-1.5 w-4 rounded-full"
                  style={{ background: s <= 3 ? 'var(--orange)' : 'var(--text-dim)' }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Recent match badges */}
        <motion.div variants={fadeUp} className="flex gap-2">
          {['W','W','L','W','W'].map((r, i) => (
            <div
              key={i}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
              style={{
                background: r === 'W' ? 'var(--clue-green-bg)' : 'rgba(239,68,68,0.12)',
                color: r === 'W' ? 'var(--clue-green)' : '#EF4444',
                border: `1px solid ${r === 'W' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}
            >
              {r}
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Find Match button / Matchmaking state ── */}
      <motion.div
        className="flex w-full max-w-sm flex-col items-center gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.35 }}
      >
        {isMatchmaking ? (
          <MatchmakingPulse opponentName={opponentName} />
        ) : (
          <>
            <button
              onClick={onFindMatch}
              className="animate-pulse-glow relative w-full overflow-hidden rounded-2xl py-5 font-orbitron text-lg font-bold tracking-widest transition-transform duration-150 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #0099CC 0%, #00CFFF 50%, #0099CC 100%)',
                backgroundSize: '200% auto',
                color: '#030C15',
                boxShadow: '0 4px 24px var(--accent-glow)',
              }}
            >
              <span className="relative z-10">FIND MATCH</span>
              <motion.div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
              />
            </button>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              ~30 players online now
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}

// ─── Radar matchmaking animation ────────────────────────────────────────────

function MatchmakingPulse({ opponentName }: { opponentName: string }) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Radar rings */}
      <div className="relative flex h-28 w-28 items-center justify-center">
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border"
            style={{ borderColor: 'var(--accent)' }}
            initial={{ width: 24, height: 24, opacity: 0.8 }}
            animate={{ width: 112, height: 112, opacity: 0 }}
            transition={{ duration: 1.8, delay: ring * 0.5, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
        {/* Center dot */}
        <div
          className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: 'var(--accent-dim)', border: '2px solid var(--accent)', boxShadow: '0 0 16px var(--accent-glow)' }}
        >
          <motion.div
            className="h-3 w-3 rounded-full"
            style={{ background: 'var(--accent)' }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-orbitron text-sm font-semibold tracking-widest" style={{ color: 'var(--accent)' }}>
          FINDING OPPONENT
        </p>
        <motion.p
          className="text-xs"
          style={{ color: 'var(--text-2)' }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          Scanning for challengers
          <motion.span animate={{ opacity: [0,1,0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}>.</motion.span>
          <motion.span animate={{ opacity: [0,1,0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.6 }}>.</motion.span>
          <motion.span animate={{ opacity: [0,1,0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.8 }}>.</motion.span>
        </motion.p>
      </div>

      {/* Found opponent indicator */}
      <motion.div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-mid)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        <motion.div
          className="h-2 w-2 rounded-full"
          style={{ background: 'var(--orange)' }}
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
        <span className="font-code text-sm font-bold" style={{ color: 'var(--orange)' }}>
          {opponentName}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-2)' }}>found</span>
      </motion.div>
    </div>
  );
}
