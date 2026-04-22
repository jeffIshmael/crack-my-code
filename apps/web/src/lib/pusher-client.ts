import PusherClient from 'pusher-js';

export const pusherClient = typeof window !== 'undefined' 
  ? new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher/auth',
      }
    )
  : { subscribe: () => ({ bind: () => {}, unbind: () => {} }), unsubscribe: () => {}, channel: () => null } as any;
