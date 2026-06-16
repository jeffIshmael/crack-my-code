import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isGuestAddress } from '@/lib/guest';
import { applyScoreDelta } from '@/lib/user-points';

export async function POST(req: NextRequest) {
  try {
    const { address, pointsDelta, ratingDelta } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (isGuestAddress(address)) {
      return NextResponse.json({ error: 'Guest accounts cannot earn CMC points' }, { status: 403 });
    }

    const normalizedAddress = address.toLowerCase();
    const delta = pointsDelta ?? ratingDelta ?? 0;

    await applyScoreDelta(normalizedAddress, delta);

    const user = await prisma.user.findFirst({
      where: {
        address: {
          equals: normalizedAddress,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Update points error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update points',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
