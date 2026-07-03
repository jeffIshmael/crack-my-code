'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';

interface JoinChallengeProps {
  value: string;
  onChange: (value: string) => void;
  onJoin: () => void;
  isJoining: boolean;
  disabled?: boolean;
  collapsible?: boolean;
  onSignInRequired?: () => void;
}

export default function JoinChallenge({
  value,
  onChange,
  onJoin,
  isJoining,
  disabled = false,
  collapsible = false,
  onSignInRequired,
}: JoinChallengeProps) {
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const signInRequired = disabled;

  const handleToggle = () => {
    if (signInRequired) {
      onSignInRequired?.();
      return;
    }
    setOpen((prev) => !prev);
  };

  const inputBlock = (
    <div
      className={`theme-join-input flex items-center gap-2 rounded-xl border-2 px-3 py-2 transition-colors ${
        signInRequired
          ? 'border-[var(--border-mid)] opacity-60'
          : focused
            ? 'border-[var(--accent)]'
            : 'border-[var(--border-mid)]'
      }`}
    >
      <input
        id="join-challenge-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (signInRequired) {
            onSignInRequired?.();
            return;
          }
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => e.key === 'Enter' && !signInRequired && !isJoining && value.trim() && onJoin()}
        placeholder={signInRequired ? 'Sign in to join' : 'e.g. K7M3NP2X'}
        disabled={signInRequired || isJoining}
        readOnly={signInRequired}
        className="min-w-0 flex-1 bg-transparent font-ui text-sm font-bold uppercase tracking-widest text-[var(--text)] placeholder:normal-case placeholder:font-body placeholder:font-semibold placeholder:tracking-normal placeholder:text-[var(--text-dim)] focus:outline-none disabled:cursor-not-allowed"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={() => {
          if (signInRequired) {
            onSignInRequired?.();
            return;
          }
          onJoin();
        }}
        disabled={!signInRequired && (isJoining || !value.trim())}
        aria-disabled={signInRequired}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white transition-transform active:scale-95 disabled:opacity-40"
      >
        {isJoining ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <ArrowRight size={18} />
        )}
      </button>
    </div>
  );

  if (collapsible) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleToggle}
          className={`theme-game-btn theme-game-btn--join theme-game-btn--lively group w-full ${signInRequired ? 'opacity-60' : ''}`}
          aria-expanded={signInRequired ? false : open}
          aria-disabled={signInRequired}
        >
          <div className="theme-game-btn__inner">
            <span className="theme-game-btn__emoji-badge" aria-hidden>🔗</span>
            <div className="theme-game-btn__content flex-1">
              <span className="theme-game-btn__title">Join Challenge</span>
              <span className="theme-game-btn__subtitle">
                {signInRequired ? '🔒 Sign in first' : "Paste a friend's Game ID"}
              </span>
            </div>
            <ChevronDown
              size={18}
              className={`flex-shrink-0 text-white/90 transition-transform duration-200 ${
                open && !signInRequired ? 'rotate-180' : ''
              }`}
              aria-hidden
            />
          </div>
        </button>

        <AnimatePresence initial={false}>
          {open && !signInRequired && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2 pb-1">
                <p className="font-body text-xs text-[var(--text-dim)] px-1">
                  Enter the Game ID from an invite-only match.
                </p>
                {inputBlock}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <motion.div
      id="join-challenge-section"
      className={`theme-card flex flex-col gap-3 p-4 ${signInRequired ? 'opacity-60' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>🔗</span>
        <h3 className="font-ui text-sm font-bold text-[var(--text)]">Join Challenge</h3>
      </div>
      <p className="font-body text-xs leading-relaxed text-[var(--text-dim)]">
        {signInRequired
          ? 'Sign in to paste a Game ID and join an invite-only match.'
          : 'Paste the Game ID your friend shared after creating an invite-only match.'}
      </p>
      {inputBlock}
    </motion.div>
  );
}
