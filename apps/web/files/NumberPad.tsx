'use client';

import { motion } from 'framer-motion';

interface NumberPadProps {
  usedDigits: number[];      // digits already in currentInput
  disabled: boolean;
  onDigit: (d: number) => void;
  onDelete: () => void;
}

export default function NumberPad({ usedDigits, disabled, onDigit, onDelete }: NumberPadProps) {
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
              used={usedDigits.includes(d!)}
              disabled={disabled}
              onPress={onDigit}
            />
          ))}
        </div>
      ))}

      {/* Bottom row: [←] [0] [empty] */}
      <div className="flex gap-2">
        <motion.button
          onClick={onDelete}
          disabled={disabled || usedDigits.length === 0}
          className="flex h-14 flex-1 items-center justify-center rounded-xl transition-opacity"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-mid)',
            color: 'var(--text-2)',
            opacity: disabled || usedDigits.length === 0 ? 0.3 : 1,
          }}
          whileTap={!disabled ? { scale: 0.88 } : {}}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </motion.button>

        <DigitButton digit={0} used={usedDigits.includes(0)} disabled={disabled} onPress={onDigit} />

        {/* Placeholder to keep layout balanced */}
        <div className="flex-1" />
      </div>
    </div>
  );
}

// ─── Individual digit button ──────────────────────────────────────────────────

interface DigitButtonProps {
  digit: number;
  used: boolean;
  disabled: boolean;
  onPress: (d: number) => void;
}

function DigitButton({ digit, used, disabled, onPress }: DigitButtonProps) {
  const isDisabled = disabled || used;

  return (
    <motion.button
      onClick={() => !isDisabled && onPress(digit)}
      disabled={isDisabled}
      className="relative flex h-14 flex-1 items-center justify-center rounded-xl font-code text-xl font-bold select-none"
      style={{
        background: used ? 'var(--clue-gray)' : 'var(--bg-elevated)',
        border: `1px solid ${used ? 'transparent' : 'var(--border-mid)'}`,
        color: used ? 'var(--text-dim)' : 'var(--text)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s, color 0.15s',
      }}
      whileTap={!isDisabled ? { scale: 0.84, transition: { duration: 0.07 } } : {}}
      initial={false}
    >
      {/* Ripple on press */}
      {!used && !disabled && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{ background: 'var(--accent-dim)' }}
          initial={{ opacity: 0 }}
          whileTap={{ opacity: [0, 0.5, 0], transition: { duration: 0.2 } }}
        />
      )}

      {used ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ color: 'var(--text-dim)' }}>
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      ) : (
        digit
      )}
    </motion.button>
  );
}
