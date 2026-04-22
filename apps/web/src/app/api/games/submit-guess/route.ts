import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
import { pusherServer } from '@/lib/pusher-server';
import { evaluateGuess } from '@/lib/game';
import { resolveMatchOnChain } from '../../../../../blockchain/AgentFunctions';

export async function POST(req: NextRequest) {
  try {
    const { gameId, digits, playerAddress } = await req.json();

    if (!gameId || !digits || !playerAddress) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Identify target code (guessing against the OTHER player)
    const opponentCodeStr = game.player1Address === playerAddress 
        ? game.player2Code 
        : game.player1Code;

    if (!opponentCodeStr) {
      return NextResponse.json({ error: 'Opponent has not set their code yet' }, { status: 400 });
    }

    const opponentCode = opponentCodeStr.split('').map(Number);
    const clues = evaluateGuess(digits, opponentCode);

    // Save guess to DB
    await prisma.guess.create({
      data: {
        gameId: gameId,
        isPlayer: game.player1Address === playerAddress,
        digits: digits.join(''),
        clues: JSON.stringify(clues)
      }
    });

    // Notify the opponent
    await pusherServer.trigger(`private-game-${gameId}`, 'opponent-guess', {
      digits,
      clues,
      sender: playerAddress
    });

    const isWin = clues.filter(c => c === 'green').length === 4;
    let revealCode = null;
    let winner = null;

    if (isWin) {
      revealCode = opponentCode;
      winner = playerAddress;
      await prisma.game.update({
        where: { id: gameId },
        data: { status: 'COMPLETED', winnerAddress: playerAddress }
      });

      // --- ON-CHAIN: Resolve Match ---
      if ((game as any).onChainMatchId && game.mode !== 'ai') {
        try {
          const p1GuessCount = await prisma.guess.count({ where: { gameId, isPlayer: true } });
          const p2GuessCount = await prisma.guess.count({ where: { gameId, isPlayer: false } });
          
          await resolveMatchOnChain(
            (game as any).onChainMatchId as `0x${string}`,
            playerAddress as `0x${string}`,
            p1GuessCount,
            p2GuessCount
          );
        } catch (err) {
          console.error('[Blockchain] Resolve failed:', err);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      clues, 
      opponentCode: revealCode,
      winnerAddress: winner
    });
  } catch (error) {
    console.error('Submit guess error:', error);
    return NextResponse.json({ error: 'Failed to sync guess' }, { status: 500 });
  }
}
