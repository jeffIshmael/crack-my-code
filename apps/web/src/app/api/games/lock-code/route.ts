import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
import { pusherServer } from '@/lib/pusher-server';
import { nextTurnDeadline } from '@/lib/turn-deadline';

export async function POST(req: NextRequest) {
  try {
    const { gameId, address, code } = await req.json();

    if (!gameId || !address || !code) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const normalizedAddress = address === 'GUEST' ? 'GUEST' : address.toLowerCase();

    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const isPlayer1 = game.player1Address.toLowerCase() === normalizedAddress.toLowerCase();
    const isPlayer2 = game.player2Address?.toLowerCase() === normalizedAddress.toLowerCase();

    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json({ error: 'Not a player in this game' }, { status: 403 });
    }

    const updateData: { player1Code?: string; player2Code?: string } = {};
    if (isPlayer1) updateData.player1Code = code;
    else updateData.player2Code = code;

    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: updateData,
    });

    if (updatedGame.player1Code && updatedGame.player2Code) {
      const isPvP = updatedGame.mode !== 'ai';
      const turnDeadlineAt = isPvP ? nextTurnDeadline() : null;

      await prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'ACTIVE',
          turnDeadlineAt,
        },
      });

      const serverNow = new Date();
      await pusherServer.trigger(`private-game-${gameId}`, 'game-started', {
        status: 'ACTIVE',
        turnDeadlineAt: turnDeadlineAt?.toISOString() ?? null,
        serverNow: serverNow.toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lock code error:', error);
    return NextResponse.json({ error: 'Failed to lock code' }, { status: 500 });
  }
}
