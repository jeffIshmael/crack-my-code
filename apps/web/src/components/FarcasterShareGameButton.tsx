'use client';

import { useFarcasterMiniApp } from '@/hooks/use-farcaster-miniapp';

export function FarcasterShareGameButton({
  joinCode,
  className,
}: {
  joinCode: string;
  className?: string;
}) {
  const { isFarcaster, isSharing, shareGameInvite } = useFarcasterMiniApp();

  if (!isFarcaster || !joinCode) return null;

  return (
    <button
      type="button"
      onClick={() => void shareGameInvite(joinCode)}
      disabled={isSharing}
      className={
        className ??
        'w-full rounded-2xl border border-[#8A63D2]/30 bg-[#8A63D2]/10 py-4 text-[10px] font-black uppercase tracking-widest text-[#6B4BB8] transition-all hover:bg-[#8A63D2]/15 disabled:opacity-50'
      }
    >
      {isSharing ? 'Opening composer…' : 'Share to Farcaster'}
    </button>
  );
}
