import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isGuestAddress, registeredPlayerWhere } from '@/lib/guest';

async function getUserRank(address: string) {
  if (isGuestAddress(address)) return null;

  const user = await prisma.user.findUnique({
    where: { address: address.toLowerCase() },
    select: { address: true, points: true, name: true, createdAt: true },
  });

  if (!user?.address || isGuestAddress(user.address)) return null;

  const userPoints = user.points ?? 1000;

  const ahead = await prisma.user.count({
    where: {
      ...registeredPlayerWhere,
      OR: [
        { points: { gt: userPoints } },
        {
          points: userPoints,
          createdAt: { lt: user.createdAt },
        },
      ],
    },
  });

  return {
    rank: ahead + 1,
    address: user.address,
    name: user.name,
    points: userPoints,
  };
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get('address')?.toLowerCase();

    const users = await prisma.user.findMany({
      where: registeredPlayerWhere,
      orderBy: [{ points: 'desc' }, { createdAt: 'asc' }],
      take: 50,
      select: {
        address: true,
        points: true,
        name: true,
        createdAt: true,
      },
    });

    const seen = new Set<string>();
    const leaderboard = users
      .filter((user) => {
        if (!user.address || isGuestAddress(user.address)) return false;
        const key = user.address.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((user, index) => ({
        rank: index + 1,
        address: user.address!.toLowerCase(),
        name: user.name,
        points: user.points ?? 1000,
      }));

    let viewer = null;
    if (address && !isGuestAddress(address)) {
      const inList = leaderboard.find((e) => e.address.toLowerCase() === address);
      viewer = inList ?? (await getUserRank(address));
    }

    return NextResponse.json({ leaderboard, viewer });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
}
