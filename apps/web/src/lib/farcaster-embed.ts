import { normalizeJoinCodeInput } from '@/lib/join-code';
import {
  APP_BASE_URL,
  FARCASTER_APP_NAME,
  FARCASTER_EMBED_IMAGE,
  FARCASTER_SPLASH,
} from '@/lib/farcaster-config';

export interface FcMiniAppEmbed {
  version: '1';
  imageUrl: string;
  button: {
    title: string;
    action: {
      type: 'launch_miniapp';
      name: string;
      url: string;
      splashImageUrl: string;
      splashBackgroundColor: string;
    };
  };
}

export function isValidJoinCodeFormat(code: string): boolean {
  const normalized = normalizeJoinCodeInput(code);
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(normalized);
}

/** Canonical share URL — Farcaster scrapes this page for the fc:miniapp embed. */
export function buildGameShareUrl(joinCode: string): string {
  const code = normalizeJoinCodeInput(joinCode);
  return `${APP_BASE_URL}/game/${code}`;
}

/** Launch URL opened when a friend taps the embed button. */
export function buildGameLaunchUrl(joinCode: string): string {
  const code = normalizeJoinCodeInput(joinCode);
  return `${APP_BASE_URL}/?game=${encodeURIComponent(code)}`;
}

export function buildDefaultFcMiniAppEmbed(): FcMiniAppEmbed {
  return buildGameFcMiniAppEmbed();
}

export function buildGameFcMiniAppEmbed(joinCode?: string): FcMiniAppEmbed {
  const launchUrl = joinCode ? buildGameLaunchUrl(joinCode) : APP_BASE_URL;
  const buttonTitle = joinCode ? 'Join Challenge' : 'Play Now';

  return {
    version: '1',
    imageUrl: FARCASTER_EMBED_IMAGE,
    button: {
      title: buttonTitle,
      action: {
        type: 'launch_miniapp',
        name: FARCASTER_APP_NAME,
        url: launchUrl,
        splashImageUrl: FARCASTER_SPLASH.imageUrl,
        splashBackgroundColor: FARCASTER_SPLASH.backgroundColor,
      },
    },
  };
}

export function stringifyFcMiniAppEmbed(embed: FcMiniAppEmbed): string {
  return JSON.stringify(embed);
}
