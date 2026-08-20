import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Clear a soft join reservation after wallet reject / failed join tx. */
export async function POST(req: NextRequest) {
  try {
    const { gameId, address } = await req.json();

    if (!gameId || !address) {
      return NextResponse.json({ error: 'Missing gameId or address' }, { status: 400 });
    }

    const joiner = address.toLowerCase();

    await prisma.game.updateMany({
      where: {
        id: gameId,
        status: 'PENDING',
        player2Address: null,
        joinReservedBy: joiner,
      },
      data: {
        joinReservedBy: null,
        joinReservedUntil: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[release-join]', error);
    return NextResponse.json({ error: 'Failed to release join reservation' }, { status: 500 });
  }
}
