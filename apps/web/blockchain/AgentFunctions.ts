import { createWalletClient, createPublicClient, formatEther, formatUnits, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './constants';

const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}` | undefined;

if (!privateKey) {
  console.warn("AGENT_PRIVATE_KEY not set. Backend on-chain functions will fail.");
}

const account = privateKey ? privateKeyToAccount(privateKey) : null;

const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
});

const walletClient = account ? createWalletClient({
  account,
  chain: celo,
  transport: http(),
}) : null;

/**
 * Resolve a match on-chain (backend only)
 */
export async function resolveMatchOnChain(
  matchId: `0x${string}`,
  winner: `0x${string}`,
  player2: `0x${string}`,
  p1Guesses: number,
  p2Guesses: number,
  p1Code: string,
  p2Code: string,
  historyHash: string,
  guesses: string[]
) {
  if (!account || !walletClient) throw new Error("Agent not initialized");

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'resolveMatch',
    args: [
      matchId, 
      winner, 
      player2, 
      BigInt(p1Guesses), 
      BigInt(p2Guesses), 
      p1Code, 
      p2Code, 
      historyHash, 
      guesses
    ],
  });
  
  const hash = await walletClient.writeContract(request);
  return await publicClient.waitForTransactionReceipt({ hash });
}

/**
 * Resolve a draw match on-chain (backend only).
 */
export async function resolveDrawOnChain(
  matchId: `0x${string}`,
  player2: `0x${string}`,
  p1Guesses: number,
  p2Guesses: number,
  p1Code: string,
  p2Code: string,
  historyHash: string
) {
  if (!account || !walletClient) throw new Error("Agent not initialized");

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "resolveDraw",
    args: [
      matchId,
      player2,
      BigInt(p1Guesses),
      BigInt(p2Guesses),
      p1Code,
      p2Code,
      historyHash,
    ],
  });

  const hash = await walletClient.writeContract(request);
  return await publicClient.waitForTransactionReceipt({ hash });
}

/**
 * Record a player quitting on-chain (backend only)
 */
export async function recordQuitOnChain(
  matchId: `0x${string}`,
  quitter: `0x${string}`
) {
  if (!account || !walletClient) throw new Error("Agent not initialized");

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'recordQuit',
    args: [matchId, quitter],
  });
  
  const hash = await walletClient.writeContract(request);
  return await publicClient.waitForTransactionReceipt({ hash });
}

/**
 * Update guess counts on-chain (backend only)
 */
export async function updateGuessCountsOnChain(
  matchId: `0x${string}`,
  p1Guesses: number,
  p2Guesses: number
) {
  if (!account || !walletClient) throw new Error("Agent not initialized");

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'updateGuessCounts',
    args: [matchId, BigInt(p1Guesses), BigInt(p2Guesses)],
  });
  
  const hash = await walletClient.writeContract(request);
  return await publicClient.waitForTransactionReceipt({ hash });
}

/**
 * Expire a pending match on-chain — refunds the creator's stake.
 * This is permissionless after matchExpiry, but we call it from the backend agent.
 */
export async function expireMatchOnChain(matchId: `0x${string}`) {
  if (!account || !walletClient) throw new Error("Agent not initialized");

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'expireMatch',
    args: [matchId],
  });

  const hash = await walletClient.writeContract(request);
  return await publicClient.waitForTransactionReceipt({ hash });
}

/**
 * Track a game completion on-chain (backend only)
 */
export async function trackGameOnChain(
  matchType: number,
  isAI: boolean
) {
  if (!account || !walletClient) throw new Error("Agent not initialized");

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'trackGame',
    args: [matchType, isAI],
  });
  
  const hash = await walletClient.writeContract(request);
  return await publicClient.waitForTransactionReceipt({ hash });
}

export type CipherRewardResult =
  | { status: 'paid'; txHash: `0x${string}`; amount: bigint }
  | { status: 'skipped'; reason: 'insufficient_pool' | 'daily_cap' | 'disabled' | 'already_paid' | 'simulation_failed' };

/**
 * Pay a Cipher win reward from the on-chain pool (backend only).
 * Skips gracefully when the pool balance is too low.
 */
export async function rewardCipherWinOnChain(
  player: `0x${string}`,
): Promise<CipherRewardResult> {
  if (!account || !walletClient) throw new Error("Agent not initialized");

  const rewardAmount = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'cipherWinReward',
  }) as bigint;

  if (rewardAmount <= 0n) {
    return { status: 'skipped', reason: 'disabled' };
  }

  const poolBalance = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'rewardPoolBalance',
  }) as bigint;

  if (poolBalance < rewardAmount) {
    console.warn('[Blockchain] Reward pool too low for cipher payout', {
      poolBalance: poolBalance.toString(),
      rewardAmount: rewardAmount.toString(),
    });
    return { status: 'skipped', reason: 'insufficient_pool' };
  }

  try {
    const { request } = await publicClient.simulateContract({
      account,
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'rewardCipherWin',
      args: [player],
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return { status: 'paid', txHash: receipt.transactionHash, amount: rewardAmount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('daily cipher cap')) {
      return { status: 'skipped', reason: 'daily_cap' };
    }
    console.error('[Blockchain] rewardCipherWin failed:', err);
    return { status: 'skipped', reason: 'simulation_failed' };
  }
}

/**
 * Read how many cipher rewards a wallet received today (UTC).
 */
export async function getCipherRewardsToday(player: `0x${string}`): Promise<number> {
  const count = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'cipherRewardsToday',
    args: [player],
  }) as bigint;
  return Number(count);
}

/**
 * Send 0.1 Celo from the agent wallet to a specific address
 */
export async function sendCeloToUser(
  to: `0x${string}`,
  amount: string
) {
  if (!account || !walletClient) throw new Error("Agent not initialized");

  console.log(`Sending ${amount} Celo to ${to}...`);
  const hash = await walletClient.sendTransaction({
    to,
    value: parseEther(amount),
  });
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Transaction successful! Hash: ${receipt.transactionHash}`);
  return receipt;
}

