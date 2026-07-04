import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scoreDeltaForMode } from '@/lib/scoring';
import { applyScoreDelta } from '@/lib/user-points';
import { isRegisteredPlayer } from '@/lib/guest';
import { recordQuitOnChain, trackGameOnChain } from '../../../../../blockchain/AgentFunctions';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { gameId, address } = await req.json();

    if (!gameId || !address) {
      return NextResponse.json({ error: 'Missing gameId or address' }, { status: 400 });
    }

    const normalized = address === 'GUEST' ? 'GUEST' : address.toLowerCase();

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status === 'COMPLETED' || game.status === 'CANCELLED') {
      const opponentCode = game.player2Code?.split('').map(Number) ?? null;
      return NextResponse.json({
        success: true,
        alreadyEnded: true,
        winnerAddress: game.winnerAddress,
        opponentCode,
      });
    }

    const isPlayer1 = game.player1Address.toLowerCase() === normalized.toLowerCase();
    const isPlayer2 = game.player2Address?.toLowerCase() === normalized.toLowerCase();

    if (!isPlayer1 && !isPlayer2 && normalized !== 'GUEST') {
      return NextResponse.json({ error: 'Not a participant in this game' }, { status: 403 });
    }

    const isAI = game.mode === 'ai';
    const opponentCode = (isAI ? game.player2Code : isPlayer1 ? game.player2Code : game.player1Code)
      ?.split('')
      .map(Number) ?? null;

    if (isAI) {
      await prisma.game.update({
        where: { id: gameId },
        data: { status: 'COMPLETED', winnerAddress: 'AI' },
      });

      void (async () => {
        try {
          await trackGameOnChain(0, true);
        } catch (err) {
          console.error('[Blockchain] Track game on quit failed:', err);
        }
      })();

      return NextResponse.json({
        success: true,
        winnerAddress: 'AI',
        opponentCode,
        mode: 'ai',
      });
    }

    const opponentAddress = isPlayer1 ? game.player2Address : game.player1Address;
    if (!opponentAddress) {
      await prisma.game.update({
        where: { id: gameId },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.json({ success: true, cancelled: true });
    }

    const mode = game.mode as 'fun' | 'cash';
    await prisma.game.update({
      where: { id: gameId },
      data: { status: 'COMPLETED', winnerAddress: opponentAddress.toLowerCase() },
    });

    if (isRegisteredPlayer(opponentAddress)) {
      await applyScoreDelta(opponentAddress.toLowerCase(), scoreDeltaForMode(mode, true));
    }
    if (isRegisteredPlayer(normalized)) {
      await applyScoreDelta(normalized, scoreDeltaForMode(mode, false));
    }

    void (async () => {
      if (game.onChainMatchId && isRegisteredPlayer(normalized)) {
        try {
          await recordQuitOnChain(
            game.onChainMatchId as `0x${string}`,
            normalized as `0x${string}`,
          );
        } catch (err) {
          console.error('[Blockchain] recordQuit failed:', err);
        }
      }
    })();

    return NextResponse.json({
      success: true,
      winnerAddress: opponentAddress.toLowerCase(),
      opponentCode,
      mode: game.mode,
    });
  } catch (error) {
    console.error('Quit game error:', error);
    return NextResponse.json({ error: 'Failed to quit game' }, { status: 500 });
  }
}
