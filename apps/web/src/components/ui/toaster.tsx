'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast flex items-center gap-3 rounded-2xl border border-white/10 bg-[#03111C]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300',
          description: 'text-[10px] font-medium text-[var(--text-2)]/70 uppercase tracking-widest',
          title: 'font-orbitron text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text)]',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
          error: 'border-red-500/30 bg-red-500/5 text-red-500',
          success: 'border-[var(--clue-green)]/30 bg-[var(--clue-green)]/5 text-[var(--clue-green)]',
          warning: 'border-[var(--clue-yellow)]/30 bg-[var(--clue-yellow)]/5 text-[var(--clue-yellow)]',
          info: 'border-[var(--accent)]/30 bg-[var(--accent)]/5 text-[var(--accent)]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
