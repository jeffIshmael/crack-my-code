'use client';

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI, USDT_ADDRESS, ERC20_ABI } from './constants';
import { useCallback, useMemo } from 'react';

export function useGuessMyCode() {
  const { address } = useAccount();

  // --- USDT Reads ---
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESS] : undefined,
    query: {
      enabled: !!address,
    }
  });

  const { data: usdtBalance, refetch: refetchBalance } = useReadContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  });

  // --- USDT Writes ---
  const { writeContractAsync: approveAsync, data: approveHash } = useWriteContract();
  const { isLoading: isApproving } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const approveUsdt = useCallback(async (amount: bigint) => {
    return approveAsync({
      address: USDT_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESS, amount],
    });
  }, [approveAsync]);

  // --- Contract Writes ---
  const { writeContractAsync: createChallengeAsync, data: createHash } = useWriteContract();
  const { isLoading: isCreatingChallenge, data: createReceipt } = useWaitForTransactionReceipt({
    hash: createHash,
  });

  const createChallenge = useCallback(async (isPaid: boolean, stakeAmt: bigint) => {
    return createChallengeAsync({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'createChallenge',
      args: [isPaid, stakeAmt],
    });
  }, [createChallengeAsync]);

  const { writeContractAsync: joinChallengeAsync, data: joinHash } = useWriteContract();
  const { isLoading: isJoiningChallenge, data: joinReceipt } = useWaitForTransactionReceipt({
    hash: joinHash,
  });

  const joinChallenge = useCallback(async (challenger: `0x${string}`) => {
    return joinChallengeAsync({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'joinChallenge',
      args: [challenger],
    });
  }, [joinChallengeAsync]);

  return {
    // State
    allowance,
    usdtBalance,
    isApproving,
    isCreatingChallenge,
    isJoiningChallenge,
    createReceipt,
    joinReceipt,
    createHash,
    joinHash,

    // Actions
    approveUsdt,
    createChallenge,
    joinChallenge,
    refetchAllowance,
    refetchBalance,
  };
}
