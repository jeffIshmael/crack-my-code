import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
import { pusherServer } from '@/lib/pusher-server';
import { evaluateGuess, toTileClues, maxGuessesForMode } from '@/lib/game';
import { scoreDeltaForMode } from '@/lib/scoring';
import { applyScoreDelta } from '@/lib/user-points';
import { resolveDrawOnChain, resolveMatchOnChain /*, rewardCipherWinOnChain */ } from '../../../../../blockchain/AgentFunctions';
import { uploadToIPFS } from '@/lib/pinata';
import { isRegisteredPlayer } from '@/lib/guest';
import { findUserByAddress } from '@/lib/user-address';
import { getNextTurnAddress } from '@/lib/turn';

export type CipherRewardPayload =
  | { paid: true; amount: number; txHash: string }
  | { paid: false; reason: string }
  | null;

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
    let cipherReward: CipherRewardPayload = null;

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
      const winDelta = scoreDeltaForMode(isAI ? 'ai' : (game.mode as 'fun' | 'cash'), true);

      if (isRegisteredPlayer(normalizedPlayerAddress)) {
        await applyScoreDelta(normalizedPlayerAddress, winDelta);
      }

      if (!isAI) {
        const opponentAddress = isPlayer1 ? game.player2Address : game.player1Address;
        if (opponentAddress && isRegisteredPlayer(opponentAddress)) {
          const lossDelta = scoreDeltaForMode(game.mode as 'fun' | 'cash', false);
          await applyScoreDelta(opponentAddress.toLowerCase(), lossDelta);
        }
      }

      // --- ON-CHAIN + Pusher: run after response (non-blocking) ---
      void (async () => {
        if (isAI) {
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
          return;
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
      const guessLimit = maxGuessesForMode(game.mode as 'ai' | 'fun' | 'cash');

      if (playerGuessCount >= guessLimit && game.status === 'ACTIVE') {
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
          const opponentGuessCount = isPlayer1 ? p2GuessCount : p1GuessCount;

          // Both players exhausted all guesses without cracking the code → DRAW
          if (opponentGuessCount >= guessLimit) {
            await prisma.game.update({
              where: { id: gameId },
              data: { status: 'COMPLETED', winnerAddress: 'DRAW' },
            });
            winner = 'DRAW';
            // No points awarded or deducted for a draw

            // If this match exists on-chain, finalize draw + refund both stakes
            void (async () => {
              const onChainMatchId = (game as any).onChainMatchId as `0x${string}` | undefined;
              const player2Address = game.player2Address ? (game.player2Address as `0x${string}`) : undefined;
              if (!onChainMatchId || !player2Address) return;
              try {
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
                  winner: 'DRAW',
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

                await resolveDrawOnChain(
                  onChainMatchId,
                  player2Address,
                  p1GuessCount,
                  p2GuessCount,
                  game.player1Code || '',
                  game.player2Code || '',
                  ipfsHash || ''
                );
              } catch (chainErr) {
                console.error('[Blockchain] resolveDrawOnChain failed:', chainErr);
              }
            })();
          } else if (opponentAddress && isRegisteredPlayer(opponentAddress)) {
            // Only this player ran out — opponent wins
            const mode = game.mode as 'fun' | 'cash';
            await prisma.game.update({
              where: { id: gameId },
              data: { status: 'COMPLETED', winnerAddress: opponentAddress },
            });
            winner = opponentAddress;
            await applyScoreDelta(opponentAddress, scoreDeltaForMode(mode, true));
            await applyScoreDelta(normalizedPlayerAddress, scoreDeltaForMode(mode, false));

            // If this match exists on-chain, finalize winner + pay out escrow
            void (async () => {
              const onChainMatchId = (game as any).onChainMatchId as `0x${string}` | undefined;
              const player2Address = game.player2Address ? (game.player2Address as `0x${string}`) : undefined;
              if (!onChainMatchId || !player2Address || !opponentAddress) return;
              try {
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
                  winner: opponentAddress,
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
                  onChainMatchId,
                  opponentAddress as `0x${string}`,
                  player2Address,
                  p1GuessCount,
                  p2GuessCount,
                  game.player1Code || '',
                  game.player2Code || '',
                  ipfsHash || '',
                  guessArray
                );
              } catch (chainErr) {
                console.error('[Blockchain] resolveMatchOnChain failed:', chainErr);
              }
            })();
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

    let playerStats: { points: number } | null = null;
    const gameEnded = isWin || winner !== null;
    if (isRegisteredPlayer(normalizedPlayerAddress) && gameEnded) {
      const updatedUser = await findUserByAddress(normalizedPlayerAddress);
      if (updatedUser) {
        playerStats = { points: updatedUser.points ?? 1000 };
      }
    }

    return NextResponse.json({
      success: true,
      clues,
      tileClues,
      opponentCode: revealCode,
      winnerAddress: winner,
      playerStats,
      cipherReward,
      isYourTurn: false,
      nextTurnAddress,
    });
  } catch (error) {
    console.error('Submit guess error:', error);
    return NextResponse.json({ error: 'Failed to sync guess' }, { status: 500 });
  }
}

 
