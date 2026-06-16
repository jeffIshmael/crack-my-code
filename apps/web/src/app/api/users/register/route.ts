import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isGuestAddress } from '@/lib/guest';
import { ensureUserPointsSynced } from '@/lib/user-points';

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (isGuestAddress(address)) {
      return NextResponse.json({ error: 'Guest accounts are not registered' }, { status: 403 });
    }

    const normalizedAddress = address.toLowerCase();

    const user = await prisma.user.upsert({
      where: { address: normalizedAddress },
      update: {},
      create: {
        address: normalizedAddress,
        name: `Player_${normalizedAddress.slice(2, 6)}`,
        rating: 1000,
        points: 1000
      }
    });

    const synced = await ensureUserPointsSynced(user.id);

    return NextResponse.json(synced ?? user);
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to register user', 
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}
