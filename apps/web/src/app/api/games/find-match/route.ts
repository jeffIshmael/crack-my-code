import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
import { pusherServer } from '@/lib/pusher-server';
import { generateSecretCode } from '@/lib/game';
import { generateJoinCode } from '@/lib/join-code';
import { createGameRecord } from '@/lib/prisma-game';

export async function POST(req: NextRequest) {
  try {
    const { address, mode, stake, onChainMatchId, isPublic = true } = await req.json();

    const isAI = mode === 'ai';
    const rawAddress = address || (isAI ? 'GUEST' : null);

    if (!rawAddress) {
      return NextResponse.json({ error: 'Wallet connection required for PvP' }, { status: 400 });
    }

    const effectiveAddress = rawAddress === 'GUEST' ? 'GUEST' : rawAddress.toLowerCase();

    // 1. Ensure the user exists (Guests use a shared GUEST account)
    const user = await prisma.user.upsert({
      where: { address: effectiveAddress },
      update: {},
      create: { 
        address: effectiveAddress, 
        name: effectiveAddress === 'GUEST' ? 'Anonymous Guest' : `Player_${effectiveAddress.slice(2, 6)}`,
        rating: 1000
      }
    });

    if (effectiveAddress === 'GUEST' && !isAI) {
        return NextResponse.json({ error: 'Guests can only play against AI' }, { status: 403 });
    }

    // 2. Auto-pair public challenges via live matchmaking (not the lobby board)
    if (mode === 'fun' || mode === 'cash') {
      const pendingGame = await prisma.game.findFirst({
        where: {
          status: 'PENDING',
          mode,
          isPublic: true,
          player2Address: null,
          player1Address: { not: effectiveAddress },
          ...(mode === 'cash' ? { stake: parseFloat(stake) || 0 } : {}),
        },
        orderBy: { createdAt: 'asc' },
      });

      if (pendingGame) {
        // MATCH FOUND!
        const updatedGame = await prisma.game.update({
          where: { id: pendingGame.id },
          data: {
            status: 'ACTIVE',
            player2Address: effectiveAddress
          }
        });

        // Notify Player 1 (the creator) via Pusher
        await pusherServer.trigger(`private-user-${pendingGame.player1Address.toLowerCase()}`, 'match-found', {
          gameId: updatedGame.id,
          opponentAddress: effectiveAddress
        });

        return NextResponse.json({ 
          status: 'matched', 
          gameId: updatedGame.id, 
          opponentAddress: pendingGame.player1Address 
        });
      }
    }

    // 3. No match found or it's a Cash game / AI game
    // Create a new PENDING game or an ACTIVE AI game
    
    // Generate AI code if applicable
    let aiCode = null;
    if (isAI) {
      aiCode = generateSecretCode().join('');
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
    
    // Public challenges match via live matchmaking (websocket + DB queue), not the lobby board.
    // Only private (invite) challenges appear in "My Open Challenges".

    return NextResponse.json({ 
      status: isAI ? 'matched' : 'searching', 
      gameId: newGame.id,
      joinCode: newGame.joinCode,
    });

  } catch (error: any) {
    console.error('Matchmaking error:', error);
    return NextResponse.json({ 
      error: 'Failed to initiate matchmaking',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    }, { status: 500 });
  }
}
