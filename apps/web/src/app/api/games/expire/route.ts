import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { expireMatchOnChain } from '../../../../../blockchain/AgentFunctions';
import {
  isMatchAlreadySettledError,
  isNotYetExpiredError,
} from '@/lib/expire-match';

export const dynamic = 'force-dynamic';

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

    // Another path (open-challenges cleanup) may have already expired this game.
    if (game.status === 'EXPIRED') {
      return NextResponse.json({ success: true, status: 'EXPIRED', alreadyExpired: true });
    }

    if (game.status !== 'PENDING') {
      return NextResponse.json({ error: 'Game is not pending' }, { status: 400 });
    }

    // Atomically claim EXPIRED so only one request drives the on-chain call.
    const updated = await prisma.game.updateMany({
      where: { id: gameId, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });

    if (updated.count === 0) {
      const current = await prisma.game.findUnique({ where: { id: gameId } });
      if (current?.status === 'EXPIRED') {
        return NextResponse.json({ success: true, status: 'EXPIRED', alreadyExpired: true });
      }
      return NextResponse.json({ error: 'Game already processed' }, { status: 409 });
    }

    if (game.onChainMatchId) {
      // The contract checks block.timestamp > m.createdAt + matchExpiry.
      // If our 5-minute timer is slightly ahead of the on-chain create timestamp,
      // expireMatch will revert with "CB: not yet expired".
      let onChainSucceeded = false;
      let shouldRevertToPending = false;
      const maxAttempts = 6;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await expireMatchOnChain(game.onChainMatchId as `0x${string}`);
          onChainSucceeded = true;
          break;
        } catch (err) {
          // Chain already expired/cancelled/joined — refund already applied.
          if (isMatchAlreadySettledError(err)) {
            onChainSucceeded = true;
            break;
          }

          if (isNotYetExpiredError(err) && attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 5000));
            continue;
          }

          if (isNotYetExpiredError(err)) {
            shouldRevertToPending = true;
          }

          console.error('[Expire] On-chain expireMatch failed:', err);
          break;
        }
      }

      if (!onChainSucceeded) {
        // Only put back to PENDING when the chain says it is still too early.
        // Never revert on "match not pending" — that wiped a successful refund race.
        if (shouldRevertToPending) {
          await prisma.game.updateMany({
            where: { id: gameId, status: 'EXPIRED' },
            data: { status: 'PENDING' },
          });

          return NextResponse.json(
            { error: 'Match not yet expired on-chain' },
            { status: 425 },
          );
        }

        // Unknown failure: keep EXPIRED so we don't re-list a stuck challenge,
        // but signal the client it may still be finalizing.
        return NextResponse.json(
          { error: 'Failed to expire match on-chain', code: 'EXPIRE_CHAIN_FAILED' },
          { status: 502 },
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
