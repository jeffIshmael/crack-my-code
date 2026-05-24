'use client';

import { motion } from 'framer-motion';

interface NumberPadProps {
  inputLength: number;
  maxLength: number;
  disabled: boolean;
  onDigit: (d: number) => void;
  onDelete: () => void;
}

export default function NumberPad({ inputLength, maxLength, disabled, onDigit, onDelete }: NumberPadProps) {
  const isFull = inputLength >= maxLength;
  // Layout: 3×3 grid + 0 centered at bottom with delete
  const rows: (number | null)[][] = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ];

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* 1–9 grid */}
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-2">
          {row.map((d) => (
            <DigitButton
              key={d}
              digit={d!}
              disabled={disabled || isFull}
              onPress={onDigit}
            />
          ))}
        </div>
      ))}

      {/* Bottom row: [←] [0] [empty] */}
      <div className="flex gap-2">
        <motion.button
          onClick={onDelete}
          disabled={disabled || inputLength === 0}
          className="flex h-14 flex-1 items-center justify-center rounded-xl transition-opacity"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-mid)',
            color: 'var(--text-2)',
            opacity: disabled || inputLength === 0 ? 0.3 : 1,
          }}
          whileTap={!disabled ? { scale: 0.88 } : {}}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </motion.button>

        <DigitButton digit={0} disabled={disabled || isFull} onPress={onDigit} />

        {/* Placeholder to keep layout balanced */}
        <div className="flex-1" />
      </div>
    </div>
  );
}

// ─── Individual digit button ──────────────────────────────────────────────────

interface DigitButtonProps {
  digit: number;
  disabled: boolean;
  onPress: (d: number) => void;
}

function DigitButton({ digit, disabled, onPress }: DigitButtonProps) {
  return (
    <motion.button
      onClick={() => !disabled && onPress(digit)}
      disabled={disabled}
      className="relative flex h-14 flex-1 items-center justify-center rounded-xl font-code text-xl font-bold select-none"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-mid)',
        color: 'var(--text)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.15s, color 0.15s',
      }}
      whileTap={!disabled ? { scale: 0.84, transition: { duration: 0.07 } } : {}}
      initial={false}
    >
      {!disabled && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{ background: 'var(--accent-dim)' }}
          initial={{ opacity: 0 }}
          whileTap={{ opacity: [0, 0.5, 0], transition: { duration: 0.2 } }}
        />
      )}
      {digit}
    </motion.button>
  );
}
