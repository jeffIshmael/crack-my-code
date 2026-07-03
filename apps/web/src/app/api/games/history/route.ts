import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    const aliasesParam = searchParams.get('aliases');

    if (!address && !aliasesParam) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const aliases = (aliasesParam || address || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    const games = await prisma.game.findMany({
      where: {
        OR: aliases.flatMap((alias) => [
          { player1Address: alias },
          { player2Address: alias },
        ]),
        status: 'COMPLETED',
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 20,
      select: {
        id: true,
        mode: true,
        stake: true,
        winnerAddress: true,
        player1Address: true,
        player2Address: true,
        cipherRewardPaid: true,
        cipherRewardAmount: true,
        cipherRewardTxHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error('Fetch game history error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch your game history',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
