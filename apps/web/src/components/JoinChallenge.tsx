'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, ArrowRight } from 'lucide-react';

interface JoinChallengeProps {
  value: string;
  onChange: (value: string) => void;
  onJoin: () => void;
  isJoining: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export default function JoinChallenge({
  value,
  onChange,
  onJoin,
  isJoining,
  disabled,
  compact,
}: JoinChallengeProps) {
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      className={`flex flex-col gap-3 rounded-2xl border-2 border-black/10 bg-[var(--bg-elevated)] ${compact ? 'p-4' : 'p-5'} shadow-sm`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2">
        <LogIn size={14} className="text-[var(--accent)]" />
        <h3 className="font-orbitron text-[10px] font-black tracking-[0.2em] text-black/50 uppercase">
          Join Challenge
        </h3>
      </div>
      <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest leading-relaxed">
        Paste the Game ID your friend shared after creating an invite-only match.
      </p>
      <div
        className={`flex items-center gap-2 rounded-xl border-2 bg-black/5 px-3 py-2 transition-colors ${
          focused ? 'border-[var(--accent)]/40' : 'border-black/10'
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
          className="min-w-0 flex-1 bg-transparent font-code text-sm font-bold uppercase tracking-widest text-black/80 placeholder:text-black/25 focus:outline-none disabled:opacity-50"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={onJoin}
          disabled={disabled || isJoining || !value.trim()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--bg-base)] transition-transform active:scale-95 disabled:opacity-40"
        >
          {isJoining ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <ArrowRight size={18} />
          )}
        </button>
      </div>
    </motion.div>
  );
}
