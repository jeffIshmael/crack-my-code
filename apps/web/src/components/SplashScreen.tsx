'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SplashBrand, getSplashRevealMs, type SplashAnimPhase } from '@/components/SplashBrand';

const LOADING_STEPS = [
  'Loading the arena…',
  'Warming up Cipher…',
  'Almost ready…',
];

const PHASE_LABEL: Record<SplashAnimPhase, string> = {
  intro: 'Get ready…',
  typing: 'Typing the code…',
  checking: 'Checking your guess…',
  revealed: 'Nice — 0 and 3 locked in!',
  loading: 'Loading the arena…',
};

interface SplashScreenProps {
  onComplete: () => void;
  /** Minimum time the splash stays visible (ms) */
  minDurationMs?: number;
}

export function SplashScreen({ onComplete, minDurationMs = 12500 }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [animPhase, setAnimPhase] = useState<SplashAnimPhase>('intro');
  const [loadStep, setLoadStep] = useState(0);
  const startedRef = useRef(Date.now());
  const revealAtRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const handleReveal = useCallback(() => {
    revealAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    startedRef.current = Date.now();
    let frame = 0;

    const finish = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      setProgress(100);
      onComplete();
    };

    const tick = () => {
      const now = Date.now();
      const elapsed = now - startedRef.current;

      if (revealAtRef.current) {
        const sinceReveal = now - revealAtRef.current;
        const loadWindow = Math.max(3200, minDurationMs - getSplashRevealMs());
        const loadPct = Math.min(100, (sinceReveal / loadWindow) * 100);
        setProgress(loadPct);
        setLoadStep(Math.min(LOADING_STEPS.length - 1, Math.floor((loadPct / 100) * LOADING_STEPS.length)));
      } else {
        setProgress(0);
      }

      if (elapsed >= minDurationMs && revealAtRef.current) {
        finish();
      } else {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [minDurationMs, onComplete]);

  const label =
    animPhase === 'loading'
      ? LOADING_STEPS[loadStep]
      : PHASE_LABEL[animPhase];

  return (
    <motion.div
      className="game-splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.01 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <SplashBrand onPhaseChange={setAnimPhase} onReveal={handleReveal} />

      <div className="game-splash__loader">
        <div className="game-splash__loader-track">
          <motion.div
            className="game-splash__loader-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="game-splash__loader-label">{label}</p>
      </div>

      <p className="game-splash__footer">Built on Celo</p>
    </motion.div>
  );
}
