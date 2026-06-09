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
}

export default function JoinChallenge({
  value,
  onChange,
  onJoin,
  isJoining,
  disabled,
  collapsible = false,
}: JoinChallengeProps) {
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);

  const inputBlock = (
    <div
      className={`flex items-center gap-2 rounded-xl border-2 bg-white px-3 py-2 transition-colors ${
        focused ? 'border-[var(--accent)]' : 'border-[var(--border-mid)]'
      }`}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && !isJoining && value.trim() && onJoin()}
        placeholder="e.g. K7M3NP2X"
        disabled={disabled || isJoining}
        className="min-w-0 flex-1 bg-transparent font-ui text-sm font-bold uppercase tracking-widest text-[var(--text)] placeholder:text-[var(--text-dim)]/50 focus:outline-none disabled:opacity-50"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={onJoin}
        disabled={disabled || isJoining || !value.trim()}
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
          onClick={() => setOpen((prev) => !prev)}
          className="theme-game-btn theme-game-btn--ai group w-full"
          aria-expanded={open}
        >
          <div className="theme-game-btn__inner">
            <span className="theme-game-btn__emoji" aria-hidden>🔗</span>
            <div className="theme-game-btn__content flex-1">
              <span className="theme-game-btn__title">Join Challenge</span>
              <span className="theme-game-btn__subtitle">Paste a friend&apos;s Game ID</span>
            </div>
            <ChevronDown
              size={20}
              className={`flex-shrink-0 text-[var(--text-dim)] transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
              aria-hidden
            />
          </div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
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
      className="theme-card flex flex-col gap-3 p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>🔗</span>
        <h3 className="font-ui text-sm font-bold text-[var(--text)]">Join Challenge</h3>
      </div>
      <p className="font-body text-xs leading-relaxed text-[var(--text-dim)]">
        Paste the Game ID your friend shared after creating an invite-only match.
      </p>
      {inputBlock}
    </motion.div>
  );
}
