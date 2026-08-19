import { createPublicClient, formatUnits, http } from 'viem';
import { celo } from 'viem/chains';
import { prisma } from '@/lib/prisma';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../../blockchain/constants';
import { movingAverageDaily, startOfUtcDayDaysAgo } from '@/lib/stats';

export const ON_CHAIN_CONTRACT_ADDRESS = CONTRACT_ADDRESS;
export const ON_CHAIN_CELOSCAN_URL =
  'https://celoscan.io/address/0x0317e55136a46557516aa40EA96d66772767C72C';

export const SAMPLE_TRANSACTIONS = [
  {
    method: 'createChallenge (user stakes USDT + opens match)',
    url: 'https://celoscan.io/tx/0xcbc5616033bcf04065f9665f24dfa631c03e620cd8d634f75b1fc1c0ec9c6721',
  },
  {
    method: 'joinChallenge (opponent joins match)',
    url: null,
  },
  {
    method: 'resolveMatch (backend settles winner, pays escrow)',
    url: 'https://celoscan.io/tx/0x758fdd2400e65d3672a82469425f76e8edacec1cbca6654829a2d8c5ad137858',
  },
  {
    method: 'trackGame (Cipher AI win recorded on-chain)',
    url: null,
  },
  {
    method: 'quitMatch (player exits an active match)',
    url: null,
  },
] as const;

const ON_CHAIN_TX_PER_CIPHER_GAME = 1;
const ON_CHAIN_TX_PER_PVP_GAME = 3;

const publicClient = createPublicClient({
  chain: celo,
  transport: http(process.env.CELO_RPC_URL ?? 'https://forno.celo.org'),
});

async function readContractTreasury() {
  try {
    const [accumulatedFees, nonFeeBalance, rewardPoolBalance] = await Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'accumulatedFees',
      }) as Promise<bigint>,
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'nonFeeBalance',
      }) as Promise<bigint>,
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'rewardPoolBalance',
      }) as Promise<bigint>,
    ]);

    return {
      accumulatedFeesUsdt: formatUnits(accumulatedFees, 6),
      escrowBalanceUsdt: formatUnits(nonFeeBalance, 6),
      rewardPoolUsdt: formatUnits(rewardPoolBalance, 6),
      readAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[on-chain-analytics] contract read failed', error);
    return null;
  }
}

export async function getOnChainAnalytics() {
  const fourteenDaysAgo = startOfUtcDayDaysAgo(14);
  const completedInWindow = {
    status: 'COMPLETED' as const,
    updatedAt: { gte: fourteenDaysAgo },
  };

  const [completedLast14Days, cipherLast14Days, pvpLast14Days, treasury] = await Promise.all([
    prisma.game.count({ where: completedInWindow }),
    prisma.game.count({ where: { ...completedInWindow, mode: 'ai' } }),
    prisma.game.count({
      where: { ...completedInWindow, mode: { in: ['fun', 'cash'] } },
    }),
    readContractTreasury(),
  ]);

  const onChainTxLast14Days =
    cipherLast14Days * ON_CHAIN_TX_PER_CIPHER_GAME +
    pvpLast14Days * ON_CHAIN_TX_PER_PVP_GAME;

  return {
    contractAddress: ON_CHAIN_CONTRACT_ADDRESS,
    celoscanUrl: ON_CHAIN_CELOSCAN_URL,
    chain: 'Celo Mainnet (42220)',
    windowDays: 14,
    activity: {
      completedGamesInWindow: completedLast14Days,
      cipherGamesInWindow: cipherLast14Days,
      pvpGamesInWindow: pvpLast14Days,
      estimatedOnChainTxInWindow: onChainTxLast14Days,
      movingAverageDailyOnChainTx: movingAverageDaily(onChainTxLast14Days, 14),
    },
    txModel: {
      cipher: { method: 'trackGame', txsPerGame: ON_CHAIN_TX_PER_CIPHER_GAME },
      pvp: {
        methods: ['createChallenge', 'joinChallenge', 'resolveMatch'],
        alternateMethods: ['quitMatch'],
        txsPerGame: ON_CHAIN_TX_PER_PVP_GAME,
      },
      note: 'Estimates from completed games in the last 14 days. Cipher: 1× trackGame. PvP: 3 txs per match (host createChallenge, opponent joinChallenge, agent resolveMatch or quitMatch).',
    },
    treasury,
    sampleTransactions: SAMPLE_TRANSACTIONS,
    updatedAt: new Date().toISOString(),
  };
}
