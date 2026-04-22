import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher-server';

export async function POST(req: NextRequest) {
  try {
    const { gameId, address, code } = await req.json();

    if (!gameId || !address || !code) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const isPlayer1 = game.player1Address === address;
    const isPlayer2 = game.player2Address === address;

    if (!isPlayer1 && !isPlayer1) {
      return NextResponse.json({ error: 'Not a player in this game' }, { status: 403 });
    }

    const updateData: any = {};
    if (isPlayer1) updateData.player1Code = code;
    else updateData.player2Code = code;

    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: updateData
    });

    // Check if both codes are set
    if (updatedGame.player1Code && updatedGame.player2Code) {
       await prisma.game.update({
         where: { id: gameId },
         data: { status: 'ACTIVE' }
       });

       // Notify both players that the game has started
       await pusherServer.trigger(`private-game-${gameId}`, 'game-started', {
         status: 'ACTIVE'
       });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Lock code error:', error);
    return NextResponse.json({ error: 'Failed to lock code' }, { status: 500 });
  }
}
