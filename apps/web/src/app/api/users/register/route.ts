import { NextRequest, NextResponse } from 'next/server';
import { isGuestAddress } from '@/lib/guest';
import { ensureRegisteredUser, normalizeWalletAddress } from '@/lib/user-address';

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (isGuestAddress(address)) {
      return NextResponse.json({ error: 'Guest accounts are not registered' }, { status: 403 });
    }

    const user = await ensureRegisteredUser(normalizeWalletAddress(address));

    return NextResponse.json({ ...user, points: user.points ?? 1000 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        error: 'Failed to register user',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
