'use client';

import { motion } from 'framer-motion';
import type { Clue } from '@/lib/game';

interface GuessRowProps {
  digits: number[];
  clues: Clue[];
  rowIndex: number;
  /** If true, skip the reveal animation (already seen rows) */
  instant?: boolean;
}

const CLUE_STYLES: Record<Clue, { bg: string; border: string; glow: string }> = {
  green:  { bg: 'var(--clue-green)',    border: 'rgba(16,185,129,0.5)',  glow: '0 0 10px rgba(16,185,129,0.5)' },
  yellow: { bg: 'var(--clue-yellow)',   border: 'rgba(245,158,11,0.5)',  glow: '0 0 10px rgba(245,158,11,0.4)' },
  gray:   { bg: 'var(--clue-gray)',     border: 'rgba(30,50,69,0.8)',    glow: 'none' },
};

export default function GuessRow({ digits, clues, rowIndex, instant = false }: GuessRowProps) {
  return (
    <motion.div
      className="flex items-center gap-2"
      initial={!instant ? { opacity: 0, x: -16 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: instant ? 0 : 0.05 }}
    >
      {/* Row number */}
      <span
        className="w-5 text-right text-xs font-medium tabular-nums"
        style={{ color: 'var(--text-dim)' }}
      >
        {rowIndex + 1}
      </span>

      {/* Digit tiles */}
      <div className="flex gap-1.5">
        {digits.map((d, ci) => (
          <motion.div
            key={ci}
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-mid)',
            }}
            initial={!instant ? { rotateY: 0 } : false}
            animate={!instant ? { rotateY: [0, 90, 0] } : {}}
            transition={{ duration: 0.45, delay: ci * 0.08 + 0.15 }}
          >
            <span className="font-code text-base font-bold" style={{ color: 'var(--text)' }}>
              {d}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Divider */}
      <div className="h-4 w-px rounded-full" style={{ background: 'var(--border-mid)' }} />

      {/* Clue dots */}
      <div className="flex gap-1.5">
        {clues.map((clue, ci) => {
          const style = CLUE_STYLES[clue];
          return (
            <motion.div
              key={ci}
              className="h-4 w-4 rounded-full"
              style={{
                background: 'var(--bg-card)',
                border: `2px solid var(--border)`,
              }}
              animate={
                !instant
                  ? {
                      background: [CLUE_STYLES.gray.bg, style.bg],
                      borderColor: ['var(--border)', style.border],
                      boxShadow: ['none', style.glow],
                      scale: [1, 1.25, 1],
                    }
                  : {
                      background: style.bg,
                      borderColor: style.border,
                      boxShadow: style.glow,
                    }
              }
              transition={{ duration: 0.25, delay: instant ? 0 : ci * 0.12 + 0.55 }}
            />
          );
        })}
      </div>

      {/* Win indicator */}
      {clues.every((c) => c === 'green') && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, type: 'spring', stiffness: 400 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ color: 'var(--clue-green)' }}>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─── Empty placeholder row ─────────────────────────────────────────────────── */
export function EmptyGuessRow({ rowIndex }: { rowIndex: number }) {
  return (
    <div className="flex items-center gap-2 opacity-25">
      <span className="w-5 text-right text-xs font-medium tabular-nums" style={{ color: 'var(--text-dim)' }}>
        {rowIndex + 1}
      </span>
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-10 rounded-xl"
            style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-mid)' }}
          />
        ))}
      </div>
      <div className="h-4 w-px rounded-full" style={{ background: 'var(--border)' }} />
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 w-4 rounded-full" style={{ border: '2px dashed var(--border)' }} />
        ))}
      </div>
    </div>
  );
}
