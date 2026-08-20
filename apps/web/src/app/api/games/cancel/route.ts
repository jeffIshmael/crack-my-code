import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher-server';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../../../../../blockchain/constants';

export const dynamic = 'force-dynamic';

const publicClient = createPublicClient({
  chain: celo,
  transport: http(process.env.CELO_RPC_URL ?? 'https://forno.celo.org'),
});

/** MatchStatus: Pending=0, Active=1, … Expired=4 */
async function isOnChainStillPending(matchId: string): Promise<boolean> {
  const m = (await publicClient.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'matches',
    args: [matchId as `0x${string}`],
  })) as { status?: number } & Record<number, unknown>;

  const status = Number(m.status ?? m[6] ?? -1);
  return status === 0;
}

export async function POST(req: NextRequest) {
  try {
    const { gameId, address } = await req.json();

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (address) {
      const normalized = address === 'GUEST' ? 'GUEST' : address.toLowerCase();
      if (game.player1Address.toLowerCase() !== normalized.toLowerCase()) {
        return NextResponse.json({ error: 'Not your game' }, { status: 403 });
      }
    }

    if (game.mode === 'ai' && game.player1Code) {
      return NextResponse.json(
        { error: 'Cannot cancel a Cipher game after your code is locked' },
        { status: 400 },
      );
    }

    if (game.mode !== 'ai' && game.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot cancel an active match' },
        { status: 400 },
      );
    }

    // Already retired by expire/agent — idempotent success for stuck UI.
    if (game.status === 'EXPIRED' || game.status === 'CANCELLED' || game.status === 'COMPLETED') {
      return NextResponse.json({ success: true, alreadyClosed: true });
    }

    // Cash/fun with escrow: refuse DB delete while the on-chain match is still Pending.
    // Client must cancelChallenge / expireMatch first; wallet reject must not orphan stakes.
    if (game.onChainMatchId && (game.mode === 'cash' || game.mode === 'fun')) {
      try {
        const stillPending = await isOnChainStillPending(game.onChainMatchId);
        if (stillPending) {
          return NextResponse.json(
            {
              error:
                'On-chain challenge is still open. Complete the wallet cancel first, then try again.',
            },
            { status: 409 },
          );
        }
      } catch (err) {
        console.error('[cancel] on-chain status check failed', game.id, err);
        return NextResponse.json(
          { error: 'Could not verify on-chain status. Try again.' },
          { status: 503 },
        );
      }
    }

    await prisma.game.delete({
      where: { id: gameId },
    });

    await pusherServer.trigger('lobby-channel', 'challenge-joined', {
      gameId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel challenge error:', error);
    return NextResponse.json(
      {
        error: 'Failed to cancel challenge',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
