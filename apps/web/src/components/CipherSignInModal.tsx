'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface CipherSignInModalProps {
  onSignIn: () => void;
  onContinueGuest: () => void;
  onClose: () => void;
}

export function CipherSignInModal({
  onSignIn,
  onContinueGuest,
  onClose,
}: CipherSignInModalProps) {
  return (
    <div className="fixed inset-x-0 inset-y-0 z-[130] flex items-end justify-center pointer-events-none">
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-md pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-t-[2rem] bg-[var(--bg-surface)] border border-[var(--border-mid)] border-b-0 pb-8 pointer-events-auto"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 38 }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-mid)] bg-[var(--bg-card)] text-[var(--text-dim)]"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center gap-4 px-6 pt-8 text-center">
          <span className="text-4xl" aria-hidden>💰</span>
          <h2 className="font-ui text-xl font-bold text-[var(--text)]">Sign in to earn USDT</h2>
          <p className="font-body text-sm text-[var(--text-dim)] max-w-[300px]">
            You&apos;re missing a chance to earn <strong>0.1 USDT</strong> every time you beat Cipher AI.
            Sign in with your smart wallet to claim rewards.
          </p>

          <button
            type="button"
            onClick={onSignIn}
            className="theme-auth-cta"
          >
            Sign in &amp; earn
          </button>

          <button
            type="button"
            onClick={onContinueGuest}
            className="font-ui text-xs font-bold uppercase tracking-widest text-[var(--text-dim)] hover:text-[var(--text)]"
          >
            Continue without rewards
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export const CIPHER_SIGNIN_MODAL_DISMISSED_KEY = 'cmc_cipher_signin_modal_dismissed';

export function isCipherSignInModalDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(CIPHER_SIGNIN_MODAL_DISMISSED_KEY) === '1';
}

export function dismissCipherSignInModal(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CIPHER_SIGNIN_MODAL_DISMISSED_KEY, '1');
}
