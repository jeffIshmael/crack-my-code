import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
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
    return NextResponse.json({ error: 'Failed to fetch active challenges' }, { status: 500 });
  }
}
