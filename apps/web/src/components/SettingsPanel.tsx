'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ChevronRight, Copy, Check } from 'lucide-react';
import type { NavTab } from '@/components/BottomNav';

interface SettingsPanelProps {
  address?: string;
  points: number;
  usdtFormatted?: string;
  copied: boolean;
  onLogin: () => void;
  onCopyAddress: () => void;
  onTabChange: (tab: NavTab) => void;
}

const menuItems: {
  tab: NavTab;
  emoji: string;
  label: string;
  subtitle: string;
  accent: string;
}[] = [
  {
    tab: 'terms',
    emoji: '📜',
    label: 'Terms of Service',
    subtitle: 'Rules for playing fair',
    accent: 'bg-[#E8F4FC] text-[var(--accent)]',
  },
  {
    tab: 'privacy',
    emoji: '🔒',
    label: 'Privacy Policy',
    subtitle: 'How we handle your data',
    accent: 'bg-[#FFF4E8] text-[#FF9F43]',
  },
  {
    tab: 'contact',
    emoji: '💬',
    label: 'Telegram Support',
    subtitle: 'Get help from the team',
    accent: 'bg-[#E8FCF4] text-[#58C76E]',
  },
];

export function SettingsPanel({
  address,
  points,
  usdtFormatted,
  copied,
  onLogin,
  onCopyAddress,
  onTabChange,
}: SettingsPanelProps) {
  if (!address) {
    return (
      <div className="theme-card flex flex-col items-center gap-5 p-8 text-center">
        <span className="text-5xl" aria-hidden>👛</span>
        <div className="flex flex-col gap-2">
          <h2 className="font-ui text-xl font-bold text-[var(--text)]">Connect Wallet</h2>
          <p className="font-body text-sm text-[var(--text-dim)] max-w-[240px]">
            Sign in to view balances, copy your address, and manage your account.
          </p>
        </div>
        <button
          onClick={onLogin}
          className="theme-game-btn theme-game-btn--pvp w-full max-w-[240px]"
          type="button"
        >
          <div className="theme-game-btn__inner justify-center">
            <span className="theme-game-btn__emoji" aria-hidden>🔑</span>
            <div className="theme-game-btn__content items-center">
              <span className="theme-game-btn__title">Sign In</span>
            </div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* <ThemePlayfulHeader points={points} usdtFormatted={usdtFormatted} /> */}

      <div className="grid grid-cols-2 gap-3">
        <div className="theme-card flex flex-col gap-2 p-4">
          <div className="flex items-center gap-2">
            <Image src="/usdt-logo.png" alt="" width={20} height={20} aria-hidden />
            <span className="font-body text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">USDT</span>
          </div>
          <span className="font-ui text-2xl font-bold text-[var(--text)]">
            {usdtFormatted ? parseFloat(usdtFormatted).toFixed(2) : '0.00'}
          </span>
        </div>
        <div className="theme-card flex flex-col gap-2 p-4">
          <div className="flex items-center gap-2">
            <span className="theme-playful-coin font-ui" aria-hidden>CMC</span>
            <span className="font-body text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">Points</span>
          </div>
          <span className="font-ui text-2xl font-bold text-[var(--text)]">{points.toLocaleString()}</span>
        </div>
      </div>

      <div className="theme-card flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>👤</span>
          <span className="font-ui text-sm font-bold text-[var(--text)]">Wallet Address</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 rounded-xl border-2 border-[var(--border-mid)] bg-white px-3 py-2.5 font-ui text-xs font-bold text-[var(--text-2)] truncate">
            {address}
          </div>
          <button
            type="button"
            onClick={onCopyAddress}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border-mid)] bg-white text-[var(--accent)] transition-transform active:scale-95"
            aria-label="Copy address"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <motion.button
            key={item.tab}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => onTabChange(item.tab)}
            className="theme-card flex w-full items-center justify-between p-4 text-left transition-colors hover:brightness-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg ${item.accent}`}>
                {item.emoji}
              </span>
              <div className="min-w-0">
                <span className="block font-ui text-sm font-bold text-[var(--text)]">{item.label}</span>
                <span className="block font-body text-xs text-[var(--text-dim)]">{item.subtitle}</span>
              </div>
            </div>
            <ChevronRight size={18} className="flex-shrink-0 text-[var(--text-dim)]" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
