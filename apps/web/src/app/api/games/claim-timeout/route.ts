import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher-server';
import { scoreDeltaForMode } from '@/lib/scoring';
import { applyScoreDelta } from '@/lib/user-points';
import { isRegisteredPlayer } from '@/lib/guest';
import { getNextTurnAddress } from '@/lib/turn';
import { isTurnDeadlineClaimable } from '@/lib/turn-deadline';
import { recordQuitOnChain } from '../../../../../blockchain/AgentFunctions';
import { isMatchAlreadySettledError } from '@/lib/expire-match';

export const dynamic = 'force-dynamic';

/**
 * Claim a PvP turn-timer forfeit. Server-authoritative: requires
 * now >= turnDeadlineAt + grace. Staller loses; opponent wins (quit semantics).
 */
export async function POST(req: NextRequest) {
  try {
    const { gameId, address } = await req.json();

    if (!gameId || !address) {
      return NextResponse.json({ error: 'Missing gameId or address' }, { status: 400 });
    }

    const normalized = address === 'GUEST' ? 'GUEST' : address.toLowerCase();

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        guesses: { select: { isPlayer: true } },
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const isPlayer1 = game.player1Address.toLowerCase() === normalized.toLowerCase();
    const isPlayer2 = game.player2Address?.toLowerCase() === normalized.toLowerCase();

    if (!isPlayer1 && !isPlayer2 && normalized !== 'GUEST') {
      return NextResponse.json({ error: 'Not a participant in this game' }, { status: 403 });
    }

    if (game.mode === 'ai') {
      return NextResponse.json({ error: 'Turn timer does not apply to Cipher' }, { status: 400 });
    }

    if (game.status === 'COMPLETED' || game.status === 'CANCELLED') {
      const opponentCodeStr = isPlayer1 ? game.player2Code : game.player1Code;
      const opponentCode = opponentCodeStr?.split('').map(Number) ?? null;
      return NextResponse.json({
        success: true,
        alreadyEnded: true,
        endedByQuit: game.endedByQuit === true,
        reason: 'timeout',
        winnerAddress: game.winnerAddress,
        opponentCode,
      });
    }

    if (game.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
    }

    if (!game.turnDeadlineAt) {
      return NextResponse.json({ error: 'No turn deadline set' }, { status: 400 });
    }

    if (!isTurnDeadlineClaimable(game.turnDeadlineAt)) {
      return NextResponse.json(
        {
          error: 'Turn timer has not expired yet',
          turnDeadlineAt: game.turnDeadlineAt.toISOString(),
          serverNow: new Date().toISOString(),
        },
        { status: 425 },
      );
    }

    const p1GuessCount = game.guesses.filter((g) => g.isPlayer).length;
    const p2GuessCount = game.guesses.filter((g) => !g.isPlayer).length;
    const turnAddress = getNextTurnAddress(
      game.player1Address,
      game.player2Address,
      p1GuessCount,
      p2GuessCount,
    );

    if (!turnAddress) {
      return NextResponse.json({ error: 'No active turn to forfeit' }, { status: 400 });
    }

    const quitterAddress = turnAddress.toLowerCase();
    const opponentAddress =
      quitterAddress === game.player1Address.toLowerCase()
        ? game.player2Address
        : game.player1Address;

    if (!opponentAddress) {
      return NextResponse.json({ error: 'Opponent missing' }, { status: 400 });
    }

    const winnerAddress = opponentAddress.toLowerCase();
    const mode = game.mode as 'fun' | 'cash';

    // Cash: settle on-chain via backend recordQuit (no staller signature needed).
    if (game.onChainMatchId && mode === 'cash') {
      try {
        await recordQuitOnChain(
          game.onChainMatchId as `0x${string}`,
          quitterAddress as `0x${string}`,
        );
      } catch (err) {
        if (!isMatchAlreadySettledError(err)) {
          console.error('[claim-timeout] recordQuit failed', gameId, err);
          return NextResponse.json(
            {
              error: 'On-chain forfeit failed. Try again.',
              details: err instanceof Error ? err.message : String(err),
            },
            { status: 502 },
          );
        }
      }
    }

    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'COMPLETED',
        winnerAddress,
        endedByQuit: true,
        turnDeadlineAt: null,
      },
    });

    if (isRegisteredPlayer(winnerAddress)) {
      await applyScoreDelta(winnerAddress, scoreDeltaForMode(mode, true));
    }
    if (isRegisteredPlayer(quitterAddress)) {
      await applyScoreDelta(quitterAddress, scoreDeltaForMode(mode, false));
    }

    const winnerCode =
      winnerAddress === game.player1Address.toLowerCase()
        ? game.player1Code
        : game.player2Code;
    const winnerCodeDigits = winnerCode?.split('').map(Number) ?? null;

    const quitterCode =
      quitterAddress === game.player1Address.toLowerCase()
        ? game.player1Code
        : game.player2Code;
    const quitterCodeDigits = quitterCode?.split('').map(Number) ?? null;

    try {
      await pusherServer.trigger(`private-game-${gameId}`, 'match-ended', {
        reason: 'timeout',
        winnerAddress,
        quitterAddress,
        // Each client should call /reveal for their view; include both for convenience.
        opponentCode: winnerCodeDigits,
        quitterCode: quitterCodeDigits,
      });
    } catch (pusherErr) {
      console.error('[Pusher] match-ended (timeout) failed:', pusherErr);
    }

    // Code the requesting player should see (what they were guessing / opponent's secret).
    const forRequester = isPlayer1 ? game.player2Code : game.player1Code;
    const opponentCode = forRequester?.split('').map(Number) ?? null;

    return NextResponse.json({
      success: true,
      reason: 'timeout',
      endedByQuit: true,
      winnerAddress,
      quitterAddress,
      opponentCode,
    });
  } catch (error) {
    console.error('Claim timeout error:', error);
    return NextResponse.json({ error: 'Failed to claim turn timeout' }, { status: 500 });
  }
}
