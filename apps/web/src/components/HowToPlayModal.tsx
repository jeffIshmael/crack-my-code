'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { SCORE_COPY } from '@/lib/scoring';

export const HOW_TO_PLAY_DISMISSED_KEY = 'cmc_how_to_play_dismissed';

export function isHowToPlayDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(HOW_TO_PLAY_DISMISSED_KEY) === '1';
}

export function dismissHowToPlay(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HOW_TO_PLAY_DISMISSED_KEY, '1');
}

const SECTIONS = [
  {
    id: 'play',
    emoji: '🎯',
    title: 'How to play',
    body: (
      <div className="flex flex-col gap-3 text-left">
        <p className="font-body text-sm leading-relaxed text-[var(--wood-text-soft)]">
          Each player sets a secret <strong className="text-[var(--wood-text)]">4-digit code</strong>.
          Take turns guessing the opponent&apos;s code, first to crack it wins.
        </p>
        <p className="font-body text-sm leading-relaxed text-[var(--wood-text-soft)]">
          After every guess, colored tiles show how close you are:
        </p>
        <ul className="flex flex-col gap-2 font-body text-sm text-[var(--wood-text-soft)]">
          <li>
            <span className="font-bold text-[var(--clue-green)]">Green</span> — correct digit, correct spot
          </li>
          <li>
            <span className="font-bold text-[var(--clue-yellow)]">Yellow</span> — correct digit, wrong spot
          </li>
          <li>
            <span className="font-bold text-[var(--clue-gray)]">Gray</span> — digit not in the code
          </li>
        </ul>
        <p className="font-body text-sm leading-relaxed text-[var(--wood-text-soft)]">
          Play <strong className="text-[var(--wood-text)]">Cipher AI</strong> instantly, or challenge another player in a friendly match.
        </p>
      </div>
    ),
  },
  {
    id: 'cmc',
    emoji: '🏆',
    title: 'CMC & leaderboard',
    body: (
      <div className="flex flex-col gap-3 text-left">
        <p className="font-body text-sm leading-relaxed text-[var(--wood-text-soft)]">
          <strong className="text-[var(--wood-text)]">CMC points</strong> are your skill rating in Crack My Code.
          Stack points to climb the global leaderboard.
        </p>
        <p className="font-body text-sm leading-relaxed text-[var(--wood-text-soft)]">
          The more you win and the more you play, the higher you rank. Signed-in players track CMC on every match.
        </p>
        <div
          className="rounded-2xl border-2 border-[var(--wood-dark)] px-4 py-3"
          style={{ background: 'var(--bg-card)' }}
        >
          <p className="font-ui text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            Leaderboard rewards
          </p>
          <p className="mt-2 font-body text-sm leading-relaxed text-[var(--wood-text-soft)]">
            Top players on the leaderboard receive periodic rewards each month. Keep playing and climbing, {' '}
            <strong className="text-[var(--wood-text)]">the top three</strong> get a prize each month.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'earn',
    emoji: '⭐',
    title: 'Earn CMC points',
    body: (
      <div className="flex flex-col gap-3 text-left">
        <p className="font-body text-sm leading-relaxed text-[var(--wood-text-soft)]">
          Sign in to earn CMC on every match. Here&apos;s how points move:
        </p>
        <div className="overflow-hidden rounded-2xl border-2 border-[var(--wood-dark)]">
          <table className="w-full border-collapse font-body text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                <th className="px-3 py-2 text-left font-ui text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  Action
                </th>
                <th className="px-3 py-2 text-right font-ui text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  CMC
                </th>
              </tr>
            </thead>
            <tbody className="text-[var(--wood-text-soft)]">
              <tr className="border-t border-[var(--border-mid)]">
                <td className="px-3 py-2.5">Beat Cipher AI</td>
                <td className="px-3 py-2.5 text-right font-bold text-[var(--clue-green)]">
                  {SCORE_COPY.aiWin}
                </td>
              </tr>
              <tr className="border-t border-[var(--border-mid)]">
                <td className="px-3 py-2.5">Lose to Cipher AI</td>
                <td className="px-3 py-2.5 text-right font-bold text-[var(--text-dim)]">
                  {SCORE_COPY.aiLoss}
                </td>
              </tr>
              <tr className="border-t border-[var(--border-mid)]">
                <td className="px-3 py-2.5">Win vs another player</td>
                <td className="px-3 py-2.5 text-right font-bold text-[var(--clue-green)]">
                  {SCORE_COPY.pvpWin}
                </td>
              </tr>
              <tr className="border-t border-[var(--border-mid)]">
                <td className="px-3 py-2.5">Lose vs another player</td>
                <td className="px-3 py-2.5 text-right font-bold text-[var(--orange)]">
                  {SCORE_COPY.pvpLoss}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="font-body text-xs leading-relaxed text-[var(--text-dim)]">
          In player vs player matches, the 15 CMC lost by the loser is awarded to the winner.
        </p>
      </div>
    ),
  },
] as const;

interface HowToPlayModalProps {
  onClose: () => void;
}

export function HowToPlayModal({ onClose }: HowToPlayModalProps) {
  const [step, setStep] = useState(0);
  const section = SECTIONS[step];
  const isLast = step === SECTIONS.length - 1;

  const handleClose = () => {
    dismissHowToPlay();
    onClose();
  };

  const handleNext = () => {
    if (isLast) {
      handleClose();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-4 pointer-events-none">
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-md pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      />

      <motion.div
        className="how-to-play-modal relative z-10 flex w-full max-w-[400px] max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top,0px)-2rem))] flex-col overflow-hidden pointer-events-auto"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-4">
          <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${SECTIONS.length}`}>
            {SECTIONS.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-[var(--accent)]' : 'w-1.5 bg-[var(--border-mid)]'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-mid)] bg-[var(--bg-card)] text-[var(--text-dim)]"
            aria-label="Close guide"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={section.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-4xl" aria-hidden>
                  {section.emoji}
                </span>
                <h2 className="font-display text-xl font-bold text-[var(--wood-text)]">
                  {section.title}
                </h2>
                <p className="font-ui text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-dim)]">
                  {step + 1} of {SECTIONS.length}
                </p>
              </div>
              {section.body}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 gap-3 px-5 py-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="how-to-play-modal__btn how-to-play-modal__btn--secondary"
          >
            <ChevronLeft size={16} aria-hidden />
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="how-to-play-modal__btn how-to-play-modal__btn--primary"
          >
            {isLast ? 'Got it' : 'Next'}
            {!isLast && <ChevronRight size={16} aria-hidden />}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
