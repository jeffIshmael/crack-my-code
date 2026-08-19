import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
import { generateCipherSecretCode } from '@/lib/game';
import { generateJoinCode } from '@/lib/join-code';
import { createGameRecord } from '@/lib/prisma-game';
import { ensureGuestUser, ensureRegisteredUser } from '@/lib/user-address';
import { getCipherDailyStatus } from '@/lib/cipher-daily';
import { isRegisteredPlayer } from '@/lib/guest';
import { isJoinableChallenge } from '@/lib/open-challenges';

export async function POST(req: NextRequest) {
  try {
    const {
      address,
      mode,
      stake,
      onChainMatchId,
      isPublic = true,
      smartWalletAddress,
      seekHost = false,
    } = await req.json();

    const isAI = mode === 'ai';
    const rawAddress = address || (isAI ? 'GUEST' : null);

    if (!rawAddress) {
      return NextResponse.json({ error: 'Wallet connection required for PvP' }, { status: 400 });
    }

    const effectiveAddress = rawAddress === 'GUEST' ? 'GUEST' : rawAddress.toLowerCase();

    if (isAI && isRegisteredPlayer(effectiveAddress)) {
      const daily = await getCipherDailyStatus(effectiveAddress);
      if (daily.atDailyCap) {
        return NextResponse.json(
          {
            error: 'Daily Cipher limit reached. See you tomorrow!',
            code: 'DAILY_CIPHER_CAP',
            gamesPlayedToday: daily.gamesPlayedToday,
          },
          { status: 429 },
        );
      }
    }

    const user =
      effectiveAddress === 'GUEST'
        ? await ensureGuestUser()
        : await ensureRegisteredUser(
            effectiveAddress,
            smartWalletAddress ? String(smartWalletAddress).toLowerCase() : undefined,
          );

    if (effectiveAddress === 'GUEST' && !isAI) {
      return NextResponse.json({ error: 'Guests can only play against AI' }, { status: 403 });
    }

    // Seek an open public host before creating a new on-chain challenge (fun + cash).
    if (
      seekHost &&
      isPublic &&
      (mode === 'fun' || mode === 'cash') &&
      effectiveAddress !== 'GUEST'
    ) {
      const pendingGame = await prisma.game.findFirst({
        where: {
          status: 'PENDING',
          mode,
          isPublic: true,
          player2Address: null,
          onChainMatchId: { not: null },
          player1Address: { not: effectiveAddress },
          ...(mode === 'cash' ? { stake: parseFloat(stake) || 0 } : {}),
        },
        orderBy: { createdAt: 'asc' },
      });

      if (
        pendingGame &&
        isJoinableChallenge(pendingGame, effectiveAddress, {
          mode: mode as 'fun' | 'cash',
          publicOnly: true,
        })
      ) {
        return NextResponse.json({
          status: 'join_available',
          gameId: pendingGame.id,
          opponentAddress: pendingGame.player1Address,
          player1Address: pendingGame.player1Address,
          stake: pendingGame.stake,
          mode: pendingGame.mode,
        });
      }

      return NextResponse.json({ status: 'no_host' });
    }

    if (!isAI && (mode === 'fun' || mode === 'cash') && !onChainMatchId) {
      return NextResponse.json(
        { error: 'On-chain challenge required before opening a match' },
        { status: 400 },
      );
    }

    let aiCode = null;
    if (isAI) {
      aiCode = generateCipherSecretCode().join('');
    }

    let joinCode: string | undefined;
    if (!isAI && !isPublic) {
      joinCode = generateJoinCode();
    }

    const newGame = await createGameRecord({
      userId: user.id,
      player1Address: effectiveAddress,
      mode: mode,
      stake: parseFloat(stake) || 0,
      onChainMatchId: onChainMatchId || null,
      status: isAI ? 'ACTIVE' : 'PENDING',
      isPublic: isAI ? false : isPublic,
      player2Address: isAI ? 'AI' : null,
      player2Code: aiCode,
      ...(joinCode ? { joinCode } : {}),
    });

    return NextResponse.json({
      status: isAI ? 'matched' : 'searching',
      gameId: newGame.id,
      joinCode: newGame.joinCode,
    });
  } catch (error: unknown) {
    console.error('Matchmaking error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initiate matchmaking',
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 },
    );
  }
}
