'use client';

import { motion } from 'framer-motion';

interface NumberPadProps {
  inputLength: number;
  maxLength: number;
  disabled: boolean;
  canSubmit?: boolean;
  isSubmitting?: boolean;
  onDigit: (d: number) => void;
  onDelete: () => void;
  onSubmit?: () => void;
}

export default function NumberPad({
  inputLength,
  maxLength,
  disabled,
  canSubmit = false,
  isSubmitting = false,
  onDigit,
  onDelete,
  onSubmit,
}: NumberPadProps) {
  const isFull = inputLength >= maxLength;
  const rows: (number | null)[][] = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ];

  return (
    <div className="hint-keyboard-tray">
      <div className="flex w-full flex-col gap-2">
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

        <div className="flex gap-2">
          <motion.button
            onClick={onDelete}
            disabled={disabled || inputLength === 0}
            className="number-pad-key flex h-12 flex-1 items-center justify-center rounded-xl transition-opacity"
            style={{
              opacity: disabled || inputLength === 0 ? 0.3 : 1,
            }}
            whileTap={!disabled ? { scale: 0.88 } : {}}
            type="button"
            aria-label="Delete digit"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </motion.button>

          <DigitButton digit={0} disabled={disabled || isFull} onPress={onDigit} />

          <motion.button
            onClick={() => canSubmit && !isSubmitting && onSubmit?.()}
            disabled={!canSubmit || isSubmitting || disabled}
            className={`number-pad-key flex h-12 flex-1 items-center justify-center rounded-xl font-ui text-sm font-black tracking-wider ${
              canSubmit && !isSubmitting ? 'number-pad-key--action' : ''
            }`}
            style={{
              opacity: !canSubmit || isSubmitting || disabled ? 0.45 : 1,
            }}
            whileTap={canSubmit && !isSubmitting ? { scale: 0.92 } : {}}
            type="button"
            aria-label="Submit guess"
          >
            {isSubmitting ? (
              <motion.div
                className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

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
      className="number-pad-key relative flex h-12 flex-1 items-center justify-center rounded-xl font-ui text-lg font-bold select-none"
      style={{
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      whileTap={!disabled ? { scale: 0.84, transition: { duration: 0.07 } } : {}}
      type="button"
    >
      {digit}
    </motion.button>
  );
}
