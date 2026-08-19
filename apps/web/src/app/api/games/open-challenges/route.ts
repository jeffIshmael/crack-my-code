import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { expireMatchOnChain } from '../../../../../blockchain/AgentFunctions';
import {
  isJoinableOpenChallenge,
  toOpenChallengeSummary,
  type OpenChallengeSummary,
} from '@/lib/open-challenges';

export const dynamic = 'force-dynamic';

const STAKE_TIERS = [0.2, 0.5, 1, 2, 5, 10] as const;

async function expireStaleGames(limit = 5) {
  const cutoff = new Date(Date.now() - 300 * 1000);
  const stale = await prisma.game.findMany({
    where: {
      status: 'PENDING',
      mode: 'cash',
      player2Address: null,
      createdAt: { lt: cutoff },
      onChainMatchId: { not: null },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  for (const game of stale) {
    try {
      await expireMatchOnChain(game.onChainMatchId as `0x${string}`);
      await prisma.game.updateMany({
        where: { id: game.id, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });
    } catch (err) {
      console.error('[open-challenges] expire stale failed:', game.id, err);
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const excludeAddress = searchParams.get('excludeAddress')?.toLowerCase() ?? undefined;

    void expireStaleGames();

    const pending = await prisma.game.findMany({
      where: {
        status: 'PENDING',
        mode: 'cash',
        isPublic: true,
        player2Address: null,
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    const joinable = pending.filter((g) =>
      isJoinableOpenChallenge(g, excludeAddress),
    );

    const byStake: Record<string, OpenChallengeSummary | null> = {};
    const stakesWithOpen: number[] = [];

    for (const tier of STAKE_TIERS) {
      const match = joinable.find((g) => Math.abs(g.stake - tier) < 0.001);
      if (match) {
        byStake[String(tier)] = toOpenChallengeSummary(match);
        stakesWithOpen.push(tier);
      } else {
        byStake[String(tier)] = null;
      }
    }

    return NextResponse.json({
      byStake,
      stakesWithOpen,
      challenges: joinable.map(toOpenChallengeSummary),
    });
  } catch (error) {
    console.error('[open-challenges]', error);
    return NextResponse.json({ error: 'Failed to fetch open challenges' }, { status: 500 });
  }
}
