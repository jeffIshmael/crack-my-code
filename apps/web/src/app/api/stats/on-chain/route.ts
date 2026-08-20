import { NextResponse } from 'next/server';
import { getOnChainAnalytics } from '@/lib/on-chain-analytics';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const analytics = await getOnChainAnalytics();
    return NextResponse.json(analytics, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[api/stats/on-chain]', error);
    return NextResponse.json({ error: 'Failed to load on-chain analytics' }, { status: 500 });
  }
}
