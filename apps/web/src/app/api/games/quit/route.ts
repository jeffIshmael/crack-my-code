import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseEventLogs } from 'viem';
import { celo } from 'viem/chains';
import { prisma } from '@/lib/prisma';
import { scoreDeltaForMode } from '@/lib/scoring';
import { applyScoreDelta } from '@/lib/user-points';
import { isRegisteredPlayer } from '@/lib/guest';
import { CONTRACT_ABI } from '../../../../../blockchain/constants';

export const dynamic = 'force-dynamic';

const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
});

export async function POST(req: NextRequest) {
  try {
    const { gameId, address, quitTxHash } = await req.json();

    if (!gameId || !address) {
      return NextResponse.json({ error: 'Missing gameId or address' }, { status: 400 });
    }

    const normalized = address === 'GUEST' ? 'GUEST' : address.toLowerCase();

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status === 'COMPLETED' || game.status === 'CANCELLED') {
      const opponentCode = game.player2Code?.split('').map(Number) ?? null;
      return NextResponse.json({
        success: true,
        alreadyEnded: true,
        winnerAddress: game.winnerAddress,
        opponentCode,
      });
    }

    const isPlayer1 = game.player1Address.toLowerCase() === normalized.toLowerCase();
    const isPlayer2 = game.player2Address?.toLowerCase() === normalized.toLowerCase();

    if (!isPlayer1 && !isPlayer2 && normalized !== 'GUEST') {
      return NextResponse.json({ error: 'Not a participant in this game' }, { status: 403 });
    }

    const isAI = game.mode === 'ai';
    const opponentCode = (isAI ? game.player2Code : isPlayer1 ? game.player2Code : game.player1Code)
      ?.split('')
      .map(Number) ?? null;

    if (isAI) {
      await prisma.game.update({
        where: { id: gameId },
        data: { status: 'COMPLETED', winnerAddress: 'AI' },
      });

      return NextResponse.json({
        success: true,
        winnerAddress: 'AI',
        opponentCode,
        mode: 'ai',
      });
    }

    const opponentAddress = isPlayer1 ? game.player2Address : game.player1Address;
    if (!opponentAddress) {
      await prisma.game.update({
        where: { id: gameId },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.json({ success: true, cancelled: true });
    }

    const mode = game.mode as 'fun' | 'cash';
    const requiresOnChainQuit =
      !!game.onChainMatchId &&
      isRegisteredPlayer(normalized) &&
      game.status === 'ACTIVE';

    if (requiresOnChainQuit) {
      if (!quitTxHash) {
        return NextResponse.json(
          { error: 'quitTxHash required for on-chain matches' },
          { status: 400 },
        );
      }

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: quitTxHash as `0x${string}`,
      });

      if (receipt.status !== 'success') {
        return NextResponse.json({ error: 'Quit transaction failed' }, { status: 400 });
      }

      const abandonedLogs = parseEventLogs({
        abi: CONTRACT_ABI,
        eventName: 'MatchAbandoned',
        logs: receipt.logs,
      });

      if (abandonedLogs.length === 0) {
        return NextResponse.json({ error: 'MatchAbandoned event not found' }, { status: 400 });
      }

      const abandoned = abandonedLogs[0].args;
      const quitter = abandoned.quitter?.toLowerCase();
      const winner = abandoned.winner?.toLowerCase();

      if (abandoned.matchId !== game.onChainMatchId) {
        return NextResponse.json({ error: 'On-chain match id mismatch' }, { status: 400 });
      }

      if (quitter !== normalized) {
        return NextResponse.json({ error: 'Quit tx quitter mismatch' }, { status: 400 });
      }

      if (winner !== opponentAddress.toLowerCase()) {
        return NextResponse.json({ error: 'Quit tx winner mismatch' }, { status: 400 });
      }
    }

    await prisma.game.update({
      where: { id: gameId },
      data: { status: 'COMPLETED', winnerAddress: opponentAddress.toLowerCase() },
    });

    if (isRegisteredPlayer(opponentAddress)) {
      await applyScoreDelta(opponentAddress.toLowerCase(), scoreDeltaForMode(mode, true));
    }
    if (isRegisteredPlayer(normalized)) {
      await applyScoreDelta(normalized, scoreDeltaForMode(mode, false));
    }

    return NextResponse.json({
      success: true,
      winnerAddress: opponentAddress.toLowerCase(),
      opponentCode,
      mode: game.mode,
    });
  } catch (error) {
    console.error('Quit game error:', error);
    return NextResponse.json({ error: 'Failed to quit game' }, { status: 500 });
  }
}
