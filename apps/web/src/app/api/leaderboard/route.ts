import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { address: { not: null } },
      orderBy: [{ points: 'desc' }, { rating: 'desc' }],
      take: 50,
      select: {
        address: true,
        points: true,
        name: true,
        rating: true,
      },
    });

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      address: user.address!,
      name: user.name,
      points: user.points,
      rating: user.rating,
    }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
}
