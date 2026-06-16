import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
import { pusherServer } from '@/lib/pusher-server';
import { evaluateGuess, toTileClues, MAX_GUESSES } from '@/lib/game';
import { scoreDeltaForMode } from '@/lib/scoring';
import { applyScoreDelta, ensureUserPointsSynced } from '@/lib/user-points';
import { resolveMatchOnChain, trackGameOnChain } from '../../../../../blockchain/AgentFunctions';
import { uploadToIPFS } from '@/lib/pinata';
import { isRegisteredPlayer } from '@/lib/guest';
import { getNextTurnAddress } from '@/lib/turn';

export async function POST(req: NextRequest) {
  try {
    const { gameId, digits, playerAddress } = await req.json();

    if (!gameId || !digits || !playerAddress) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const normalizedPlayerAddress = playerAddress === 'GUEST' ? 'GUEST' : playerAddress.toLowerCase();

    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Identify target code (guessing against the OTHER player)
    const isPlayer1 = game.player1Address.toLowerCase() === normalizedPlayerAddress.toLowerCase();
    const opponentCodeStr = isPlayer1
      ? game.player2Code
      : game.player1Code;

    if (!opponentCodeStr) {
      return NextResponse.json({ error: 'Opponent has not set their code yet' }, { status: 400 });
    }

    const opponentCode = opponentCodeStr.split('').map(Number);
    const clues = evaluateGuess(digits, opponentCode);
    const tileClues = toTileClues(digits, opponentCode);

    // Save guess to DB
    await prisma.guess.create({
      data: {
        gameId: gameId,
        isPlayer: isPlayer1,
        digits: digits.join(''),
        clues: JSON.stringify({ clues, tileClues })
      }
    });



    const isWin = clues.filter(c => c === 'green').length === 4;
    let revealCode = null;
    let winner = null;

    const p1GuessCount = await prisma.guess.count({
      where: { gameId, isPlayer: true },
    });
    const p2GuessCount = await prisma.guess.count({
      where: { gameId, isPlayer: false },
    });
    const nextTurnAddress = getNextTurnAddress(
      game.player1Address,
      game.player2Address,
      p1GuessCount,
      p2GuessCount,
    );

    if (isWin) {
      revealCode = opponentCode;
      winner = normalizedPlayerAddress;
      await prisma.game.update({
        where: { id: gameId },
        data: { status: 'COMPLETED', winnerAddress: normalizedPlayerAddress }
      });

      const isAI = game.mode === 'ai';
      const deltas = scoreDeltaForMode(isAI ? 'ai' : (game.mode as 'fun' | 'cash'), true);

      if (isRegisteredPlayer(normalizedPlayerAddress)) {
        await applyScoreDelta(normalizedPlayerAddress, deltas);
      }

      if (!isAI) {
        const opponentAddress = isPlayer1 ? game.player2Address : game.player1Address;
        if (opponentAddress && isRegisteredPlayer(opponentAddress)) {
          const loss = scoreDeltaForMode(game.mode as 'fun' | 'cash', false);
          await applyScoreDelta(opponentAddress.toLowerCase(), loss);
        }
      }

      // --- ON-CHAIN + Pusher: run after response (non-blocking) ---
      void (async () => {
        try {
          const matchType = game.mode === 'cash' ? 1 : 0;
          await trackGameOnChain(matchType, isAI);
        } catch (trackErr) {
          console.error('[Blockchain] Track game on-chain failed:', trackErr);
        }

        if ((game as any).onChainMatchId && game.mode !== 'ai') {
          try {
            const p1GuessCount = await prisma.guess.count({ where: { gameId, isPlayer: true } });
            const p2GuessCount = await prisma.guess.count({ where: { gameId, isPlayer: false } });

            const allGuesses = await prisma.guess.findMany({
              where: { gameId },
              orderBy: { createdAt: 'asc' },
            });
            const guessArray = allGuesses.map((g: { digits: string }) => g.digits);

            const ipfsHash = await uploadToIPFS({
              gameId,
              player1: game.player1Address,
              player2: game.player2Address,
              player1Code: game.player1Code,
              player2Code: game.player2Code,
              winner: playerAddress,
              guesses: allGuesses.map((g) => ({
                digits: g.digits,
                clues: (() => {
                  const parsed = JSON.parse(g.clues);
                  return Array.isArray(parsed) ? parsed : parsed.clues;
                })(),
                isPlayer: g.isPlayer,
                createdAt: g.createdAt,
              })),
            });

            await resolveMatchOnChain(
              (game as any).onChainMatchId as `0x${string}`,
              playerAddress as `0x${string}`,
              (game.player2Address || '') as `0x${string}`,
              p1GuessCount,
              p2GuessCount,
              game.player1Code || '',
              game.player2Code || '',
              ipfsHash || '',
              guessArray,
            );
          } catch (err) {
            console.error('[Blockchain] Resolve failed:', err);
          }
        }

        try {
          await pusherServer.trigger(`private-game-${gameId}`, 'opponent-guess', {
            digits,
            clues,
            tileClues,
            sender: normalizedPlayerAddress,
            nextTurnAddress,
            revealCode: isWin ? opponentCode : undefined,
          });
        } catch (pusherErr) {
          console.error('[Pusher] opponent-guess failed:', pusherErr);
        }
      })();
    } else {
      const playerGuessCount = isPlayer1 ? p1GuessCount : p2GuessCount;

      if (playerGuessCount >= MAX_GUESSES && game.status === 'ACTIVE') {
        const isAI = game.mode === 'ai';
        revealCode = opponentCode;

        if (isAI) {
          await prisma.game.update({
            where: { id: gameId },
            data: { status: 'COMPLETED', winnerAddress: 'AI' },
          });
          winner = 'AI';
        } else {
          const opponentAddress = (isPlayer1 ? game.player2Address : game.player1Address)?.toLowerCase();
          if (opponentAddress && isRegisteredPlayer(opponentAddress)) {
            const mode = game.mode as 'fun' | 'cash';
            await prisma.game.update({
              where: { id: gameId },
              data: { status: 'COMPLETED', winnerAddress: opponentAddress },
            });
            winner = opponentAddress;
            await applyScoreDelta(opponentAddress, scoreDeltaForMode(mode, true));
            await applyScoreDelta(normalizedPlayerAddress, scoreDeltaForMode(mode, false));
          }
        }
      }
    }

    if (!isWin) {
      try {
        await pusherServer.trigger(`private-game-${gameId}`, 'opponent-guess', {
          digits,
          clues,
          tileClues,
          sender: normalizedPlayerAddress,
          nextTurnAddress,
        });
      } catch (pusherErr) {
        console.error('[Pusher] opponent-guess failed:', pusherErr);
      }
    }

    let playerStats: { points: number; rating: number } | null = null;
    const gameEnded = isWin || winner !== null;
    if (isRegisteredPlayer(normalizedPlayerAddress) && gameEnded) {
      const updatedUser = await prisma.user.findFirst({
        where: {
          address: { equals: normalizedPlayerAddress, mode: 'insensitive' },
        },
      });
      if (updatedUser) {
        const synced = await ensureUserPointsSynced(updatedUser.id);
        playerStats = {
          points: synced?.points ?? updatedUser.points,
          rating: synced?.rating ?? updatedUser.rating,
        };
      }
    }

    return NextResponse.json({
      success: true,
      clues,
      tileClues,
      opponentCode: revealCode,
      winnerAddress: winner,
      playerStats,
      isYourTurn: false,
      nextTurnAddress,
    });
  } catch (error) {
    console.error('Submit guess error:', error);
    return NextResponse.json({ error: 'Failed to sync guess' }, { status: 500 });
  }
}

 
