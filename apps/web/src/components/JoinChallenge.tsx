'use client';

import { useEffect, useState } from 'react';
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

const JOIN_INPUT_ID = 'join-challenge-input';

function setKeyboardOpen(open: boolean) {
  document.body.classList.toggle('keyboard-open', open);
}

/** Scroll the Game ID field so it sits just above the soft keyboard. */
function scrollJoinInputAboveKeyboard() {
  const el = document.getElementById(JOIN_INPUT_ID);
  const scrollRoot = document.querySelector('.app-page-scroll');
  if (!el || !(scrollRoot instanceof HTMLElement)) return;

  const place = () => {
    const vv = window.visualViewport;
    // Visible bottom edge (keyboard top when overlays-content; shrunk viewport otherwise).
    const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    const rect = el.getBoundingClientRect();
    const gap = 20;
    const delta = rect.bottom - (visibleBottom - gap);
    if (Math.abs(delta) > 6) {
      scrollRoot.scrollBy({ top: delta, behavior: 'smooth' });
    }
  };

  // Keyboard animation takes a few frames on MiniPay / Android.
  requestAnimationFrame(place);
  window.setTimeout(place, 80);
  window.setTimeout(place, 220);
  window.setTimeout(place, 450);
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
  const signInRequired = disabled && !!onSignInRequired;

  // Keep input pinned above the keyboard while focused (viewport may move as keypad opens).
  useEffect(() => {
    if (!focused) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const onViewportChange = () => {
      setKeyboardOpen(true);
      scrollJoinInputAboveKeyboard();
    };

    vv.addEventListener('resize', onViewportChange);
    vv.addEventListener('scroll', onViewportChange);
    return () => {
      vv.removeEventListener('resize', onViewportChange);
      vv.removeEventListener('scroll', onViewportChange);
    };
  }, [focused]);

  useEffect(() => {
    return () => setKeyboardOpen(false);
  }, []);

  const handleToggle = () => {
    if (signInRequired) {
      onSignInRequired?.();
      return;
    }
    if (disabled) return;
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        // Expand then focus so the keypad opens and we can scroll the field into place.
        window.setTimeout(() => {
          document.getElementById(JOIN_INPUT_ID)?.focus();
        }, 240);
      }
      return next;
    });
  };

  const inputBlock = (
    <div
      id="join-challenge-field"
      className={`theme-join-input flex items-center gap-2 rounded-xl border-2 px-3 py-2 transition-colors ${
        signInRequired
          ? 'border-[var(--border-mid)] opacity-60'
          : focused
            ? 'border-[var(--accent)]'
            : 'border-[var(--border-mid)]'
      }`}
    >
      <input
        id={JOIN_INPUT_ID}
        type="text"
        inputMode="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (signInRequired) {
            onSignInRequired?.();
            return;
          }
          setFocused(true);
          setKeyboardOpen(true);
          scrollJoinInputAboveKeyboard();
        }}
        onBlur={() => {
          setFocused(false);
          // Delay so tapping the join arrow still works before class clears.
          window.setTimeout(() => {
            if (document.activeElement?.id !== JOIN_INPUT_ID) {
              setKeyboardOpen(false);
            }
          }, 180);
        }}
        onKeyDown={(e) => e.key === 'Enter' && !signInRequired && !isJoining && value.trim() && onJoin()}
        placeholder={signInRequired ? 'Sign in to join' : 'e.g. K7M3NP2X'}
        disabled={signInRequired || isJoining}
        readOnly={signInRequired}
        className="min-w-0 flex-1 bg-transparent font-ui text-sm font-bold uppercase tracking-widest text-[var(--text)] placeholder:normal-case placeholder:font-body placeholder:font-semibold placeholder:tracking-normal placeholder:text-[var(--text-dim)] focus:outline-none disabled:cursor-not-allowed"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        autoComplete="off"
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
          className={`theme-game-btn theme-game-btn--join group w-full ${
            disabled ? (signInRequired ? 'theme-game-btn--signin-required' : 'opacity-50 cursor-not-allowed') : 'theme-game-btn--lively'
          }`}
          aria-expanded={signInRequired ? false : open}
          aria-disabled={signInRequired}
        >
          <div className="theme-game-btn__inner">
            <span className="theme-game-btn__emoji-badge" aria-hidden>🔗</span>
            <div className="theme-game-btn__content flex-1">
              <span className="theme-game-btn__title">Join Challenge</span>
              <span className="theme-game-btn__subtitle">
                {signInRequired ? '🔒 Sign in first' : disabled ? '⏳ Finish or cancel current game first' : "Paste a friend's Game ID"}
              </span>
            </div>
            <ChevronDown
              size={18}
              className={`flex-shrink-0 transition-transform duration-200 ${
                signInRequired ? 'theme-game-btn__chevron--muted' : 'text-white/90'
              } ${open && !signInRequired ? 'rotate-180' : ''}`}
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
