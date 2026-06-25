'use client';

import { motion } from 'framer-motion';
import { type TileClue, clueTileStyle, CODE_LENGTH, tileCluesForGuess } from '@/lib/game';
import type { GuessEntry } from '@/lib/game';

interface GuessRowProps {
  digits: number[];
  clues: GuessEntry['clues'];
  tileClues?: TileClue[];
  rowIndex: number;
  /** If true, skip the reveal animation (already seen rows) */
  instant?: boolean;
  type?: 'player' | 'opponent';
}

export function ClueDigitTile({
  digit,
  tileClue,
  instant = false,
  delay = 0,
}: {
  digit: number;
  tileClue: TileClue;
  instant?: boolean;
  delay?: number;
}) {
  const style = clueTileStyle(tileClue);
  return (
    <motion.div
      className="flex h-10 w-10 items-center justify-center rounded-xl"
      style={{
        background: style.background,
        border: style.border,
        boxShadow: style.boxShadow,
      }}
      initial={!instant ? { rotateY: 0 } : false}
      animate={!instant ? { rotateY: [0, 90, 0] } : {}}
      transition={{ duration: 0.45, delay }}
    >
      <span className="font-code text-base font-bold" style={{ color: style.color }}>
        {digit}
      </span>
    </motion.div>
  );
}

export default function GuessRow({ digits, clues, tileClues, rowIndex, instant = false, type = 'player' }: GuessRowProps) {
  const tiles = tileClues ?? tileCluesForGuess({ clues, tileClues });
  return (
    <motion.div
      className="flex items-center gap-2"
      initial={!instant ? { opacity: 0, x: -16 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: instant ? 0 : 0.05 }}
    >
      {type === 'opponent' && (
        <div className="w-1 h-8 rounded-full bg-[var(--orange)]" />
      )}

      <span
        className="w-5 text-right text-xs font-medium tabular-nums"
        style={{ color: type === 'opponent' ? 'var(--orange)' : 'var(--text-dim)' }}
      >
        {rowIndex + 1}
      </span>

      <div className="flex gap-1.5">
        {digits.map((d, ci) => (
          <ClueDigitTile
            key={ci}
            digit={d}
            tileClue={tiles[ci]}
            instant={instant}
            delay={ci * 0.08 + 0.15}
          />
        ))}
      </div>

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

export function EmptyGuessRow({ rowIndex }: { rowIndex: number }) {
  return (
    <div className="flex items-center gap-2 opacity-25">
      <span className="w-5 text-right text-xs font-medium tabular-nums" style={{ color: 'var(--text-dim)' }}>
        {rowIndex + 1}
      </span>
      <div className="flex gap-1.5">
        {Array.from({ length: CODE_LENGTH }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-10 rounded-xl"
            style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-mid)' }}
          />
        ))}
      </div>
    </div>
  );
}
