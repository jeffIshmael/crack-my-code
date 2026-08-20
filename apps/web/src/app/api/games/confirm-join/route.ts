import { createPublicClient, http, parseEventLogs } from 'viem';
import { celo } from 'viem/chains';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher-server';
import { CONTRACT_ABI } from '../../../../../blockchain/constants';

export const dynamic = 'force-dynamic';

const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
});

export async function POST(req: NextRequest) {
  try {
    const { gameId, address, joinTxHash } = await req.json();

    if (!gameId || !address || !joinTxHash) {
      return NextResponse.json(
        { error: 'Missing gameId, address, or joinTxHash' },
        { status: 400 },
      );
    }

    const joiner = address.toLowerCase();

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.mode !== 'cash' && game.mode !== 'fun') {
      return NextResponse.json({ error: 'Confirm-join is for PvP games only' }, { status: 400 });
    }

    if (!game.onChainMatchId) {
      return NextResponse.json({ error: 'Game has no on-chain match id' }, { status: 400 });
    }

    if (game.player1Address.toLowerCase() === joiner) {
      return NextResponse.json({ error: 'Cannot join your own challenge' }, { status: 400 });
    }

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: joinTxHash as `0x${string}`,
    });

    if (receipt.status !== 'success') {
      return NextResponse.json({ error: 'Join transaction failed' }, { status: 400 });
    }

    const joinedLogs = parseEventLogs({
      abi: CONTRACT_ABI,
      eventName: 'ChallengeJoined',
      logs: receipt.logs,
    });

    if (joinedLogs.length === 0) {
      return NextResponse.json({ error: 'ChallengeJoined event not found' }, { status: 400 });
    }

    const joined = joinedLogs[0].args;
    const challenger = joined.challenger?.toLowerCase();
    const opponent = joined.opponent?.toLowerCase();

    if (challenger !== game.player1Address.toLowerCase()) {
      return NextResponse.json({ error: 'Join tx challenger mismatch' }, { status: 400 });
    }

    if (opponent !== joiner) {
      return NextResponse.json({ error: 'Join tx opponent mismatch' }, { status: 400 });
    }

    if (game.onChainMatchId && joined.matchId !== game.onChainMatchId) {
      return NextResponse.json({ error: 'On-chain match id mismatch' }, { status: 400 });
    }

    const updated = await prisma.game.updateMany({
      where: {
        id: gameId,
        status: 'PENDING',
        player2Address: null,
      },
      data: {
        status: 'ACTIVE',
        player2Address: joiner,
        joinReservedBy: null,
        joinReservedUntil: null,
      },
    });

    if (updated.count === 0) {
      const current = await prisma.game.findUnique({ where: { id: gameId } });
      if (current?.status === 'ACTIVE' && current.player2Address?.toLowerCase() === joiner) {
        return NextResponse.json({
          status: 'matched',
          gameId: current.id,
          joinCode: current.joinCode,
          opponentAddress: current.player1Address,
          alreadyJoined: true,
        });
      }
      return NextResponse.json(
        { error: 'Someone else joined first', code: 'ALREADY_TAKEN' },
        { status: 409 },
      );
    }

    await pusherServer.trigger(
      `private-user-${game.player1Address.toLowerCase()}`,
      'match-found',
      {
        gameId: game.id,
        opponentAddress: joiner,
        mode: game.mode,
        stake: game.stake,
      },
    );

    await pusherServer.trigger('lobby-channel', 'challenge-joined', { gameId: game.id });

    return NextResponse.json({
      status: 'matched',
      gameId: game.id,
      joinCode: game.joinCode,
      opponentAddress: game.player1Address,
    });
  } catch (error) {
    console.error('[confirm-join]', error);
    return NextResponse.json({ error: 'Failed to confirm join' }, { status: 500 });
  }
}
