import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findGameByJoinInput } from '@/lib/game-lookup';

export const dynamic = 'force-dynamic';
import { pusherServer } from '@/lib/pusher-server';

export async function POST(req: NextRequest) {
  try {
    const { address, gameId: gameIdOrCode } = await req.json();

    if (!address || !gameIdOrCode) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    const game = await findGameByJoinInput(gameIdOrCode);

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'PENDING' || game.player2Address) {
      return NextResponse.json({ error: 'Game no longer available' }, { status: 400 });
    }

    if (game.player1Address.toLowerCase() === normalizedAddress) {
      return NextResponse.json({ error: 'Cannot join your own game' }, { status: 400 });
    }

    // MATCH JOINED!
    const updatedGame = await prisma.game.update({
      where: { id: game.id },
      data: {
        status: 'ACTIVE',
        player2Address: normalizedAddress
      }
    });

    // Notify Player 1 (the creator) via Pusher — channel uses lowercase address
    await pusherServer.trigger(`private-user-${game.player1Address.toLowerCase()}`, 'match-found', {
      gameId: updatedGame.id,
      opponentAddress: normalizedAddress
    });

    // Also broadcast to the lobby that this game is gone
    await pusherServer.trigger('lobby-channel', 'challenge-joined', {
      gameId: game.id
    });

    return NextResponse.json({ 
      status: 'matched', 
      gameId: updatedGame.id,
      joinCode: updatedGame.joinCode,
      opponentAddress: game.player1Address 
    });

  } catch (error) {
    console.error('Join game error:', error);
    return NextResponse.json({ error: 'Failed to join challenge' }, { status: 500 });
  }
}
