'use client';

import { motion } from 'framer-motion';

export function ThemeLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`theme-logo theme-logo--playful ${className}`} aria-label="Crack My Code">
      <div className="theme-logo__sparkles" aria-hidden>
        <span className="theme-logo__spark theme-logo__spark--1">✦</span>
        <span className="theme-logo__spark theme-logo__spark--2">✦</span>
        <span className="theme-logo__spark theme-logo__spark--3">✦</span>
      </div>
      <motion.h1
        className="font-display theme-playful-title"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="theme-playful-title__accent">CRACK</span>
        <span className="theme-playful-title__rest"> MY CODE</span>
      </motion.h1>
    </div>
  );
}
