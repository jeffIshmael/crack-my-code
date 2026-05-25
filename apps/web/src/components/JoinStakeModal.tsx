'use client';

import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { CONTRACT_ADDRESS, USDT_ADDRESS, ERC20_ABI } from '../../blockchain/constants';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';

interface JoinStakeModalProps {
  open: boolean;
  stake: number;
  opponentLabel?: string;
  isJoining: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function JoinStakeModal({
  open,
  stake,
  opponentLabel,
  isJoining,
  onConfirm,
  onCancel,
}: JoinStakeModalProps) {
  const { address } = useAccount();
  const { data: usdtData } = useBalance({
    address,
    token: USDT_ADDRESS as `0x${string}`,
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
  const needsApproval = allowance < stakeBigInt;
  const balance = parseFloat(usdtData?.formatted || '0');
  const canAfford = balance >= stake;

  const { writeContract: approve, data: approveHash, isPending: isApprovingAction } = useWriteContract();
  const { isLoading: isWaitingForApproval } = useWaitForTransactionReceipt({ hash: approveHash });
  const isApproving = isApprovingAction || isWaitingForApproval;

  const handleApprove = () => {
    try {
      approve({
        address: USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, stakeBigInt],
      });
    } catch (err) {
      toast.error('Approval Failed', { description: getErrorMessage(err) });
    }
  };

  useEffect(() => {
    if (approveHash && !isWaitingForApproval) {
      refetchAllowance();
    }
  }, [approveHash, isWaitingForApproval, refetchAllowance]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center p-4 pointer-events-none sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            className="relative w-full max-w-[400px] rounded-3xl border-2 border-black/10 bg-[#FDFCFB] p-8 shadow-2xl pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-6 text-center">
              <div>
                <h2 className="font-orbitron text-lg font-black tracking-[0.2em] text-[var(--orange)] uppercase">
                  Lock Stake
                </h2>
                <p className="mt-2 text-[10px] font-bold text-black/40 uppercase tracking-widest">
                  {opponentLabel
                    ? `Join ${opponentLabel}'s paid challenge`
                    : 'Approve and lock USDT before setting your code'}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--orange)]/20 bg-[var(--orange)]/5 p-5">
                <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Required stake</span>
                <p className="font-orbitron text-3xl font-black text-[var(--orange)] mt-1">
                  {stake.toFixed(2)} <span className="text-sm">USDT</span>
                </p>
                <p className="text-[9px] font-bold text-black/40 uppercase tracking-wider mt-2">
                  Winner receives ~{(stake * 2 * 0.99).toFixed(2)} USDT
                </p>
                <p className="text-[9px] font-bold text-black/30 uppercase mt-1">
                  Balance: {balance.toFixed(3)} USDT
                </p>
              </div>

              {!canAfford && (
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
                  Insufficient USDT balance
                </p>
              )}

              <div className="flex flex-col gap-3">
                {needsApproval ? (
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isApproving || !canAfford}
                    className="w-full rounded-2xl bg-[var(--orange)] py-4 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
                  >
                    {isApproving ? 'APPROVING...' : 'APPROVE USDT'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isJoining || !canAfford}
                    className="w-full rounded-2xl bg-[var(--orange)] py-4 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
                  >
                    {isJoining ? 'LOCKING STAKE...' : 'LOCK STAKE & CONTINUE'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isJoining || isApproving}
                  className="w-full rounded-2xl border border-black/10 py-4 text-[10px] font-black uppercase tracking-widest text-black/50"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
