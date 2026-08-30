'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ChevronRight, Copy, Check, Send, Pencil } from 'lucide-react';
// import { ArrowUpFromLine } from 'lucide-react'; // M-Pesa withdraw — enable when payout is ready
import type { NavTab } from '@/components/BottomNav';
import { UsdtWalletModals, type WalletModalKind } from '@/components/UsdtWalletModals';
import { useMiniAppEnvironment } from '@/hooks/use-mini-app-environment';
import { SetNameModal } from '@/components/SetNameModal';

interface SettingsPanelProps {
  address?: string;
  points: number;
  pointsLoading?: boolean;
  usdtFormatted?: string;
  profileName?: string | null;
  copied: boolean;
  onLogin: () => void;
  onCopyAddress: () => void;
  onNameSaved?: (name: string) => void;
  onTabChange: (tab: NavTab) => void;
  onWithdrawMpesa?: (phone: string, amount: number) => void | Promise<void>;
  onSendUsdt?: (recipient: string, amount: number) => Promise<string | void>;
}

const menuItems: {
  tab: NavTab;
  emoji: string;
  label: string;
  subtitle: string;
  accent: string;
}[] = [
    {
      tab: 'stats',
      emoji: '📊',
      label: 'Stats',
      subtitle: 'Your games and platform totals',
      accent: 'bg-[#F3EEFF] text-[#9B7FD4]',
    },
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
  pointsLoading = false,
  usdtFormatted,
  profileName,
  copied,
  onLogin,
  onCopyAddress,
  onNameSaved,
  onTabChange,
  onWithdrawMpesa: _onWithdrawMpesa,
  onSendUsdt,
}: SettingsPanelProps) {
  const [walletModal, setWalletModal] = useState<WalletModalKind>(null);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const { isMiniPay } = useMiniAppEnvironment();
  const usdtBalance = usdtFormatted ? parseFloat(usdtFormatted) : 0;
  if (!address) {
    return (
      <div className="theme-sky-readout flex flex-col items-center gap-5 p-8 text-center">
        <span className="text-5xl" aria-hidden>🔑</span>
        <div className="flex flex-col gap-2">
          <p className="font-body text-sm text-[var(--text-dim)] max-w-[240px]">
            Sign in to view balances, copy your address, and manage your account.
          </p>
        </div>
        <button
          onClick={onLogin}
          className="theme-auth-cta"
          type="button"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <UsdtWalletModals
        open={walletModal}
        onClose={() => setWalletModal(null)}
        availableBalance={usdtBalance}
        onSendUsdt={onSendUsdt}
      // onWithdrawMpesa={onWithdrawMpesa} // M-Pesa — enable when payout is ready
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="theme-sky-readout flex flex-row gap-2 p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Image src="/usdt-logo.webp" alt="" width={20} height={20} aria-hidden />
              <span className="font-body text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                USDT
              </span>
            </div>
            <span className="font-ui text-2xl font-bold text-[var(--text)]">
              {usdtFormatted ? usdtBalance.toFixed(2) : '0.00'}
            </span>
          </div>
          <div className="flex flex-shrink-0 flex-col gap-1.5">
            {/* M-Pesa withdraw — enable when payout integration is ready
            <button
              type="button"
              onClick={() => setWalletModal('mpesa')}
              className="account-usdt-action"
              aria-label="Withdraw to M-Pesa"
              title="Withdraw"
            >
              <ArrowUpFromLine size={16} strokeWidth={2.25} />
            </button>
            */}

            <button
              type="button"
              onClick={() => setWalletModal('send')}
              className="account-usdt-action"
              aria-label="Send USDT on Celo"
              title="Send"
            >
              <Send size={16} strokeWidth={2.25} />
            </button>

          </div>
        </div>
        <div className="theme-sky-readout flex flex-col gap-2 p-4">
          <div className="flex items-center gap-2">
            <span className="theme-playful-coin font-ui" aria-hidden>CMC</span>
            <span className="font-body text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">Points</span>
          </div>
          <span className="font-ui text-2xl font-bold text-[var(--text)]">
            {pointsLoading ? '---' : points.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="theme-sky-readout flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>👤</span>
            <span className="font-ui text-sm font-bold text-[var(--text)]">Account</span>
        </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="font-body text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">Username</span>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 rounded-xl border-2 border-[var(--border-mid)] bg-[var(--bg-elevated)] px-3 py-2.5 font-ui text-xs font-bold text-[var(--text-2)]">
                  {profileName ?? '—'}
                </div>
                <button
                  type="button"
                  onClick={() => setNameModalOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--border-mid)] bg-[var(--bg-elevated)] text-[var(--accent)] transition-transform active:scale-95"
                  aria-label="Edit username"
                  title="Edit username"
                >
                  <Pencil size={16} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-body text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">Wallet address</span>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 rounded-xl border-2 border-[var(--border-mid)] bg-[var(--bg-elevated)] px-3 py-2.5 font-ui text-xs font-bold text-[var(--text-2)] truncate">
                  {address}
                </div>
                <button
                  type="button"
                  onClick={onCopyAddress}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border-mid)] bg-[var(--bg-elevated)] text-[var(--accent)] transition-transform active:scale-95"
                  aria-label="Copy address"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
      </div>

        {nameModalOpen && (
          <SetNameModal
            open={nameModalOpen}
            address={String(address)}
            initialName={profileName}
            onClose={() => setNameModalOpen(false)}
            onSaved={(name) => {
              onNameSaved?.(name);
              setNameModalOpen(false);
            }}
          />
        )}

      <div className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <motion.button
            key={item.tab}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => onTabChange(item.tab)}
            className="theme-sky-readout flex w-full items-center justify-between p-4 text-left transition-colors hover:brightness-[0.99]"
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

        <motion.a
          href="https://x.com/crack_my_code"
          target="_blank"
          rel="noopener noreferrer"
          whileTap={{ scale: 0.98 }}
          className="theme-sky-readout flex w-full items-center justify-between p-4 text-left transition-colors hover:brightness-[0.99]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#15202B] text-lg text-white">
              𝕏
            </span>
            <div className="min-w-0">
              <span className="block font-ui text-sm font-bold text-[var(--text)]">Follow us on X</span>
              <span className="block font-body text-xs text-[var(--text-dim)]">@crack_my_code</span>
            </div>
          </div>
          <ChevronRight size={18} className="flex-shrink-0 text-[var(--text-dim)]" />
        </motion.a>
      </div>
    </div>
  );
}
