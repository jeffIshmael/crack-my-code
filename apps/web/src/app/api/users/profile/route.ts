import { NextRequest, NextResponse } from 'next/server';
import { isGuestAddress } from '@/lib/guest';
import { ensureRegisteredUser, normalizeWalletAddress } from '@/lib/user-address';

const isAutoDefaultName = (name?: string | null) => {
  if (!name) return true;
  // Your existing default name pattern in `ensureRegisteredUser()`.
  return name.startsWith('Player_');
};

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

    return NextResponse.json({
      name: user.name ?? null,
      points: user.points ?? 1000,
      needsName: isAutoDefaultName(user.name),
    });
  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}
