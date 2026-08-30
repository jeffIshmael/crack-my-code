import { createPublicClient, formatUnits, http } from 'viem';
import { celo } from 'viem/chains';
import { prisma } from '@/lib/prisma';
import { CONTRACT_ADDRESS, CONTRACT_ABI, USDT_ADDRESS, ERC20_ABI } from '../../blockchain/constants';
import { startOfUtcDayDaysAgo } from '@/lib/stats';

export const ON_CHAIN_CONTRACT_ADDRESS = CONTRACT_ADDRESS;
export const ON_CHAIN_CELOSCAN_URL =
  'https://celoscan.io/address/0x0317e55136a46557516aa40EA96d66772767C72C';

export const SAMPLE_TRANSACTIONS = [
  {
    method: 'createChallenge (host opens match + locks stake)',
    url: 'https://celoscan.io/tx/0xcbc5616033bcf04065f9665f24dfa631c03e620cd8d634f75b1fc1c0ec9c6721',
  },
  {
    method: 'joinChallenge (opponent joins + locks stake)',
    url: null,
  },
  {
    method: 'resolveMatch (agent settles winner)',
    url: 'https://celoscan.io/tx/0x758fdd2400e65d3672a82469425f76e8edacec1cbca6654829a2d8c5ad137858',
  },
  {
    method: 'quitMatch (alternate end — opponent wins)',
    url: null,
  },
] as const;

/** Cipher no longer calls trackGame / rewardCipherWin on wins. */
const ON_CHAIN_TX_PER_CIPHER_GAME = 0;
/** createChallenge + joinChallenge + (resolveMatch | quitMatch). Approve is separate ERC-20. */
const ON_CHAIN_TX_PER_PVP_GAME = 3;

const publicClient = createPublicClient({
  chain: celo,
  transport: http(process.env.CELO_RPC_URL ?? 'https://forno.celo.org'),
});

async function readContractTreasury() {
  try {
    const [accumulatedFees, escrowedStakes, rewardPoolBalance, contractUsdt] = await Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'accumulatedFees',
      }) as Promise<bigint>,
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'escrowedStakes',
      }) as Promise<bigint>,
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'rewardPoolBalance',
      }) as Promise<bigint>,
      publicClient.readContract({
        address: USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [CONTRACT_ADDRESS as `0x${string}`],
      }) as Promise<bigint>,
    ]);

    return {
      accumulatedFeesUsdt: formatUnits(accumulatedFees, 6),
      /** Live locked match stakes (not withdrawable surplus). */
      escrowBalanceUsdt: formatUnits(escrowedStakes, 6),
      rewardPoolUsdt: formatUnits(rewardPoolBalance, 6),
      contractBalanceUsdt: formatUnits(contractUsdt, 6),
      readAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[on-chain-analytics] contract read failed', error);
    return null;
  }
}

function estimateOnChainTx(cipherCompleted: number, pvpCompleted: number) {
  return cipherCompleted * ON_CHAIN_TX_PER_CIPHER_GAME + pvpCompleted * ON_CHAIN_TX_PER_PVP_GAME;
}

export async function getOnChainAnalytics() {
  const fourteenDaysAgo = startOfUtcDayDaysAgo(14);
  const twoDaysAgo = startOfUtcDayDaysAgo(2);

  const completed = (since: Date) => ({
    status: 'COMPLETED' as const,
    updatedAt: { gte: since },
  });

  const [
    pvpAllTime,
    cipherAllTime,
    pvpLast14,
    cipherLast14,
    pvpLast2,
    cipherLast2,
    treasury,
  ] = await Promise.all([
    prisma.game.count({ where: { status: 'COMPLETED', mode: { in: ['fun', 'cash'] } } }),
    prisma.game.count({ where: { status: 'COMPLETED', mode: 'ai' } }),
    prisma.game.count({ where: { ...completed(fourteenDaysAgo), mode: { in: ['fun', 'cash'] } } }),
    prisma.game.count({ where: { ...completed(fourteenDaysAgo), mode: 'ai' } }),
    prisma.game.count({ where: { ...completed(twoDaysAgo), mode: { in: ['fun', 'cash'] } } }),
    prisma.game.count({ where: { ...completed(twoDaysAgo), mode: 'ai' } }),
    readContractTreasury(),
  ]);

  const totalOnChainTx = estimateOnChainTx(cipherAllTime, pvpAllTime);
  const onChainTx14d = estimateOnChainTx(cipherLast14, pvpLast14);
  const onChainTx2d = estimateOnChainTx(cipherLast2, pvpLast2);

  return {
    contractAddress: ON_CHAIN_CONTRACT_ADDRESS,
    celoscanUrl: ON_CHAIN_CELOSCAN_URL,
    chain: 'Celo Mainnet (42220)',
    activity: {
      totalOnChainTx,
      onChainTxLast14Days: onChainTx14d,
      onChainTxLast2Days: onChainTx2d,
    },
    txModel: {
      cipher: {
        method: 'none',
        txsPerGame: ON_CHAIN_TX_PER_CIPHER_GAME,
        note: 'Cipher games do not write on-chain.',
      },
      pvp: {
        methods: ['createChallenge', 'joinChallenge', 'resolveMatch'],
        alternateMethods: ['quitMatch'],
        txsPerGame: ON_CHAIN_TX_PER_PVP_GAME,
        note: '3 contract calls per match: host createChallenge, opponent joinChallenge, then resolveMatch or quitMatch. USDT approve is a separate ERC-20 tx.',
      },
    },
    treasury,
    sampleTransactions: SAMPLE_TRANSACTIONS,
    updatedAt: new Date().toISOString(),
  };
}
