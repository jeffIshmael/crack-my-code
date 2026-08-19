import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseStoredGuess } from '@/lib/guess-parse';
import { isPlayersTurn } from '@/lib/turn';
import { isWinningClues } from '@/lib/game';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('id');
    const address = searchParams.get('address');

    if (!gameId || !address) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const normalizedAddress =
      address === 'GUEST' ? 'GUEST' : address.toLowerCase();

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        guesses: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const isPlayer1 =
      game.player1Address.toLowerCase() === normalizedAddress.toLowerCase();
    const isPlayer2 =
      game.player2Address?.toLowerCase() === normalizedAddress.toLowerCase();

    if (!isPlayer1 && !isPlayer2 && normalizedAddress !== 'GUEST') {
      return NextResponse.json({ error: 'Not a player in this game' }, { status: 403 });
    }

    const p1Guesses = game.guesses.filter((g) => g.isPlayer);
    const p2Guesses = game.guesses.filter((g) => !g.isPlayer);

    const playerGuessesRaw = isPlayer1 ? p1Guesses : p2Guesses;
    const opponentGuessesRaw = isPlayer1 ? p2Guesses : p1Guesses;

    const playerGuesses = playerGuessesRaw.map(parseStoredGuess);
    const opponentGuesses = opponentGuessesRaw.map(parseStoredGuess);

    const isYourTurn =
      game.status === 'ACTIVE' &&
      isPlayersTurn(
        normalizedAddress,
        game.player1Address,
        game.player2Address,
        p1Guesses.length,
        p2Guesses.length,
      );

    let result: 'win' | 'lose' | 'draw' | null = null;
    let opponentCode: number[] | null = null;
    if (game.status === 'COMPLETED' && game.winnerAddress) {
      const winner = game.winnerAddress.toLowerCase();
      if (winner === 'draw') {
        result = 'draw';
      } else if (winner === 'ai') {
        result = 'lose';
      } else if (winner === normalizedAddress.toLowerCase()) {
        result = 'win';
      } else {
        result = 'lose';
      }

      const opponentCodeStr = isPlayer1 ? game.player2Code : game.player1Code;
      if (opponentCodeStr) {
        opponentCode = opponentCodeStr.split('').map(Number);
      }
    } else {
      const lastOpponentGuess = opponentGuessesRaw[opponentGuessesRaw.length - 1];
      if (lastOpponentGuess) {
        const parsed = parseStoredGuess(lastOpponentGuess);
        if (isWinningClues(parsed.clues)) {
          result = 'lose';
        }
      }
      const lastPlayerGuess = playerGuessesRaw[playerGuessesRaw.length - 1];
      if (lastPlayerGuess) {
        const parsed = parseStoredGuess(lastPlayerGuess);
        if (isWinningClues(parsed.clues)) {
          result = 'win';
        }
      }
    }

    return NextResponse.json({
      success: true,
      status: game.status,
      isYourTurn,
      playerGuesses,
      opponentGuesses,
      opponentGuessCount: opponentGuesses.length,
      winnerAddress: game.winnerAddress,
      result,
      opponentCode,
    });
  } catch (error) {
    console.error('Game sync error:', error);
    return NextResponse.json({ error: 'Failed to sync game' }, { status: 500 });
  }
}
