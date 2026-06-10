import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfUtcDay } from '@/lib/stats';
import { isGuestAddress, registeredPlayerWhere } from '@/lib/guest';

export const dynamic = 'force-dynamic';

function userParticipated(address: string) {
  return {
    OR: [{ player1Address: address }, { player2Address: address }],
  };
}

async function countUserGames(
  address: string,
  extra: Record<string, unknown> = {},
) {
  return prisma.game.count({
    where: {
      status: 'COMPLETED',
      ...userParticipated(address),
      ...extra,
    },
  });
}

async function getMyStats(address: string) {
  const normalizedAddress = address.toLowerCase();

  const [
    totalPlayed,
    cipherPlayed,
    opponentPlayed,
    totalWon,
    cipherWon,
    opponentWon,
    totalLost,
    cipherLost,
    opponentLost,
    lastGame,
  ] = await Promise.all([
    countUserGames(normalizedAddress),
    countUserGames(normalizedAddress, { mode: 'ai' }),
    countUserGames(normalizedAddress, { mode: { in: ['fun', 'cash'] } }),
    countUserGames(normalizedAddress, {
      winnerAddress: { equals: normalizedAddress, mode: 'insensitive' },
    }),
    countUserGames(normalizedAddress, {
      mode: 'ai',
      winnerAddress: { equals: normalizedAddress, mode: 'insensitive' },
    }),
    countUserGames(normalizedAddress, {
      mode: { in: ['fun', 'cash'] },
      winnerAddress: { equals: normalizedAddress, mode: 'insensitive' },
    }),
    countUserGames(normalizedAddress, {
      winnerAddress: { not: null },
      NOT: { winnerAddress: { equals: normalizedAddress, mode: 'insensitive' } },
    }),
    countUserGames(normalizedAddress, {
      mode: 'ai',
      winnerAddress: { not: null },
      NOT: { winnerAddress: { equals: normalizedAddress, mode: 'insensitive' } },
    }),
    countUserGames(normalizedAddress, {
      mode: { in: ['fun', 'cash'] },
      winnerAddress: { not: null },
      NOT: { winnerAddress: { equals: normalizedAddress, mode: 'insensitive' } },
    }),
    prisma.game.findFirst({
      where: {
        status: 'COMPLETED',
        ...userParticipated(normalizedAddress),
      },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
  ]);

  return {
    totalPlayed,
    cipherPlayed,
    opponentPlayed,
    totalWon,
    cipherWon,
    opponentWon,
    totalLost,
    cipherLost,
    opponentLost,
    lastPlayedAt: lastGame?.updatedAt ?? null,
  };
}

async function getGlobalStats() {
  const todayStart = startOfUtcDay();

  const [
    totalUsers,
    totalPlayed,
    cipherPlayed,
    opponentPlayed,
    cipherWins,
    playedToday,
  ] = await Promise.all([
    prisma.user.count({
      where: registeredPlayerWhere,
    }),
    prisma.game.count({ where: { status: 'COMPLETED' } }),
    prisma.game.count({ where: { status: 'COMPLETED', mode: 'ai' } }),
    prisma.game.count({
      where: { status: 'COMPLETED', mode: { in: ['fun', 'cash'] } },
    }),
    prisma.game.count({
      where: {
        status: 'COMPLETED',
        winnerAddress: { equals: 'AI', mode: 'insensitive' },
      },
    }),
    prisma.game.count({
      where: {
        status: 'COMPLETED',
        updatedAt: { gte: todayStart },
      },
    }),
  ]);

  return {
    totalUsers,
    totalPlayed,
    cipherPlayed,
    opponentPlayed,
    cipherWins,
    playedToday,
  };
}

export async function GET(req: NextRequest) {
  try {
    const scope = req.nextUrl.searchParams.get('scope') ?? 'all';
    const address = req.nextUrl.searchParams.get('address');

    if (scope === 'me') {
      if (!address) {
        return NextResponse.json({ error: 'Address is required for my stats' }, { status: 400 });
      }

      if (isGuestAddress(address)) {
        return NextResponse.json({ error: 'Sign in to track personal stats' }, { status: 400 });
      }

      const my = await getMyStats(address);
      return NextResponse.json({ scope: 'me', my });
    }

    const global = await getGlobalStats();
    return NextResponse.json({ scope: 'all', global });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
