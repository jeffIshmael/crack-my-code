'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application crash:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 animate-pulse bg-red-500/20 blur-3xl" />
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-red-500/20 bg-red-500/10 text-6xl shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          ⚠️
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="font-orbitron text-2xl font-black tracking-[0.2em] text-red-500 uppercase mb-4"
      >
        System Error
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-[10px] font-bold text-[var(--text-2)] uppercase tracking-widest max-w-xs mb-10"
      >
        The logical engine has encountered an unrecoverable state. Critical data may be compromised.
      </motion.p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => reset()}
          className="rounded-2xl bg-red-500 py-4 font-orbitron text-xs font-black tracking-widest text-[#030C15] shadow-[0_8px_20px_rgba(239,68,68,0.3)] transition-transform active:scale-95"
        >
          RESET ENGINE
        </button>
        <Link
          href="/"
          className="rounded-2xl border border-white/10 bg-white/5 py-4 font-orbitron text-xs font-black tracking-widest text-[var(--text)] transition-all hover:bg-white/10"
        >
          ABORT TO LOBBY
        </Link>
      </div>
    </div>
  );
}
