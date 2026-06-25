import { sdk } from '@farcaster/miniapp-sdk';
import { buildGameShareUrl } from '@/lib/farcaster-embed';

export type AddMiniAppResult = {
  added: boolean;
  notificationDetails?: { url: string; token: string };
};

export async function addMiniAppToClient(): Promise<AddMiniAppResult> {
  try {
    const result = await sdk.actions.addMiniApp();
    return {
      added: true,
      notificationDetails: result.notificationDetails,
    };
  } catch (error) {
    console.error('addMiniApp failed:', error);
    throw error;
  }
}

export async function shareGameInviteToFarcaster(joinCode: string): Promise<boolean> {
  const shareUrl = buildGameShareUrl(joinCode);
  const text = `Challenge me in Crack My Code! 🎯\nGame ID: ${joinCode}`;

  const result = await sdk.actions.composeCast({
    text,
    embeds: [shareUrl],
  });

  return result?.cast != null;
}

export function subscribeMiniAppAdded(onAdded: () => void): () => void {
  sdk.on('miniAppAdded', onAdded);
  return () => {
    sdk.off('miniAppAdded', onAdded);
  };
}
