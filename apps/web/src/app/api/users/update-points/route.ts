import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { address, ratingDelta, pointsDelta } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    // Ensure we don't go below 0 for points or rating
    const currentUser = await prisma.user.findFirst({
      where: {
        address: {
          equals: normalizedAddress,
          mode: 'insensitive'
        }
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newRating = Math.max(0, (currentUser.rating || 1000) + (ratingDelta || 0));
    const newPoints = Math.max(0, (currentUser.points || 1000) + (pointsDelta || 0));

    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        rating: newRating,
        points: newPoints
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Update points error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update points', 
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}
