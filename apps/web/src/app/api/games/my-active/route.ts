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

    const games = await prisma.game.findMany({
      where: {
        player1Address: address,
        status: 'PENDING'
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
