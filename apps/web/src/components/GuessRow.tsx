'use client';

import { motion } from 'framer-motion';
import { type Clue, getHintText } from '@/lib/game';

interface GuessRowProps {
  digits: number[];
  clues: Clue[];
  rowIndex: number;
  /** If true, skip the reveal animation (already seen rows) */
  instant?: boolean;
}

const CLUE_STYLES: Record<string, { color: string; bg: string }> = {
  high: { color: 'var(--clue-green)', bg: 'rgba(16,185,129,0.1)' },
  mid:  { color: 'var(--clue-yellow)', bg: 'rgba(245,158,11,0.1)' },
  none: { color: 'var(--text-dim)', bg: 'rgba(255,255,255,0.05)' },
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

      {/* Verbose Hint */}
      <motion.div
        className="flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider"
        style={{
          background: clues.some(c => c === 'green') ? 'rgba(16,185,129,0.1)' : 'var(--bg-card)',
          borderColor: clues.some(c => c === 'green') ? 'rgba(16,185,129,0.4)' : 'var(--border)',
          color: clues.some(c => c === 'green') ? 'var(--clue-green)' : 'var(--text-2)',
        }}
        animate={
          !instant
            ? {
                scale: [1, 1.05, 1],
                borderColor: clues.some(c => c === 'green') 
                  ? ['rgba(16,185,129,0.4)', 'rgba(16,185,129,0.8)', 'rgba(16,185,129,0.4)'] 
                  : ['var(--border)', 'var(--border-bright)', 'var(--border)'],
              }
            : {}
        }
        transition={{ duration: 0.4, delay: instant ? 0 : 0.6 }}
      >
        {getHintText(clues)}
      </motion.div>

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
      <div className="flex-1 h-6 rounded-lg" style={{ border: '1px dashed var(--border)', background: 'rgba(255,255,255,0.02)' }} />
    </div>
  );
}
