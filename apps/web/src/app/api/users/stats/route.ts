import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isGuestAddress } from '@/lib/guest';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (isGuestAddress(address)) {
      return NextResponse.json({ error: 'Guest accounts are not registered' }, { status: 403 });
    }

    const normalizedAddress = address.toLowerCase();

    let user = await prisma.user.findFirst({
      where: { address: { equals: normalizedAddress, mode: 'insensitive' } },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          address: normalizedAddress,
          name: `Player_${normalizedAddress.slice(2, 6)}`,
          points: 1000,
        },
      });
    }

    return NextResponse.json({ points: user.points ?? 1000 });
  } catch (error) {
    console.error('User stats error:', error);
    return NextResponse.json({ error: 'Failed to load user stats' }, { status: 500 });
  }
}
