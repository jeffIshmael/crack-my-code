import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { gameId, address } = await req.json();

    if (!gameId || !address) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Only allow revealing if game is COMPLETED
    if (game.status !== 'COMPLETED') {
        return NextResponse.json({ error: 'Game is not completed' }, { status: 403 });
    }

    // Return the code that the requesting user was trying to guess
    const opponentCodeStr = game.player1Address === address 
        ? game.player2Code 
        : game.player1Code;

    if (!opponentCodeStr) {
      return NextResponse.json({ error: 'Opponent code not found' }, { status: 404 });
    }

    const opponentCode = opponentCodeStr.split('').map(Number);
    
    return NextResponse.json({ 
      success: true, 
      opponentCode
    });
  } catch (error) {
    console.error('Reveal code error:', error);
    return NextResponse.json({ error: 'Failed to reveal code' }, { status: 500 });
  }
}
