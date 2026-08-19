'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

type SetNameModalProps = {
  open: boolean;
  address: string;
  initialName?: string | null;
  onClose: () => void;
  onSaved: (name: string) => void;
};

const normalizeName = (raw: string) => raw.trim().replace(/\s+/g, ' ');

const isValidName = (name: string) => {
  if (name.length < 3 || name.length > 20) return false;
  return /^[a-zA-Z0-9 _-]+$/.test(name);
};

export function SetNameModal({ open, address, initialName, onClose, onSaved }: SetNameModalProps) {
  const [name, setName] = useState(initialName ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName ?? '');
    }
  }, [open, initialName]);

  if (!open) return null;

  const cleaned = normalizeName(name);
  const valid = isValidName(cleaned);

  const handleSubmit = async () => {
    if (!valid) {
      toast.error('Please choose a valid name (3-20 chars).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/users/set-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, name: cleaned }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'Failed to set name');
        return;
      }

      onSaved(data.name);
    } catch (e) {
      console.error(e);
      toast.error('Failed to set name');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
        role="presentation"
      />

      <div
        className="relative z-10 theme-card flex w-full max-w-[420px] flex-col gap-5 p-5"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-orbitron text-lg font-black tracking-widest uppercase text-[var(--text)]">
              Set your name
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-dim)]">
              This will show on the leaderboard and in PvP screens.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-mid)] bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-[var(--text)]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. CrackMaster"
            className="w-full rounded-2xl border border-[var(--border-mid)] bg-[var(--bg-card)] px-4 py-3 font-body text-sm text-[var(--text)] outline-none focus:border-[var(--border-bright)]"
            autoFocus
          />
          {!valid && cleaned.length > 0 && (
            <p className="text-xs text-[var(--orange)]">3-20 chars: letters/numbers/spaces/underscore/dash.</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-[var(--border-mid)] bg-[var(--bg-card)] px-4 py-3 text-sm font-bold text-[var(--text-dim)] hover:text-[var(--text)]"
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!valid || submitting}
            className="flex-1 rounded-2xl bg-[#0088cc] px-4 py-3 text-sm font-bold text-white shadow-sm hover:scale-105 disabled:opacity-60 disabled:shadow-none"
          >
            {submitting ? 'Saving...' : 'Save name'}
          </button>
        </div>
      </div>
    </div>
  );
}
