'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { toast } from 'sonner';
import {
  addMiniAppToClient,
  shareGameInviteToFarcaster,
  subscribeMiniAppAdded,
} from '@/lib/farcaster-client';
import { useMiniAppEnvironment } from '@/hooks/use-mini-app-environment';

const ADDED_STORAGE_KEY = 'cmc_farcaster_miniapp_added';
const PROMPTED_SESSION_KEY = 'cmc_farcaster_add_prompted';

function readAddedFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ADDED_STORAGE_KEY) === 'true';
}

function hasPromptedThisSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(PROMPTED_SESSION_KEY) === 'true';
}

function markPromptedThisSession(): void {
  sessionStorage.setItem(PROMPTED_SESSION_KEY, 'true');
}

function persistAdded(): void {
  localStorage.setItem(ADDED_STORAGE_KEY, 'true');
}

type FarcasterMiniAppContextValue = {
  isFarcaster: boolean;
  isSharing: boolean;
  shareGameInvite: (joinCode: string) => Promise<boolean>;
};

const FarcasterMiniAppContext = createContext<FarcasterMiniAppContextValue | null>(null);

export function FarcasterMiniAppProvider({ children }: { children: React.ReactNode }) {
  const { isFarcaster, isReady } = useMiniAppEnvironment();
  const [isAdded, setIsAdded] = useState(readAddedFromStorage);
  const [isAdding, setIsAdding] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const markAdded = useCallback(() => {
    persistAdded();
    setIsAdded(true);
  }, []);

  useEffect(() => {
    if (!isFarcaster) return;
    return subscribeMiniAppAdded(markAdded);
  }, [isFarcaster, markAdded]);

  const promptAddMiniApp = useCallback(async () => {
    if (!isFarcaster || isAdding || isAdded) {
      return { added: false as const };
    }

    setIsAdding(true);
    try {
      const result = await addMiniAppToClient();
      if (result.added) {
        markAdded();
        toast.success('Added to Farcaster', {
          description: 'Find Crack My Code in your apps list anytime.',
        });
      }
      return result;
    } catch {
      return { added: false as const };
    } finally {
      setIsAdding(false);
    }
  }, [isFarcaster, isAdding, isAdded, markAdded]);

  useEffect(() => {
    if (
      !isFarcaster ||
      !isReady ||
      isAdded ||
      isAdding ||
      hasPromptedThisSession()
    ) {
      return;
    }

    markPromptedThisSession();
    void promptAddMiniApp();
  }, [isFarcaster, isReady, isAdded, isAdding, promptAddMiniApp]);

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

  return (
    <FarcasterMiniAppContext.Provider
      value={{
        isFarcaster: isFarcaster && isReady,
        isSharing,
        shareGameInvite,
      }}
    >
      {children}
    </FarcasterMiniAppContext.Provider>
  );
}

export function useFarcasterMiniAppContext(): FarcasterMiniAppContextValue {
  const context = useContext(FarcasterMiniAppContext);
  if (!context) {
    throw new Error('useFarcasterMiniApp must be used within FarcasterMiniAppProvider');
  }
  return context;
}
