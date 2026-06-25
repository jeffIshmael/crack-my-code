'use client';

import { useFarcasterMiniApp } from '@/hooks/use-farcaster-miniapp';

type Variant = 'card' | 'compact';

export function FarcasterAddMiniAppButton({ variant = 'card' }: { variant?: Variant }) {
  const { isFarcaster, isAdded, isAdding, promptAddMiniApp } = useFarcasterMiniApp();

  if (!isFarcaster || isAdded) return null;

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => void promptAddMiniApp()}
        disabled={isAdding}
        className="w-full rounded-2xl border border-[#8A63D2]/30 bg-[#8A63D2]/10 py-3 text-[10px] font-black uppercase tracking-widest text-[#6B4BB8] transition-all hover:bg-[#8A63D2]/15 disabled:opacity-50"
      >
        {isAdding ? 'Adding…' : 'Add to Farcaster'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void promptAddMiniApp()}
      disabled={isAdding}
      className="theme-card flex w-full items-center justify-between p-4 text-left transition-colors hover:brightness-[0.99] disabled:opacity-50"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#EDE7FF] text-lg">
          🟣
        </span>
        <div className="min-w-0">
          <span className="block font-ui text-sm font-bold text-[var(--text)]">Add to Farcaster</span>
          <span className="block font-body text-xs text-[var(--text-dim)]">
            Save Crack My Code to your apps list
          </span>
        </div>
      </div>
      <span className="font-ui text-[10px] font-bold uppercase tracking-widest text-[#6B4BB8]">
        {isAdding ? '…' : 'Add'}
      </span>
    </button>
  );
}
