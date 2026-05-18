import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    const games = await prisma.game.findMany({
      where: {
        OR: [
          { player1Address: normalizedAddress },
          { player2Address: normalizedAddress }
        ],
        status: 'COMPLETED'
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error('Fetch game history error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch your game history', 
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}
