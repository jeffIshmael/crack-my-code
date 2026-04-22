'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CODE_LENGTH } from '@/lib/game';

interface SetCodeProps {
  opponentName: string;
  onLockCode: (code: number[]) => void;
}

export default function SetCode({ opponentName, onLockCode }: SetCodeProps) {
  const [code, setCode]    = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);

  const addDigit = (d: number) => {
    if (code.length >= CODE_LENGTH) return;
    if (code.includes(d)) {
      // visual shake on duplicate attempt
      setShakeIdx(code.indexOf(d));
      setTimeout(() => setShakeIdx(null), 400);
      return;
    }
    setCode([...code, d]);
  };

  const removeDigit = () => setCode(code.slice(0, -1));

  const handleLock = () => {
    if (code.length < CODE_LENGTH) return;
    setLocked(true);
    setTimeout(() => onLockCode(code), 700);
  };

  const isComplete = code.length === CODE_LENGTH;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-between px-5 pt-10 pb-10">

      {/* ── Header ── */}
      <motion.div
        className="flex w-full max-w-sm flex-col gap-1"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--orange)', boxShadow: '0 0 8px var(--orange)' }}
          />
          <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>
            vs {opponentName}
          </span>
        </div>
        <h2 className="font-orbitron text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Set Your Secret Code
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>
          Choose 4 unique digits (0–9). No repeats allowed.
        </p>
      </motion.div>

      {/* ── Digit slots ── */}
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Instruction badge */}
        <motion.div
          className="flex items-center gap-2 rounded-xl px-4 py-2.5"
          style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-mid)' }}
          animate={isComplete ? { borderColor: 'var(--border-bright)' } : {}}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--accent)' }}>
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
            Your opponent cannot see this
          </span>
        </motion.div>

        {/* Four slots */}
        <div className="flex gap-3">
          {Array.from({ length: CODE_LENGTH }).map((_, i) => {
            const filled = i < code.length;
            const isActive = i === code.length;
            const digit = code[i];
            return (
              <motion.div
                key={i}
                className="relative flex h-20 w-16 items-center justify-center rounded-2xl"
                style={{
                  background: filled ? 'var(--bg-elevated)' : 'var(--bg-card)',
                  border: `2px solid ${
                    filled ? 'var(--border-bright)' :
                    isActive ? 'var(--border-mid)' :
                    'var(--border)'
                  }`,
                  boxShadow: filled ? '0 0 16px var(--accent-glow)' : 'none',
                }}
                animate={
                  shakeIdx === i
                    ? { x: [-5, 5, -4, 4, 0] }
                    : locked && filled
                    ? { scale: [1, 1.08, 1] }
                    : {}
                }
                transition={{ duration: 0.35 }}
              >
                {/* Cursor blink */}
                {isActive && !locked && (
                  <motion.div
                    className="absolute h-8 w-0.5 rounded-full"
                    style={{ background: 'var(--accent)' }}
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                  />
                )}
                <AnimatePresence mode="popLayout">
                  {filled && (
                    <motion.span
                      key={digit}
                      className="font-code text-3xl font-bold"
                      style={{ color: locked ? 'var(--clue-green)' : 'var(--accent)' }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      {digit}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Locked overlay */}
                {locked && filled && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{ background: 'var(--clue-green-bg)', border: '2px solid var(--clue-green)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <motion.div
              key={i}
              className="h-1.5 rounded-full"
              style={{ background: i < code.length ? 'var(--accent)' : 'var(--text-dim)' }}
              animate={{ width: i < code.length ? 24 : 8 }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
      </motion.div>

      {/* ── Number grid ── */}
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="grid grid-cols-5 gap-2.5 mb-3">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
            const isUsed = code.includes(d);
            const isFull = code.length >= CODE_LENGTH;
            const disabled = isUsed || isFull;
            return (
              <motion.button
                key={d}
                onClick={() => addDigit(d)}
                disabled={disabled}
                className="relative flex h-14 items-center justify-center rounded-xl font-code text-xl font-bold transition-opacity"
                style={{
                  background: isUsed
                    ? 'var(--clue-gray)'
                    : 'var(--bg-elevated)',
                  color: isUsed ? 'var(--text-dim)' : 'var(--text)',
                  border: `1px solid ${isUsed ? 'transparent' : 'var(--border-mid)'}`,
                  opacity: isFull && !isUsed ? 0.4 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
                whileTap={!disabled ? { scale: 0.88, transition: { duration: 0.08 } } : {}}
              >
                {isUsed && (
                  <svg
                    className="absolute"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    style={{ color: 'var(--text-dim)' }}
                  >
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                )}
                {!isUsed && d}
              </motion.button>
            );
          })}
        </div>

        {/* Backspace row */}
        <div className="flex gap-2.5">
          <motion.button
            onClick={removeDigit}
            disabled={code.length === 0}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-opacity"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
              opacity: code.length === 0 ? 0.3 : 1,
            }}
            whileTap={code.length > 0 ? { scale: 0.95 } : {}}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            Delete
          </motion.button>

          {/* Lock Code */}
          <motion.button
            onClick={handleLock}
            disabled={!isComplete || locked}
            className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-xl font-orbitron text-sm font-bold tracking-wider transition-all"
            style={{
              background: isComplete && !locked
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                : 'var(--clue-gray)',
              color: isComplete && !locked ? '#fff' : 'var(--text-dim)',
              boxShadow: isComplete && !locked ? '0 4px 18px rgba(16,185,129,0.4)' : 'none',
              cursor: isComplete && !locked ? 'pointer' : 'not-allowed',
            }}
            whileTap={isComplete && !locked ? { scale: 0.96 } : {}}
          >
            {locked ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
                LOCKED!
              </motion.span>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                LOCK CODE
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
