'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface QuitConfirmModalProps {
  open: boolean;
  isQuitting?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function QuitConfirmModal({
  open,
  isQuitting = false,
  onConfirm,
  onCancel,
}: QuitConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/45 backdrop-blur-md"
            onClick={() => !isQuitting && onCancel()}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative z-10 w-full max-w-[420px] rounded-3xl border-2 border-[var(--border-mid)] bg-[var(--bg-surface)] p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-orbitron text-lg font-black tracking-widest uppercase text-[var(--text)]">
                  Quit this match?
                </h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-[var(--text-dim)]">
                  If you quit during the match, your opponent wins and you lose the game.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isQuitting && onCancel()}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-mid)] bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={isQuitting}
                className="result-modal__btn result-modal__btn--secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onConfirm()}
                disabled={isQuitting}
                className="result-modal__btn result-modal__btn--danger"
              >
                {isQuitting ? 'Quitting…' : 'Quit'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

