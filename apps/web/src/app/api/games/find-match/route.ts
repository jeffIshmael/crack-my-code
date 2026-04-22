import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
import { pusherServer } from '@/lib/pusher-server';

export async function POST(req: NextRequest) {
  try {
    const { address, mode, stake, onChainMatchId } = await req.json();

    const isAI = mode === 'ai';
    const effectiveAddress = address || (isAI ? 'GUEST' : null);

    if (!effectiveAddress) {
      return NextResponse.json({ error: 'Wallet connection required for PvP' }, { status: 400 });
    }

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

    // 2. Check for an existing PENDING game of the same mode
    // (For Free matches, we auto-pair. For Cash, we create a challenge for the board).
    if (mode === 'fun') {
      const pendingGame = await prisma.game.findFirst({
        where: {
          status: 'PENDING',
          mode: 'fun',
          player2Address: null,
          player1Address: { not: address }
        }
      });

      if (pendingGame) {
        // MATCH FOUND!
        const updatedGame = await prisma.game.update({
          where: { id: pendingGame.id },
          data: {
            status: 'ACTIVE',
            player2Address: address
          }
        });

        // Notify Player 1 (the creator) via Pusher
        await pusherServer.trigger(`private-user-${pendingGame.player1Address}`, 'match-found', {
          gameId: updatedGame.id,
          opponentAddress: address
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
      const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const code = [];
      for (let i = 0; i < 4; i++) {
        const idx = Math.floor(Math.random() * digits.length);
        code.push(digits.splice(idx, 1)[0]);
      }
      aiCode = code.join('');
    }
    
    const newGame = await (prisma.game as any).create({
      data: {
        userId: user.id, 
        player1Address: address,
        mode: mode,
        stake: parseFloat(stake) || 0,
        onChainMatchId: onChainMatchId,
        status: isAI ? 'ACTIVE' : 'PENDING',
        isPublic: !isAI,
        player2Address: isAI ? 'AI' : null,
        player2Code: aiCode
      }
    });

    if (!isAI) {
       // Broadcast to everyone that a new challenge is on the board
       await pusherServer.trigger('lobby-channel', 'challenge-created', {
         id: newGame.id,
         player1Address: address,
         mode: mode,
         stake: stake
       });
    }

    return NextResponse.json({ 
      status: isAI ? 'matched' : 'searching', 
      gameId: newGame.id 
    });

  } catch (error) {
    console.error('Matchmaking error:', error);
    return NextResponse.json({ error: 'Failed to initiate matchmaking' }, { status: 500 });
  }
}
