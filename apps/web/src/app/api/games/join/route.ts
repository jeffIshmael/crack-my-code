import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
import { pusherServer } from '@/lib/pusher-server';

export async function POST(req: NextRequest) {
  try {
    const { address, gameId } = await req.json();

    if (!address || !gameId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'PENDING' || game.player2Address) {
      return NextResponse.json({ error: 'Game no longer available' }, { status: 400 });
    }

    if (game.player1Address === address) {
      return NextResponse.json({ error: 'Cannot join your own game' }, { status: 400 });
    }

    // MATCH JOINED!
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'ACTIVE',
        player2Address: address
      }
    });

    // Notify Player 1 (the creator) via Pusher
    await pusherServer.trigger(`private-user-${game.player1Address}`, 'match-found', {
      gameId: updatedGame.id,
      opponentAddress: address
    });

    // Also broadcast to the lobby that this game is gone
    await pusherServer.trigger('lobby-channel', 'challenge-joined', {
      gameId: gameId
    });

    return NextResponse.json({ 
      status: 'matched', 
      gameId: updatedGame.id, 
      opponentAddress: game.player1Address 
    });

  } catch (error) {
    console.error('Join game error:', error);
    return NextResponse.json({ error: 'Failed to join challenge' }, { status: 500 });
  }
}
