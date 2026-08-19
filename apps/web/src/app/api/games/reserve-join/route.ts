import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  JOIN_RESERVATION_TTL_SECONDS,
  isGameJoinableByTime,
  isJoinReservationActive,
} from '@/lib/join-reservation';
import { isJoinableChallenge } from '@/lib/open-challenges';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { gameId, address } = await req.json();

    if (!gameId || !address) {
      return NextResponse.json({ error: 'Missing gameId or address' }, { status: 400 });
    }

    const joiner = address.toLowerCase();
    const game = await prisma.game.findUnique({ where: { id: gameId } });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (!isJoinableChallenge(game, joiner, { mode: game.mode as 'fun' | 'cash' })) {
      if (!isGameJoinableByTime(game.createdAt)) {
        return NextResponse.json({ error: 'Challenge expired' }, { status: 410 });
      }
      if (
        isJoinReservationActive(game.joinReservedBy, game.joinReservedUntil, joiner)
      ) {
        return NextResponse.json(
          { error: 'Someone else is joining this challenge', code: 'JOIN_RESERVED' },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: 'Challenge not available' }, { status: 400 });
    }

    const reservedUntil = new Date(Date.now() + JOIN_RESERVATION_TTL_SECONDS * 1000);

    const updated = await prisma.game.updateMany({
      where: {
        id: gameId,
        status: 'PENDING',
        player2Address: null,
        OR: [
          { joinReservedUntil: null },
          { joinReservedUntil: { lt: new Date() } },
          { joinReservedBy: joiner },
        ],
      },
      data: {
        joinReservedBy: joiner,
        joinReservedUntil: reservedUntil,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: 'Someone else is joining this challenge', code: 'JOIN_RESERVED' },
        { status: 409 },
      );
    }

    return NextResponse.json({
      gameId: game.id,
      hostAddress: game.player1Address,
      stake: game.stake,
      onChainMatchId: game.onChainMatchId,
      reservedUntil: reservedUntil.toISOString(),
    });
  } catch (error) {
    console.error('[reserve-join]', error);
    return NextResponse.json({ error: 'Failed to reserve join' }, { status: 500 });
  }
}
