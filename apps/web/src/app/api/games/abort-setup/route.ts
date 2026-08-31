import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher-server';
import { resolveDrawOnChain } from '../../../../../blockchain/AgentFunctions';
import { isMatchAlreadySettledError } from '@/lib/expire-match';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { gameId, address, reason = 'back' } = await req.json();

    if (!gameId || !address) {
      return NextResponse.json({ error: 'Missing gameId or address' }, { status: 400 });
    }

    const normalized =
      address === 'GUEST' ? 'GUEST' : String(address).toLowerCase();

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { _count: { select: { guesses: true } } },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.mode === 'ai') {
      return NextResponse.json({ error: 'Not a PvP match' }, { status: 400 });
    }

    if (game.status === 'CANCELLED' || game.status === 'COMPLETED' || game.status === 'EXPIRED') {
      return NextResponse.json({
        success: true,
        alreadyClosed: true,
        leaverAddress: normalized,
        reason,
      });
    }

    const isPlayer1 = game.player1Address.toLowerCase() === normalized;
    const isPlayer2 = game.player2Address?.toLowerCase() === normalized;

    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json({ error: 'Not a participant in this game' }, { status: 403 });
    }

    if (game._count.guesses > 0) {
      return NextResponse.json({ error: 'Match already in progress' }, { status: 400 });
    }

    if (game.player1Code && game.player2Code) {
      return NextResponse.json({ error: 'Both codes are already locked' }, { status: 400 });
    }

    const needsRefund =
      game.mode === 'cash' &&
      !!game.onChainMatchId &&
      !!game.player2Address;

    if (needsRefund) {
      try {
        await resolveDrawOnChain(
          game.onChainMatchId as `0x${string}`,
          game.player2Address as `0x${string}`,
          0,
          0,
          game.player1Code || '',
          game.player2Code || '',
          'setup-abort',
        );
      } catch (chainErr) {
        if (!isMatchAlreadySettledError(chainErr)) {
          console.error('[abort-setup] resolveDraw failed', gameId, chainErr);
          return NextResponse.json(
            { error: 'Could not refund stake on-chain. Try again in a moment.' },
            { status: 503 },
          );
        }
      }
    }

    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'CANCELLED',
        player1Code: null,
        player2Code: null,
        turnDeadlineAt: null,
      },
    });

    const payload = {
      gameId,
      leaverAddress: normalized,
      reason: reason as string,
    };

    try {
      await pusherServer.trigger(`private-game-${gameId}`, 'setup-aborted', payload);
      const notifyAddresses = [game.player1Address, game.player2Address].filter(Boolean) as string[];
      for (const addr of notifyAddresses) {
        await pusherServer.trigger(`private-user-${addr.toLowerCase()}`, 'setup-aborted', payload);
      }
    } catch (pusherErr) {
      console.error('[abort-setup] Pusher notify failed', pusherErr);
    }

    return NextResponse.json({
      success: true,
      leaverAddress: normalized,
      reason,
      refunded: needsRefund,
    });
  } catch (error) {
    console.error('[abort-setup]', error);
    return NextResponse.json({ error: 'Failed to abort setup' }, { status: 500 });
  }
}
