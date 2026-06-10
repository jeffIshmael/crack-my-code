import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function getUserRank(address: string) {
  const user = await prisma.user.findUnique({
    where: { address: address.toLowerCase() },
    select: { address: true, points: true, name: true, rating: true },
  });

  if (!user?.address) return null;

  const ahead = await prisma.user.count({
    where: {
      address: { not: null },
      OR: [
        { points: { gt: user.points } },
        {
          points: user.points,
          rating: { gt: user.rating },
        },
      ],
    },
  });

  return {
    rank: ahead + 1,
    address: user.address,
    name: user.name,
    points: user.points,
    rating: user.rating,
  };
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get('address')?.toLowerCase();

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

    const seen = new Set<string>();
    const leaderboard = users
      .filter((user) => {
        if (!user.address) return false;
        const key = user.address.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((user, index) => ({
        rank: index + 1,
        address: user.address!.toLowerCase(),
        name: user.name,
        points: user.points,
        rating: user.rating,
      }));

    let viewer = null;
    if (address) {
      const inList = leaderboard.find((e) => e.address.toLowerCase() === address);
      viewer = inList ?? (await getUserRank(address));
    }

    return NextResponse.json({ leaderboard, viewer });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
}
