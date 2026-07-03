/** Public app URL — must match the hosted Farcaster manifest domain. */
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'https://crack-my-code.vercel.app';

export const FARCASTER_APP_NAME = 'Crack-My-Code';

export const FARCASTER_SPLASH = {
  imageUrl: `${APP_BASE_URL}/splash.png`,
  backgroundColor: '#4ab8e8',
} as const;

/** 3:2 full-bleed logo for Farcaster feed embeds (min 600×400). */
export const FARCASTER_EMBED_IMAGE = `${APP_BASE_URL}/embed.png`;
