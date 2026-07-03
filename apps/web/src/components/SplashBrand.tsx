'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SPLASH_CODE = ['C', '0', 'D', '3'] as const;
const SPLASH_HINTS = ['absent', 'green', 'absent', 'green'] as const;

type SplashPhase = 'intro' | 'typing' | 'checking' | 'revealed';

export type SplashAnimPhase = 'intro' | 'typing' | 'checking' | 'revealed' | 'loading';

/** Shared splash timing (ms from mount) */
export const SPLASH_TIMING = {
  boardDelayMs: 1800,
  typeStartMs: 3200,
  typeIntervalMs: 680,
  checkMs: 1200,
  codeLength: SPLASH_CODE.length,
} as const;

function hintClass(hint: (typeof SPLASH_HINTS)[number]) {
  if (hint === 'green') return 'number-pad-key--hint-green';
  return 'number-pad-key--hint-absent';
}

function SplashSlot({
  char,
  hint,
  isActive,
  isChecking,
}: {
  char: string | null;
  hint: (typeof SPLASH_HINTS)[number] | null;
  isActive: boolean;
  isChecking: boolean;
}) {
  const showHint = hint !== null && char !== null;

  return (
    <div
      className={`scoreboard-slot splash-brand__slot ${isActive ? 'splash-brand__slot--active' : ''} ${isChecking ? 'splash-brand__slot--checking' : ''}`}
    >
      <AnimatePresence mode="wait">
        {char ? (
          <motion.div
            key={`${char}-${showHint ? hint : 'draft'}`}
            className={`scoreboard-tile splash-brand__tile ${showHint ? `number-pad-key ${hintClass(hint!)}` : 'scoreboard-tile--draft'}`}
            initial={{ scale: 0.35, opacity: 0, y: 8 }}
            animate={
              showHint
                ? { scale: 1, opacity: 1, y: 0, rotateY: [0, 90, 0] }
                : { scale: 1, opacity: 1, y: 0 }
            }
            transition={
              showHint
                ? { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
                : { type: 'spring', stiffness: 480, damping: 16 }
            }
          >
            {char}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            className="scoreboard-tile scoreboard-tile--draft-pulse splash-brand__tile splash-brand__tile--empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface SplashBrandProps {
  onPhaseChange?: (phase: SplashAnimPhase) => void;
  onReveal?: () => void;
}

export function SplashBrand({ onPhaseChange, onReveal }: SplashBrandProps) {
  const [phase, setPhase] = useState<SplashPhase>('intro');
  const [typedCount, setTypedCount] = useState(0);
  const [boardVisible, setBoardVisible] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const { boardDelayMs, typeStartMs, typeIntervalMs, checkMs, codeLength } = SPLASH_TIMING;

    const set = (p: SplashPhase) => {
      setPhase(p);
      onPhaseChange?.(p);
    };

    timers.push(setTimeout(() => setBoardVisible(true), boardDelayMs));
    timers.push(setTimeout(() => set('typing'), typeStartMs));

    SPLASH_CODE.forEach((_, i) => {
      timers.push(setTimeout(() => setTypedCount(i + 1), typeStartMs + i * typeIntervalMs));
    });

    const afterType = typeStartMs + codeLength * typeIntervalMs;
    timers.push(setTimeout(() => set('checking'), afterType));
    timers.push(
      setTimeout(() => {
        set('revealed');
        onPhaseChange?.('loading');
        onReveal?.();
      }, afterType + checkMs),
    );

    return () => timers.forEach(clearTimeout);
  }, [onPhaseChange, onReveal]);

  return (
    <motion.div
      className="splash-brand"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Crack My Code"
    >
      <motion.h1
        className="splash-brand__title font-display"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="splash-brand__title-accent">Crack</span>
        <span className="splash-brand__title-rest"> My</span>
      </motion.h1>

      <AnimatePresence>
        {boardVisible && (
          <motion.div
            className={`about-scoreboard-frame splash-brand__frame ${phase === 'checking' ? 'splash-brand__frame--checking' : ''}`}
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          >
            <div className="about-scoreboard-row">
              {SPLASH_CODE.map((_, i) => (
                <SplashSlot
                  key={i}
                  char={i < typedCount ? SPLASH_CODE[i] : null}
                  hint={phase === 'revealed' ? SPLASH_HINTS[i] : null}
                  isActive={phase === 'typing' && typedCount === i}
                  isChecking={phase === 'checking' && i < typedCount}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function getSplashRevealMs(): number {
  const { typeStartMs, typeIntervalMs, checkMs, codeLength } = SPLASH_TIMING;
  return typeStartMs + codeLength * typeIntervalMs + checkMs;
}
