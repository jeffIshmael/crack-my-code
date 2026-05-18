import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoSepolia, celo } from 'viem/chains';
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
 * Get the agent wallet's address
 */
export function getAgentAddress() {
  return account?.address || null;
}