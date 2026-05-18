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
          { player1Address: normalizedAddress, status: { in: ['PENDING', 'ACTIVE'] } },
          { player2Address: normalizedAddress, status: 'ACTIVE' }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error('Fetch my active challenges error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch your active challenges', 
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}
