import { NextRequest, NextResponse } from 'next/server';
import { isGuestAddress } from '@/lib/guest';
import { ensureRegisteredUser, normalizeWalletAddress } from '@/lib/user-address';

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

    const user = await ensureRegisteredUser(normalizeWalletAddress(address));

    return NextResponse.json({ points: user.points ?? 1000 });
  } catch (error) {
    console.error('User stats error:', error);
    return NextResponse.json({ error: 'Failed to load user stats' }, { status: 500 });
  }
}
