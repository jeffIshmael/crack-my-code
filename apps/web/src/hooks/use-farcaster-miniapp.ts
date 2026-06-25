'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  addMiniAppToClient,
  shareGameInviteToFarcaster,
  subscribeMiniAppAdded,
} from '@/lib/farcaster-client';
import { useMiniAppEnvironment } from '@/hooks/use-mini-app-environment';

export function useFarcasterMiniApp() {
  const { isFarcaster, isReady } = useMiniAppEnvironment();
  const [isAdded, setIsAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (!isFarcaster) return;
    return subscribeMiniAppAdded(() => setIsAdded(true));
  }, [isFarcaster]);

  const promptAddMiniApp = useCallback(async () => {
    if (!isFarcaster || isAdding || isAdded) {
      return { added: false as const };
    }

    setIsAdding(true);
    try {
      const result = await addMiniAppToClient();
      if (result.added) {
        setIsAdded(true);
        toast.success('Added to Farcaster', {
          description: 'Find Crack My Code in your apps list anytime.',
        });
      }
      return result;
    } catch {
      toast.error('Could not add app', {
        description: 'Try again from your production domain inside Warpcast.',
      });
      return { added: false as const };
    } finally {
      setIsAdding(false);
    }
  }, [isFarcaster, isAdding, isAdded]);

  const shareGameInvite = useCallback(
    async (joinCode: string) => {
      if (!isFarcaster || isSharing || !joinCode) return false;

      setIsSharing(true);
      try {
        const shared = await shareGameInviteToFarcaster(joinCode);
        if (shared) {
          toast.success('Cast ready', { description: 'Share your challenge with friends.' });
        }
        return shared;
      } catch {
        toast.error('Share failed', { description: 'Could not open the cast composer.' });
        return false;
      } finally {
        setIsSharing(false);
      }
    },
    [isFarcaster, isSharing],
  );

  return {
    isFarcaster: isFarcaster && isReady,
    isAdded,
    isAdding,
    isSharing,
    promptAddMiniApp,
    shareGameInvite,
  };
}