/**
 * Get the agent wallet's CELO balance
 */
export async function getAgentBalance() {
  if (!account) throw new Error("Agent not initialized");
  const balance = await publicClient.getBalance({ address: account.address });
  return balance; // Returns BigInt in wei
}

/**
 * Get the on-chain Cipher reward pool balance (USDT, 6 decimals).
 */
export async function getRewardPoolBalance() {
  return publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'rewardPoolBalance',
  }) as Promise<bigint>;
}

export type AgentTreasurySnapshot = {
  agent: {
    address: `0x${string}`;
    celo: { wei: string; formatted: string };
  };
  rewardPool: {
    usdt: { raw: string; formatted: string };
    cipherWinReward: { raw: string; formatted: string };
    estimatedCipherWinsRemaining: number | null;
  };
  contractAddress: typeof CONTRACT_ADDRESS;
  chain: 'celo';
  updatedAt: string;
};

/**
 * Agent CELO balance + contract reward pool in one read.
 */
export async function getAgentTreasurySnapshot(): Promise<AgentTreasurySnapshot> {
  if (!account) throw new Error("Agent not initialized");

  const [celoWei, rewardPoolRaw, cipherWinRewardRaw] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    getRewardPoolBalance(),
    publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'cipherWinReward',
    }) as Promise<bigint>,
  ]);

  const estimatedCipherWinsRemaining =
    cipherWinRewardRaw > 0n
      ? Number(rewardPoolRaw / cipherWinRewardRaw)
      : null;

  return {
    agent: {
      address: account.address,
      celo: {
        wei: celoWei.toString(),
        formatted: formatEther(celoWei),
      },
    },
    rewardPool: {
      usdt: {
        raw: rewardPoolRaw.toString(),
        formatted: formatUnits(rewardPoolRaw, 6),
      },
      cipherWinReward: {
        raw: cipherWinRewardRaw.toString(),
        formatted: formatUnits(cipherWinRewardRaw, 6),
      },
      estimatedCipherWinsRemaining,
    },
    contractAddress: CONTRACT_ADDRESS,
    chain: 'celo',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get the agent wallet's address
 */
export function getAgentAddress() {
  return account?.address || null;
}