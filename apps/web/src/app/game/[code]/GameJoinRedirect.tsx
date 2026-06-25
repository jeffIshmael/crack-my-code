'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeJoinCodeInput } from '@/lib/join-code';

export function GameJoinRedirect({ code }: { code: string }) {
  const router = useRouter();
  const normalized = normalizeJoinCodeInput(code);

  useEffect(() => {
    router.replace(`/?game=${encodeURIComponent(normalized)}`);
  }, [normalized, router]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      <p className="font-ui text-sm font-bold text-[var(--text)]">Loading challenge…</p>
      <p className="font-body text-xs text-[var(--text-dim)]">Game ID: {normalized}</p>
    </div>
  );
}
