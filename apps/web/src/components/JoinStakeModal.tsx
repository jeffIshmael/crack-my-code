'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useBalance, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits } from 'viem';
import { CONTRACT_ADDRESS, USDT_ADDRESS, ERC20_ABI } from '../../blockchain/constants';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { useMiniAppEnvironment } from '@/hooks/use-mini-app-environment';

const MINIPAY_ADD_USDT_URL = 'https://link.minipay.xyz/add_cash?tokens=USDT';

interface JoinStakeModalProps {
  open: boolean;
  stake: number;
  opponentLabel?: string;
  isJoining: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

type JoinPhase = 'idle' | 'approving' | 'joining';

export default function JoinStakeModal({
  open,
  stake,
  opponentLabel,
  isJoining,
  onConfirm,
  onCancel,
}: JoinStakeModalProps) {
  const { address } = useAccount();
  const { isMiniPay } = useMiniAppEnvironment();
  const publicClient = usePublicClient();
  const { data: usdtData } = useBalance({
    address,
    token: USDT_ADDRESS as `0x${string}`,
    query: { enabled: !!address && open },
  });

  const stakeBigInt = useMemo(() => {
    try {
      return parseUnits(stake.toString(), 6);
    } catch {
      return 0n;
    }
  }, [stake]);

  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESS] : undefined,
    query: { enabled: !!address && open },
  });

  const allowance = (allowanceData as bigint) ?? 0n;
  const balance = parseFloat(usdtData?.formatted || '0');
  const canAfford = balance >= stake;

  const { writeContractAsync: approve, isPending: isApprovingAction } = useWriteContract();
  const [phase, setPhase] = useState<JoinPhase>('idle');
  const busy = phase !== 'idle' || isJoining || isApprovingAction;

  // Reset progress when modal closes so the next open starts clean.
  if (!open && phase !== 'idle') {
    setPhase('idle');
  }

  const waitForAllowance = async (needed: bigint): Promise<boolean> => {
    for (let i = 0; i < 25; i++) {
      const result = await refetchAllowance();
      const value = (result.data as bigint | undefined) ?? 0n;
      if (value >= needed) return true;
      await new Promise((r) => setTimeout(r, 400));
    }
    return false;
  };

  const handleApprove = async (amount: bigint): Promise<boolean> => {
    try {
      const hash = await approve({
        address: USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, amount],
      });
      if (publicClient && hash) {
        await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
          pollingInterval: 800,
          timeout: 45_000,
        });
      }
      const ready = await waitForAllowance(amount);
      if (!ready) {
        console.warn('Allowance not visible yet after approve; continuing');
      }
      return true;
    } catch (err) {
      toast.error('Approval Failed', { description: getErrorMessage(err) });
      return false;
    }
  };

  const handleProceed = async () => {
    if (!canAfford || busy) return;

    // Continuous: Approve USDT (if needed) → joinChallenge. One Proceed, no button flip.
    if (allowance < stakeBigInt) {
      setPhase('approving');
      const ok = await handleApprove(stakeBigInt);
      if (!ok) {
        setPhase('idle');
        return;
      }
    }

    setPhase('joining');
    try {
      await onConfirm();
    } catch {
      /* parent toasts */
    } finally {
      setPhase('idle');
    }
  };

  const handleAddUsdt = () => {
    window.location.href = MINIPAY_ADD_USDT_URL;
  };

  const buttonLabel =
    phase === 'approving' || isApprovingAction
      ? 'Approving…'
      : phase === 'joining' || isJoining
        ? 'Joining…'
        : 'Proceed';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => !busy && onCancel()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            className="relative z-10 w-full max-w-[420px] rounded-3xl border-2 border-[var(--border-mid)] bg-[var(--bg-surface)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-ui text-base font-black uppercase tracking-wide text-[var(--accent)]">
              Ready to join?
            </h3>
            <p className="mt-2 font-body text-sm text-[var(--text-dim)]">
              {opponentLabel
                ? `You are joining ${opponentLabel}'s ${stake.toFixed(1)} USDT challenge.`
                : `You are joining a ${stake.toFixed(1)} USDT professional match.`}
            </p>
            <p className="mt-2 font-body text-sm text-[var(--text-dim)]">
              When you proceed, you&apos;ll be asked to sign <strong>2 transactions</strong>:
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 font-body text-sm text-[var(--text)]">
              <li>Approve USDT for the match</li>
              <li>Join the challenge on-chain</li>
            </ol>
            <p className="mt-3 font-body text-xs text-[var(--text-dim)]">
              Balance: <strong>{balance.toFixed(2)} USDT</strong>
              {' · '}
              Required: <strong>{stake.toFixed(1)} USDT</strong>
            </p>
            {!canAfford && (
              <div className="mt-2 flex flex-col items-center gap-1 text-center">
                <p className="font-body text-sm text-red-700">Insufficient balance.</p>
                {isMiniPay && (
                  <button
                    type="button"
                    onClick={handleAddUsdt}
                    className="font-ui text-[11px] font-bold uppercase tracking-wide text-[var(--accent)] underline underline-offset-2"
                  >
                    Add USDT in MiniPay
                  </button>
                )}
              </div>
            )}
            <ul className="mt-3 space-y-2.5 font-body text-sm text-[var(--text-dim)]">
              <li>• If you quit during the match, your opponent wins and you lose your stake.</li>
              <li>• In case of a draw, your stake is automatically refunded.</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="flex-1 rounded-xl border-2 border-[var(--border-mid)] bg-[var(--bg-elevated)] py-2.5 font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleProceed()}
                disabled={busy || !canAfford}
                className="flex-1 rounded-xl border-2 border-[var(--sky-shadow)] bg-gradient-to-b from-[var(--sky-top)] to-[var(--sky-deep)] py-2.5 font-ui text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-60"
              >
                {buttonLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
