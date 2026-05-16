import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  const where = (address && address !== 'ALL') ? {
    OR: [
      { player1Address: address },
      { player2Address: address }
    ]
  } : {};

  try {
    const games = await prisma.game.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error('Debug API failed:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}
