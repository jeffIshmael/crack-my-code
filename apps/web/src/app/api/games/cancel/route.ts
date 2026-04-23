import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher-server';

export async function POST(req: NextRequest) {
  try {
    const { gameId } = await req.json();

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    // Find the game first to ensure it exists and maybe get some info for Pusher
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Delete the game from the backend
    await prisma.game.delete({
      where: { id: gameId }
    });

    // Notify other players via Pusher that the challenge is gone
    await pusherServer.trigger('lobby-channel', 'challenge-joined', {
      gameId: gameId
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel challenge error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cancel challenge', 
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}
