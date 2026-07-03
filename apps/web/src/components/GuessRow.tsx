'use client';

import { motion } from 'framer-motion';
import { type TileClue, clueTileStyle, CODE_LENGTH, tileCluesForGuess } from '@/lib/game';
import type { GuessEntry } from '@/lib/game';

interface GuessRowProps {
  digits: number[];
  clues: GuessEntry['clues'];
  tileClues?: TileClue[];
  rowIndex: number;
  instant?: boolean;
  type?: 'player' | 'opponent';
}

export function ClueDigitTile({
  digit,
  tileClue,
  instant = false,
  delay = 0,
  className = '',
}: {
  digit: number;
  tileClue: TileClue;
  instant?: boolean;
  delay?: number;
  className?: string;
}) {
  const style = clueTileStyle(tileClue);
  return (
    <motion.div
      className={`scoreboard-tile ${className}`.trim()}
      style={{
        background: style.background,
        border: style.border,
        boxShadow: style.boxShadow,
        color: style.color,
      }}
      initial={!instant ? { rotateY: 0 } : false}
      animate={!instant ? { rotateY: [0, 90, 0] } : {}}
      transition={{ duration: 0.45, delay }}
    >
      {digit}
    </motion.div>
  );
}

export default function GuessRow({ digits, clues, tileClues, rowIndex, instant = false, type = 'player' }: GuessRowProps) {
  const tiles = tileClues ?? tileCluesForGuess({ clues, tileClues });
  return (
    <motion.div
      className="scoreboard-row"
      initial={!instant ? { opacity: 0, x: -16 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: instant ? 0 : 0.05 }}
    >
      {digits.map((d, ci) => (
        <div key={ci} className="scoreboard-slot">
          <ClueDigitTile
            digit={d}
            tileClue={tiles[ci]}
            instant={instant}
            delay={ci * 0.08 + 0.15}
          />
        </div>
      ))}
    </motion.div>
  );
}

export function EmptyGuessRow({ rowIndex }: { rowIndex: number }) {
  return (
    <div className="scoreboard-row opacity-40">
      {Array.from({ length: CODE_LENGTH }).map((_, i) => (
        <div key={i} className="scoreboard-slot">
          <div className="scoreboard-tile scoreboard-tile--draft-pulse" />
        </div>
      ))}
    </div>
  );
}
