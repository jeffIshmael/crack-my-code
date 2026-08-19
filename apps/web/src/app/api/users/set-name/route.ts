import { NextRequest, NextResponse } from 'next/server';
import { isGuestAddress } from '@/lib/guest';
import { ensureRegisteredUser, normalizeWalletAddress } from '@/lib/user-address';
import { prisma } from '@/lib/prisma';

const normalizeName = (raw: string) => {
  // Trim and collapse repeated whitespace.
  return raw.trim().replace(/\s+/g, ' ');
};

const isValidName = (name: string) => {
  // Not strict/handle-based moderation—just keep it clean for UI.
  if (name.length < 3 || name.length > 20) return false;
  // Allow letters/numbers/space/underscore/dash.
  return /^[a-zA-Z0-9 _-]+$/.test(name);
};

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, name } = body ?? {};

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (isGuestAddress(address)) {
      return NextResponse.json({ error: 'Guest accounts cannot set a name' }, { status: 403 });
    }

    const normalized = normalizeWalletAddress(address);
    const cleaned = normalizeName(name);

    if (!isValidName(cleaned)) {
      return NextResponse.json(
        {
          error: 'Invalid name. Use 3-20 characters: letters/numbers/spaces/underscore/dash.',
        },
        { status: 400 },
      );
    }

    const user = await ensureRegisteredUser(normalized);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: cleaned },
      select: { id: true, name: true },
    });

    return NextResponse.json({ name: updated.name });
  } catch (error) {
    console.error('Set name error:', error);
    return NextResponse.json({ error: 'Failed to set name' }, { status: 500 });
  }
}
