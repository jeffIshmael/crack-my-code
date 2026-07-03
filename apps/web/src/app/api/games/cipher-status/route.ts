import { NextRequest, NextResponse } from 'next/server';
import { getCipherDailyStatus } from '@/lib/cipher-daily';
import { getCipherRewardsToday } from '../../../../../blockchain/AgentFunctions';
import { CIPHER_DAILY_WIN_CAP } from '@/lib/game';
import { isRegisteredPlayer } from '@/lib/guest';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address || !isRegisteredPlayer(address)) {
      return NextResponse.json({
        gamesPlayedToday: 0,
        gamesRemaining: CIPHER_DAILY_WIN_CAP,
        dailyCap: CIPHER_DAILY_WIN_CAP,
        atDailyCap: false,
        rewardWinsToday: 0,
        signedIn: false,
      });
    }

    const normalized = address.toLowerCase();
    const daily = await getCipherDailyStatus(normalized);

    let rewardWinsToday = 0;
    try {
      rewardWinsToday = await getCipherRewardsToday(normalized as `0x${string}`);
    } catch (err) {
      console.error('[cipher-status] on-chain read failed:', err);
    }

    return NextResponse.json({
      ...daily,
      rewardWinsToday: Math.min(rewardWinsToday, CIPHER_DAILY_WIN_CAP),
      signedIn: true,
    });
  } catch (error) {
    console.error('Cipher status error:', error);
    return NextResponse.json({ error: 'Failed to fetch cipher status' }, { status: 500 });
  }
}
