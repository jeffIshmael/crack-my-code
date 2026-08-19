import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** @deprecated Phase 3 — joins require on-chain joinChallenge + confirm-join */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'Direct join is disabled. Sign joinChallenge on-chain and confirm via the app.',
      code: 'ON_CHAIN_REQUIRED',
    },
    { status: 410 },
  );
}
