'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-12"
      >
        <div className="font-orbitron text-[120px] font-black leading-none text-[var(--accent)]/10">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="text-6xl"
          >
            🛰️
          </motion.div>
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="font-orbitron text-xl font-black tracking-[0.2em] text-[var(--accent)] uppercase mb-4"
      >
        Grid Link Lost
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-[10px] font-bold text-[var(--text-2)] uppercase tracking-widest max-w-xs mb-10"
      >
        The coordinates you requested do not exist in the mainframe. You are drifting into empty space.
      </motion.p>

      <Link
        href="/"
        className="rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[#0099CC] px-12 py-4 font-orbitron text-xs font-black tracking-widest text-[#030C15] shadow-[0_8px_25px_rgba(0,207,255,0.3)] transition-transform active:scale-95"
      >
        RETURN TO GRID
      </Link>
    </div>
  );
}
