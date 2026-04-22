import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher-server';

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const socketId = body.get('socket_id') as string;
  const channel = body.get('channel_name') as string;

  // In a real app, you'd check the user's session here
  // For this game, we'll allow joining channels if they have a logic check
  // or just allow it for now since matching is handled by game IDs.

  const authResponse = pusherServer.authenticate(socketId, channel);
  return NextResponse.json(authResponse);
}
