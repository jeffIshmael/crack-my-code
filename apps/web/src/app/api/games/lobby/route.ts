import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findGameByJoinInput } from '@/lib/game-lookup';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const joinCode = searchParams.get('joinCode');

    if (joinCode) {
      const game = await findGameByJoinInput(joinCode);
      return NextResponse.json(game);
    }

    if (id) {
      const game = await findGameByJoinInput(id);
      return NextResponse.json(game);
    }

    const games = await prisma.game.findMany({
      where: {
        status: 'PENDING',
        isPublic: true,
        player2Address: null
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error('Fetch lobby error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch active challenges', 
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}
