import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isGuestAddress, registeredPlayerWhere } from '@/lib/guest';
import { findUserByAddress, normalizeWalletAddress } from '@/lib/user-address';

async function getUserRank(address: string) {
  if (isGuestAddress(address)) return null;

  const normalized = normalizeWalletAddress(address);
  const user = await findUserByAddress(normalized);

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
    address: normalized,
    name: user.name,
    points: userPoints,
  };
}

export async function GET(req: NextRequest) {
  try {
    const addressParam = req.nextUrl.searchParams.get('address');
    const address = addressParam ? normalizeWalletAddress(addressParam) : null;

    const users = await prisma.user.findMany({
      where: registeredPlayerWhere,
      orderBy: [{ points: 'desc' }, { createdAt: 'asc' }],
      take: 50,
      select: {
        address: true,
        smartWalletAddress: true,
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
        const smartKey = user.smartWalletAddress?.toLowerCase();
        if (seen.has(key) || (smartKey && seen.has(smartKey))) return false;
        seen.add(key);
        if (smartKey) seen.add(smartKey);
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
      const inList = leaderboard.find(
        (e) => e.address === address
      );
      if (!inList) {
        // Also check if the viewer's address matches any entry's smartWalletAddress
        const bySmartMatch = users.find(
          (u) => u.smartWalletAddress?.toLowerCase() === address
        );
        if (bySmartMatch) {
          const matchAddr = bySmartMatch.address!.toLowerCase();
          viewer = leaderboard.find((e) => e.address === matchAddr) ?? null;
        }
      }
      if (!viewer && !inList) {
        viewer = await getUserRank(address);
      } else if (!viewer) {
        viewer = inList;
      }
    }

    return NextResponse.json({ leaderboard, viewer });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
}
