import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher-server';
import { createGameRecord } from '@/lib/prisma-game';

export const dynamic = 'force-dynamic';

function isPlayer(game: { player1Address: string; player2Address: string | null }, address: string) {
  const lower = address.toLowerCase();
  return (
    game.player1Address.toLowerCase() === lower ||
    game.player2Address?.toLowerCase() === lower
  );
}

function playerSlot(game: { player1Address: string; player2Address: string | null }, address: string): 1 | 2 | null {
  const lower = address.toLowerCase();
  if (game.player1Address.toLowerCase() === lower) return 1;
  if (game.player2Address?.toLowerCase() === lower) return 2;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { gameId, address, action } = await req.json();

    if (!gameId || !address || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    const game = await prisma.game.findUnique({ where: { id: gameId } });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'COMPLETED' || game.mode === 'ai') {
      return NextResponse.json({ error: 'Rematch not available for this game' }, { status: 400 });
    }

    if (!game.player2Address || !isPlayer(game, normalizedAddress)) {
      return NextResponse.json({ error: 'Not a participant in this game' }, { status: 403 });
    }

    const slot = playerSlot(game, normalizedAddress);
    if (!slot) {
      return NextResponse.json({ error: 'Not a participant in this game' }, { status: 403 });
    }

    const opponentAddress =
      slot === 1 ? game.player2Address!.toLowerCase() : game.player1Address.toLowerCase();

    if (action === 'decline') {
      await prisma.game.update({
        where: { id: gameId },
        data: { player1WantsRematch: false, player2WantsRematch: false },
      });

      await pusherServer.trigger(`private-user-${opponentAddress}`, 'rematch-declined', {
        rejectedBy: normalizedAddress,
      });

      return NextResponse.json({ status: 'declined' });
    }

    const rematchData =
      slot === 1
        ? { player1WantsRematch: true }
        : { player2WantsRematch: true };

    const updated = await prisma.game.update({
      where: { id: gameId },
      data: rematchData,
    });

    const opponentWants =
      slot === 1 ? updated.player2WantsRematch : updated.player1WantsRematch;

    if (!opponentWants) {
      await pusherServer.trigger(`private-user-${opponentAddress}`, 'rematch-request', {
        from: normalizedAddress,
        gameId,
      });

      return NextResponse.json({ status: 'waiting' });
    }

    const creatorUser = await prisma.user.findFirst({
      where: { address: { equals: game.player1Address, mode: 'insensitive' } },
    });

    if (!creatorUser) {
      return NextResponse.json({ error: 'Could not resolve game creator' }, { status: 500 });
    }

    const newGame = await createGameRecord({
      userId: creatorUser.id,
      player1Address: game.player1Address.toLowerCase(),
      player2Address: game.player2Address.toLowerCase(),
      mode: game.mode,
      stake: game.stake,
      status: 'ACTIVE',
      isPublic: false,
    });

    await prisma.game.update({
      where: { id: gameId },
      data: { player1WantsRematch: false, player2WantsRematch: false },
    });

    const rematchPayload = {
      gameId: newGame.id,
      mode: game.mode,
      stake: game.stake,
    };

    await pusherServer.trigger(`private-user-${game.player1Address.toLowerCase()}`, 'rematch-started', {
      ...rematchPayload,
      opponentAddress: game.player2Address.toLowerCase(),
    });

    await pusherServer.trigger(`private-user-${game.player2Address.toLowerCase()}`, 'rematch-started', {
      ...rematchPayload,
      opponentAddress: game.player1Address.toLowerCase(),
    });

    return NextResponse.json({
      status: 'started',
      gameId: newGame.id,
      opponentAddress,
    });
  } catch (error) {
    console.error('Rematch error:', error);
    return NextResponse.json({ error: 'Failed to process rematch' }, { status: 500 });
  }
}
