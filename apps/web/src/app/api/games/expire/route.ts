import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { expireMatchOnChain } from '../../../../../blockchain/AgentFunctions';

function isNotYetExpiredError(err: unknown) {
  const msg =
    err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  return msg.toLowerCase().includes('not yet expired');
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

    if (game.status !== 'PENDING') {
      return NextResponse.json({ error: 'Game is not pending' }, { status: 400 });
    }

    if (address) {
      const normalized = address === 'GUEST' ? 'GUEST' : address.toLowerCase();
      if (game.player1Address.toLowerCase() !== normalized.toLowerCase()) {
        return NextResponse.json({ error: 'Not your game' }, { status: 403 });
      }
    }

    // Atomically mark EXPIRED to prevent duplicate on-chain calls
    const updated = await prisma.game.updateMany({
      where: { id: gameId, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Game already processed' }, { status: 409 });
    }

    if (game.onChainMatchId) {
      // The contract checks block.timestamp > m.createdAt + matchExpiry.
      // If our 5-minute timer is slightly ahead of the on-chain create timestamp,
      // expireMatch will revert with "CB: not yet expired".
      // So we retry for a short window before reverting the DB status.
      let onChainSucceeded = false;
      const maxAttempts = 6; // give on-chain time to catch up with our timer
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await expireMatchOnChain(game.onChainMatchId as `0x${string}`);
          onChainSucceeded = true;
          break;
        } catch (err) {
          const notYetExpired = isNotYetExpiredError(err);

          if (notYetExpired && attempt < maxAttempts) {
            // Wait a bit, then retry.
            await new Promise((r) => setTimeout(r, 5000));
            continue;
          }

          console.error('[Expire] On-chain expireMatch failed:', err);
          break;
        }
      }

      if (!onChainSucceeded) {
        // If chain isn't ready yet, keep the DB pending so we can retry later.
        // (If the failure was different, we still leave DB as EXPIRED.)
        await prisma.game.updateMany({
          where: { id: gameId, status: 'EXPIRED' },
          data: { status: 'PENDING' },
        });

        // Signal the frontend it should keep the match "pending".
        return NextResponse.json(
          { error: 'Match not yet expired on-chain' },
          { status: 425 },
        );
      }
    }

    return NextResponse.json({ success: true, status: 'EXPIRED' });
  } catch (error) {
    console.error('Expire game error:', error);
    return NextResponse.json(
      {
        error: 'Failed to expire game',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
