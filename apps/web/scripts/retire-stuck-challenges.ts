/**
 * One-off: retire stuck PENDING cash challenges for a player and sync DB.
 * Run: pnpm exec tsx scripts/retire-stuck-challenges.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { createPublicClient, http, formatUnits } from 'viem';
import { celo } from 'viem/chains';
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  USDT_ADDRESS,
  ERC20_ABI,
} from '../blockchain/constants';
import { expireMatchOnChain } from '../blockchain/AgentFunctions';

const PLAYER = (process.env.RETIRE_ADDRESS || '0xa4690e6bb56d85ca7c48a72b37a650c6f7f438e1').toLowerCase();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const publicClient = createPublicClient({ chain: celo, transport: http() });

const STATUS_NAMES = ['None', 'Pending', 'Active', 'Completed', 'Cancelled', 'Expired', 'Draw'] as const;

async function readMatch(matchId: `0x${string}`) {
  const m = (await publicClient.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'matches',
    args: [matchId],
  })) as any;

  // viem may return object or tuple depending on ABI
  const status = Number(m.status ?? m[8] ?? m[9] ?? -1);
  const stakeAmount = (m.stakeAmount ?? m[5] ?? 0n) as bigint;
  const player1 = (m.player1 ?? m[1]) as string;
  const player2 = (m.player2 ?? m[2]) as string;
  return { status, statusName: STATUS_NAMES[status] ?? `Unknown(${status})`, stakeAmount, player1, player2, raw: m };
}

async function main() {
  console.log('Retiring stuck challenges for', PLAYER);

  const games = await prisma.game.findMany({
    where: {
      player1Address: { equals: PLAYER, mode: 'insensitive' },
      status: 'PENDING',
      mode: 'cash',
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${games.length} PENDING cash game(s)`);

  for (const g of games) {
    console.log('\n---', g.id, 'stake', g.stake, 'created', g.createdAt.toISOString());
    console.log('onChainMatchId', g.onChainMatchId);

    if (!g.onChainMatchId) {
      await prisma.game.update({ where: { id: g.id }, data: { status: 'EXPIRED' } });
      console.log('No on-chain id → marked EXPIRED in DB');
      continue;
    }

    const matchId = g.onChainMatchId as `0x${string}`;
    let onChain;
    try {
      onChain = await readMatch(matchId);
      console.log('On-chain status:', onChain.statusName, 'stake', formatUnits(onChain.stakeAmount, 6));
    } catch (err) {
      console.error('Failed to read match', err);
      continue;
    }

    if (onChain.statusName === 'Pending') {
      console.log('Calling expireMatchOnChain…');
      try {
        await expireMatchOnChain(matchId);
        console.log('expireMatch succeeded');
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.toLowerCase().includes('match not pending')) {
          console.log('Already settled on-chain during call');
        } else {
          console.error('expireMatch failed', msg);
          continue;
        }
      }
    } else {
      console.log('Not Pending on-chain — syncing DB only (refund already applied if Expired/Cancelled)');
    }

    await prisma.game.updateMany({
      where: { id: g.id, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });
    console.log('DB → EXPIRED');
  }

  const bal = (await publicClient.readContract({
    address: USDT_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [PLAYER as `0x${string}`],
  })) as bigint;
  console.log('\nPlayer USDT balance now:', formatUnits(bal, 6));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
