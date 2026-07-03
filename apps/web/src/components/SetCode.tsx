'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NumberPad from '@/components/NumberPad';
import { CODE_LENGTH } from '@/lib/game';

interface SetCodeProps {
  opponentName: string;
  onLockCode: (code: number[]) => void;
  onBack?: () => void;
  isWaiting?: boolean;
}

export default function SetCode({ opponentName, onLockCode, onBack, isWaiting }: SetCodeProps) {
  const [code, setCode] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);

  const addDigit = useCallback((d: number) => {
    setCode((prev) => {
      if (prev.length >= CODE_LENGTH) return prev;
      return [...prev, d];
    });
  }, []);

  const removeDigit = useCallback(() => {
    setCode((prev) => prev.slice(0, -1));
  }, []);

  const handleLock = useCallback(() => {
    if (code.length < CODE_LENGTH || locked) return;
    setLocked(true);
    setTimeout(() => onLockCode(code), 700);
  }, [code, locked, onLockCode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (locked) return;
      if (e.key >= '0' && e.key <= '9') addDigit(Number(e.key));
      if (e.key === 'Backspace') removeDigit();
      if (e.key === 'Enter' && code.length === CODE_LENGTH) handleLock();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, code.length, addDigit, removeDigit, handleLock]);

  const isComplete = code.length === CODE_LENGTH;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-between px-5 pt-8 pb-10">
      <motion.div
        className="flex w-full max-w-sm flex-col gap-1"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1 rounded-lg px-2 py-1 font-ui text-xs font-bold uppercase tracking-widest text-[var(--cream)] transition-colors hover:bg-white/20"
            style={{ textShadow: '0 1px 3px rgba(13, 111, 168, 0.45)' }}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-2 rounded-full bg-white/25 px-3 py-1">
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--orange)', boxShadow: '0 0 8px var(--orange)' }}
            />
            <span className="font-ui text-xs font-bold uppercase tracking-widest text-[var(--cream)]">
              vs {opponentName}
            </span>
          </div>
        </div>

        <div className="theme-sky-readout mt-2 flex flex-col gap-1.5">
          <h2 className="font-ui text-2xl font-bold">Set Your Secret Code</h2>
          <p className="font-body text-sm">Choose 4 digits (0–9). Duplicates allowed.</p>
        </div>
      </motion.div>

      <motion.div
        className="flex w-full max-w-sm flex-col items-center gap-5"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="set-code-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Your opponent cannot see this
        </div>

        <div className="scoreboard-plaque w-full max-w-[280px]">
          <div className="scoreboard-frame">
            <div className="flex justify-center gap-3">
              {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                const filled = i < code.length;
                const isActive = i === code.length && !locked;
                const digit = code[i];
                return (
                  <div
                    key={i}
                    className={`set-code-slot ${isActive ? 'set-code-slot--active' : ''}`}
                  >
                    <AnimatePresence mode="popLayout">
                      {filled ? (
                        <motion.div
                          key={`${i}-${digit}`}
                          className={`set-code-tile ${locked ? 'number-pad-key--hint-green' : ''}`}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        >
                          {digit}
                        </motion.div>
                      ) : (
                        <div className="set-code-tile set-code-tile--empty">
                          {isActive && (
                            <motion.div
                              className="h-7 w-0.5 rounded-full bg-[var(--sky-deep)]"
                              animate={{ opacity: [1, 0, 1] }}
                              transition={{ duration: 0.9, repeat: Infinity }}
                            />
                          )}
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <motion.div
              key={i}
              className="h-1.5 rounded-full"
              style={{ background: i < code.length ? 'var(--wood-dark)' : 'rgba(255,255,255,0.45)' }}
              animate={{ width: i < code.length ? 24 : 8 }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <NumberPad
          inputLength={code.length}
          maxLength={CODE_LENGTH}
          disabled={locked}
          onDigit={addDigit}
          onDelete={removeDigit}
        />

        <motion.button
          onClick={handleLock}
          disabled={!isComplete || locked}
          className={`set-code-lock-btn mt-3 w-full ${
            isComplete && !locked ? 'set-code-lock-btn--ready' : 'set-code-lock-btn--disabled'
          }`}
          whileTap={isComplete && !locked ? { scale: 0.98 } : {}}
          type="button"
        >
          {isWaiting ? (
            <span className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
              WAITING…
            </span>
          ) : locked ? (
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
              LOCKED!
            </span>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              LOCK CODE
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
