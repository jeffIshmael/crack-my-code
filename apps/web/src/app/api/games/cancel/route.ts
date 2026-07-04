import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher-server';

export async function POST(req: NextRequest) {
  try {
    const { gameId, address } = await req.json();

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (address) {
      const normalized = address === 'GUEST' ? 'GUEST' : address.toLowerCase();
      if (game.player1Address.toLowerCase() !== normalized.toLowerCase()) {
        return NextResponse.json({ error: 'Not your game' }, { status: 403 });
      }
    }

    if (game.mode === 'ai' && game.player1Code) {
      return NextResponse.json(
        { error: 'Cannot cancel a Cipher game after your code is locked' },
        { status: 400 },
      );
    }

    if (game.mode !== 'ai' && game.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot cancel an active match' },
        { status: 400 },
      );
    }

    await prisma.game.delete({
      where: { id: gameId },
    });

    await pusherServer.trigger('lobby-channel', 'challenge-joined', {
      gameId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel challenge error:', error);
    return NextResponse.json(
      {
        error: 'Failed to cancel challenge',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
