'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Lobby from '@/components/Lobby';
import { normalizeJoinCodeInput } from '@/lib/join-code';
import JoinStakeModal from '@/components/JoinStakeModal';
import OpenChallengesList from '@/components/OpenChallengesList';
import MatchHistoryList from '@/components/MatchHistoryList';
import { LeaderboardPanel } from '@/components/LeaderboardPanel';
import Image from 'next/image';
import SetCode from '@/components/SetCode';
import GameBoard from '@/components/GameBoard';
import ResultModal from '@/components/ResultModal';
import { BottomNav, type NavTab } from '@/components/BottomNav';
import { AboutHowToPlay } from '@/components/AboutHowToPlay';
import { SettingsPanel } from '@/components/SettingsPanel';
import { StatsPanel } from '@/components/StatsPanel';
import { SetNameModal } from '@/components/SetNameModal';
import {
  CODE_LENGTH,
  GAME_DURATION,
  initialGameState,
  evaluateGuess,
  toTileClues,
  isWinningClues,
  MAX_GUESSES,
  maxGuessesForMode,
  PROFESSIONAL_MODE_ENABLED,
} from '@/lib/game';
import type { Clue, GameMode, GameResult, GuessEntry, GameState, GamePhase, TileClue } from '@/lib/game';
import { SplashScreen } from '@/components/SplashScreen';
import {
  HowToPlayModal,
  isHowToPlayDismissed,
} from '@/components/HowToPlayModal';
import { cipherNextGuessAsync, prefetchCipherGuess, warmCipherWorker } from '@/lib/cipher-async';
import { useAccount, useWriteContract, usePublicClient, useBalance, useDisconnect } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { parseUnits, parseEventLogs, encodeFunctionData } from 'viem';
import { CONTRACT_ABI, CONTRACT_ADDRESS, USDT_ADDRESS } from '../../blockchain/constants';
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets';
import { resolvePayoutAddress, playerAddressAliases, getSmartWalletAddress } from '@/lib/wallet-address';
import { useGuessMyCode } from '../../blockchain/hooks';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { sendUsdtToAddress } from '@/lib/send-usdt';
import { Wallet, LogOut, ExternalLink, ShieldCheck, Copy, Check, History, ArrowLeft, ChevronRight } from 'lucide-react';

// ─── Settings ───────────────────────────────────────────────────────────────

const MATCHMAKING_MS = 2400;

const screenVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.3, ease: 'easeIn' } },
};

import { pusherClient } from '@/lib/pusher-client';
import { scoreDeltaForMode } from '@/lib/scoring';
import { isRegisteredPlayer } from '@/lib/guest';
import { useMiniAppEnvironment } from '@/hooks/use-mini-app-environment';
import { useWalletBootstrap } from '@/hooks/use-wallet-bootstrap';
import { isLikelyMiniPayHost } from '@/lib/minipay-host';
import { useCipherDailyStatus } from '@/hooks/use-cipher-daily-status';

function isDuplicateOfLastGuess(
  guesses: GuessEntry[],
  digits: number[],
  clues: Clue[],
): boolean {
  const last = guesses.at(-1);
  if (!last) return false;
  return (
    last.digits.join('') === digits.join('') &&
    last.clues.join('') === clues.join('')
  );
}

function nameModalDismissedKey(address: string) {
  return `cmc_name_modal_dismissed:${address.toLowerCase()}`;
}

function isNameModalDismissed(address?: string | null) {
  if (!address) return false;
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(nameModalDismissedKey(address)) === '1';
}

function dismissNameModal(address: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(nameModalDismissedKey(address), '1');
}

export default function Home() {
  const searchParams = useSearchParams();
  const { address: wagmiAddress, isConnected } = useAccount();
  const { login, logout, authenticated, user } = usePrivy();
  const { isMiniPay, isFarcaster, isReady: envReady, isAutoConnect } = useMiniAppEnvironment();
  const { isBootstrapping: isWalletConnecting } = useWalletBootstrap();
  const publicClient = usePublicClient();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();
  const { client: smartWalletClient } = useSmartWallets();

  const isExternalWallet = isMiniPay || isFarcaster || (
    !!wagmiAddress && !user?.linkedAccounts?.some(
      (a: any) => a.type === 'wallet' && a.walletClientType === 'privy' &&
        a.address?.toLowerCase() === wagmiAddress.toLowerCase()
    )
  );

  const payoutAddress = useMemo(
    () => resolvePayoutAddress({ smartWalletClient, user, wagmiAddress, isExternalWallet }),
    [smartWalletClient, user, wagmiAddress, isExternalWallet],
  );
  const smartWalletAddress = useMemo(
    () => isExternalWallet ? wagmiAddress?.toLowerCase() : getSmartWalletAddress(smartWalletClient, user),
    [smartWalletClient, user, isExternalWallet, wagmiAddress],
  );
  const walletAliases = useMemo(
    () => playerAddressAliases({ payoutAddress, wagmiAddress, user }),
    [payoutAddress, wagmiAddress, user],
  );
  const isSignedIn = authenticated || isConnected;
  const address = isSignedIn ? payoutAddress : undefined;
  const txAddress = wagmiAddress || user?.wallet?.address;
  const [cipherRefreshKey, setCipherRefreshKey] = useState(0);
  const bumpCipherDaily = useCallback(() => {
    setCipherRefreshKey((key) => key + 1);
  }, []);
  const markCipherSessionStarted = useCallback(() => {
    bumpCipherDaily();
  }, [bumpCipherDaily]);
  const { cipherStatus, cipherStatusLoaded } = useCipherDailyStatus(
    payoutAddress,
    isSignedIn,
    cipherRefreshKey,
  );

  const { data: usdtData, refetch: refetchUsdtBalance } = useBalance({
    address: payoutAddress as `0x${string}` | undefined,
    token: USDT_ADDRESS as `0x${string}`,
    query: { enabled: !!payoutAddress },
  });
  const [gs, setGs] = useState(() => initialGameState());
  const [playerStatsLoaded, setPlayerStatsLoaded] = useState(false);
  const [playerProfileLoaded, setPlayerProfileLoaded] = useState(false);
  const [playerProfile, setPlayerProfile] = useState<{
    name: string | null;
    points: number;
    needsName: boolean;
  } | null>(null);
  const [showSetNameModal, setShowSetNameModal] = useState(false);
  const gsRef = useRef(gs);
  useEffect(() => { gsRef.current = gs; }, [gs]);

  const aiTurnRunningRef = useRef(false);
  const playerReviewUntilRef = useRef(0);
  const PLAYER_GUESS_REVIEW_MS = 1500;
  const AI_DIGIT_MS = 300;
  const AI_REVEAL_MS = 2200;

  // PvP: after a guess is played, keep the result visible on the current board
  // for this long before announcing the turn change and switching boards.
  const TURN_HANDOVER_DELAY_MS = 1500;
  const turnHandoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevPvpTurnRef = useRef<boolean | null>(null);
  const prevAiTurnRef = useRef<boolean | null>(null);
  const turnTransitionUntilRef = useRef(0);
  // Blocks input while a player's just-played guess is still being reviewed
  // (their turn flag is held briefly so they can read the clue feedback).
  const [turnLocked, setTurnLocked] = useState(false);
  const turnLockedRef = useRef(false);
  useEffect(() => { turnLockedRef.current = turnLocked; }, [turnLocked]);

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace('/', '');
      if (['games', 'leaderboard', 'wallet', 'about', 'stats', 'terms', 'privacy', 'contact'].includes(path)) {
        return path as NavTab;
      }
    }
    return 'home';
  });
  const [showSplash, setShowSplash] = useState(false);
  const [splashResolved, setSplashResolved] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    if (isMiniPay || isLikelyMiniPayHost() || isAutoConnect) {
      setShowSplash(isFarcaster && !isMiniPay && !isLikelyMiniPayHost());
      setSplashResolved(true);
      return;
    }
    if (!envReady) return;
    setShowSplash(isFarcaster);
    setSplashResolved(true);
  }, [isFarcaster, isMiniPay, isAutoConnect, envReady]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    setActiveTab('home');
  }, []);

  useEffect(() => {
    if (showSplash || !splashResolved) return;
    if (isHowToPlayDismissed()) return;
    if (gs.phase !== 'lobby' || activeTab !== 'home') return;

    const timer = window.setTimeout(() => setShowHowToPlay(true), 350);
    return () => window.clearTimeout(timer);
  }, [showSplash, splashResolved, gs.phase, activeTab]);

  useEffect(() => {
    const statsAddress = payoutAddress || address;

    if (showSplash || !splashResolved) {
      setShowSetNameModal(false);
      return;
    }
    if (!statsAddress) {
      setShowSetNameModal(false);
      return;
    }
    if (!playerProfileLoaded || !playerProfile?.needsName) {
      setShowSetNameModal(false);
      return;
    }
    if (gs.phase !== 'lobby' || activeTab !== 'home') return;
    if (isNameModalDismissed(statsAddress)) return;

    setShowSetNameModal(true);
  }, [
    showSplash,
    splashResolved,
    payoutAddress,
    address,
    playerProfileLoaded,
    playerProfile?.needsName,
    gs.phase,
    activeTab,
  ]);

  useEffect(() => {
    warmCipherWorker();
  }, []);

  useEffect(() => {
    if (showSplash) return;
    if (typeof window !== 'undefined') {
      const path = activeTab === 'home' ? '/' : `/${activeTab}`;
      if (window.location.pathname !== path) {
        window.history.pushState(null, '', path);
      }
    }
  }, [activeTab, showSplash]);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const oppTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [shareableJoinCode, setShareableJoinCode] = useState<string | null>(null);
  const [joinGameIdInput, setJoinGameIdInput] = useState('');
  const [pendingJoinStake, setPendingJoinStake] = useState<{
    gameId: string;
    stake: number;
    player1Address: string;
    opponentLabel: string;
  } | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [myActiveGames, setMyActiveGames] = useState<any[]>([]);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [isSearchHidden, setIsSearchHidden] = useState(false);
  const [countdown, setCountdown] = useState<number | 'GO' | null>(null);
  const [currentOnChainMatchId, setCurrentOnChainMatchId] = useState<string | null>(null);
  const currentGameIdRef = useRef<string | null>(null);
  const currentOnChainMatchIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentGameIdRef.current = currentGameId;
  }, [currentGameId]);
  useEffect(() => {
    currentOnChainMatchIdRef.current = currentOnChainMatchId;
  }, [currentOnChainMatchId]);
  const [turnNotification, setTurnNotification] = useState<'player' | 'opponent' | null>(null);
  const [pendingOpponentTileClues, setPendingOpponentTileClues] = useState<TileClue[] | null>(null);
  const [copied, setCopied] = useState(false);

  const matchStartStatsRef = useRef({ points: 1000 });
  const [resultStats, setResultStats] = useState<{
    pointsBefore: number;
    pointsAfter: number;
    loading: boolean;
  } | null>(null);
  const [rematchStatus, setRematchStatus] = useState<'idle' | 'waiting' | 'opponent_wants' | 'declined'>('idle');
  const [rematchLoading, setRematchLoading] = useState(false);
  const rematchWaitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastCipherReward, setLastCipherReward] = useState<{
    paid: boolean;
    amount?: number;
    txHash?: string;
    reason?: string;
  } | null>(null);
  const [openGamesTab, setOpenGamesTab] = useState<'active' | 'history'>('active');
  const opponentAddressRef = useRef<string | null>(null);
  const addressRef = useRef<string | undefined>(address);
  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  const { cancelChallenge } = useGuessMyCode();

  const handleSignOut = useCallback(async () => {
    if (isConnected) disconnect();
    if (authenticated) await logout();
    setActiveTab('home');
  }, [authenticated, disconnect, isConnected, logout]);

  const clearOppTimer = () => { if (oppTimerRef.current) clearTimeout(oppTimerRef.current); };

  const clearTurnHandover = useCallback(() => {
    if (turnHandoverTimerRef.current) {
      clearTimeout(turnHandoverTimerRef.current);
      turnHandoverTimerRef.current = null;
    }
    turnTransitionUntilRef.current = 0;
    setTurnLocked(false);
  }, []);

  // PvP: hold the current board (with the just-played guess + clues visible)
  // for TURN_HANDOVER_DELAY_MS, then flip the turn — which triggers the turn
  // banner and the board switch together. `nextIsPlayerTurn` is the turn owner
  // once the handover completes.
  const scheduleTurnHandover = useCallback((nextIsPlayerTurn: boolean) => {
    if (turnHandoverTimerRef.current) clearTimeout(turnHandoverTimerRef.current);
    turnTransitionUntilRef.current = Date.now() + TURN_HANDOVER_DELAY_MS;
    setTurnLocked(true);
    turnHandoverTimerRef.current = setTimeout(() => {
      turnHandoverTimerRef.current = null;
      turnTransitionUntilRef.current = 0;
      setTurnLocked(false);
      setGs((prev) =>
        prev.phase === 'playing' && prev.gameMode !== 'ai'
          ? { ...prev, isPlayerTurn: nextIsPlayerTurn, opponentCurrentInput: [] }
          : prev,
      );
    }, TURN_HANDOVER_DELAY_MS);
  }, []);

  // 1.2 Fetch my private invite challenges
  const fetchMyActive = useCallback(async () => {
    if (!isSignedIn || !payoutAddress) return;
    try {
      const aliasQuery = encodeURIComponent(walletAliases.join(','));
      const [activeRes, historyRes] = await Promise.all([
        fetch(`/api/games/my-active?address=${encodeURIComponent(payoutAddress)}`),
        fetch(`/api/games/history?aliases=${aliasQuery}`),
      ]);
      const activeData = await activeRes.json();
      const historyData = await historyRes.json();
      setMyActiveGames(Array.isArray(activeData) ? activeData : []);
      setGameHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      console.error('Games data fetch failed', err);
    }
  }, [isSignedIn, payoutAddress, walletAliases]);

  useEffect(() => {
    fetchMyActive();
  }, [fetchMyActive]);

  useEffect(() => {
    if (activeTab === 'games' && address) fetchMyActive();
  }, [activeTab, address, fetchMyActive]);

  const handleCancelChallenge = useCallback(async (gameId: string, onChainMatchId?: string) => {
    if (!isConnected || !address) return false;
    setIsCancelling(gameId);
    let onChainOk = !onChainMatchId;
    let dbOk = false;

    try {
      if (onChainMatchId) {
        try {
          if (smartWalletClient) {
            const data = encodeFunctionData({
              abi: CONTRACT_ABI,
              functionName: 'cancelChallenge',
              args: [onChainMatchId as `0x${string}`]
            });
            const txHash = await smartWalletClient.sendTransaction({
              to: CONTRACT_ADDRESS as `0x${string}`,
              data: data,
              value: BigInt(0)
            });
            if (!publicClient) throw new Error("Public client not available");
            await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
          } else {
            await cancelChallenge(onChainMatchId as `0x${string}`);
          }
          onChainOk = true;
        } catch (err) {
          console.error('On-chain cancel failed', err);
        }
      }

      try {
        const res = await fetch('/api/games/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId })
        });
        dbOk = res.ok;
        if (res.ok) {
          setMyActiveGames(prev => prev.filter(g => g.id !== gameId));
        }
      } catch (err) {
        console.error('DB cancel failed', err);
      }

      if (!onChainOk && !dbOk) {
        toast.error('Cancel Failed', { description: 'Could not close the challenge. Try again from Open.' });
        return false;
      }

      if (!onChainOk || !dbOk) {
        toast.warning('Challenge partially closed', {
          description: 'One step failed — check Open if the search still appears.',
        });
      }

      return true;
    } finally {
      setIsCancelling(null);
    }
  }, [isConnected, address, smartWalletClient, publicClient, cancelChallenge]);

  // Prefill Game ID from legacy ?invite= or ?game= query (no auto-join — user taps Join)
  useEffect(() => {
    const fromQuery = searchParams.get('game') || searchParams.get('invite');
    if (fromQuery && !joinGameIdInput) {
      setJoinGameIdInput(fromQuery);
      setActiveTab('games');
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('invite');
        url.searchParams.delete('game');
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    }
  }, [searchParams]); // eslint-disable-line

  const snappedMatchStatsRef = useRef(false);
  // Snapshot CMC points once when a match starts (for accurate result modal)
  useEffect(() => {
    if (gs.phase === 'playing' && !snappedMatchStatsRef.current && playerStatsLoaded) {
      matchStartStatsRef.current = {
        points: gs.playerPoints,
      };
      snappedMatchStatsRef.current = true;
    }
    if (gs.phase !== 'playing' && gs.phase !== 'result') {
      snappedMatchStatsRef.current = false;
    }
  }, [gs.phase, gs.playerPoints, playerStatsLoaded]);

  // 1.8 Countdown Timer
  useEffect(() => {
    if (gs.phase === 'countdown') {
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === 3) return 2;
          if (prev === 2) return 1;
          if (prev === 1) return 'GO';
          if (prev === 'GO') {
            clearInterval(timer);
            setGs(curr => ({ ...curr, phase: 'playing' }));
            return null;
          }
          return prev;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gs.phase]);

  const refreshUserStats = useCallback(async (): Promise<{ points: number } | null> => {
    const statsAddress = payoutAddress || address;
    if (!statsAddress) return null;
    try {
      const res = await fetch(
        `/api/users/stats?address=${encodeURIComponent(statsAddress)}`,
      );
      const data = await res.json();
      if (data.points !== undefined) {
        setGs((prev) => ({
          ...prev,
          playerRating: data.points,
          playerPoints: data.points,
        }));
        return { points: data.points };
      }
    } catch (err) {
      console.error('Failed to refresh user stats', err);
    }
    return null;
  }, [address, payoutAddress]);

  const refreshPlayerProfile = useCallback(
    async (): Promise<{ name: string | null; points: number; needsName: boolean } | null> => {
      const statsAddress = payoutAddress || address;
      if (!statsAddress) return null;
      if (!isRegisteredPlayer(statsAddress)) return null;

      try {
        const res = await fetch(`/api/users/profile?address=${encodeURIComponent(statsAddress)}`);
        const data = await res.json();
        if (typeof data.needsName === 'boolean') {
          const next = {
            name: data.name ?? null,
            points: data.points ?? 1000,
            needsName: data.needsName,
          };
          setPlayerProfile(next);
          return next;
        }
      } catch (err) {
        console.error('Failed to refresh player profile', err);
      }
      return null;
    },
    [address, payoutAddress],
  );

  useEffect(() => {
    if (!address) {
      setPlayerStatsLoaded(false);
      return;
    }

    let cancelled = false;
    setPlayerStatsLoaded(false);

    setPlayerProfileLoaded(false);
    setPlayerProfile(null);

    Promise.allSettled([refreshUserStats(), refreshPlayerProfile()]).finally(() => {
      if (!cancelled) {
        setPlayerStatsLoaded(true);
        setPlayerProfileLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [address, refreshUserStats, refreshPlayerProfile]);

  useEffect(() => {
    if ((activeTab === 'home' || activeTab === 'wallet') && address && gs.phase === 'lobby') {
      void refreshUserStats();
    }
  }, [activeTab, address, gs.phase, refreshUserStats]);

  const syncResultStats = useCallback(
    async (pointsDelta: number) => {
      const before = matchStartStatsRef.current;

      if (!address) {
        setResultStats({
          pointsBefore: before.points,
          pointsAfter: before.points,
          loading: false,
        });
        return;
      }

      setResultStats({
        pointsBefore: before.points,
        pointsAfter: before.points,
        loading: true,
      });

      const stats = await refreshUserStats();
      const afterPoints = stats?.points ?? before.points + pointsDelta;

      setResultStats({
        pointsBefore: afterPoints - pointsDelta,
        pointsAfter: afterPoints,
        loading: false,
      });

      if (stats) {
        setGs((prev) => ({
          ...prev,
          playerPoints: stats.points,
          playerRating: stats.points,
        }));
      }
    },
    [refreshUserStats, address]
  );

  // ─── Real-time Gameplay Logic ───────────────────────────────────────────

  const applySyncPayload = useCallback(
    (data: {
      status: string;
      isYourTurn: boolean;
      playerGuesses: GuessEntry[];
      opponentGuesses: GuessEntry[];
      opponentGuessCount: number;
      result?: 'win' | 'lose' | 'draw' | null;
      opponentCode?: number[] | null;
    }) => {
      let pendingStatsSync: number | null = null;

      setGs((prev: GameState) => {
        if (prev.phase !== 'playing' && prev.phase !== 'result') return prev;

        if (data.status === 'COMPLETED' && data.result) {
          const mode = prev.gameMode === 'ai' ? 'ai' : prev.gameMode;
          const delta =
            data.result === 'win'
              ? scoreDeltaForMode(mode, true)
              : data.result === 'draw'
                ? 0
                : scoreDeltaForMode(mode, false);

          if (isRegisteredPlayer(addressRef.current) && prev.phase === 'playing' && data.result !== 'draw') {
            pendingStatsSync = delta;
          }

          return {
            ...prev,
            phase: 'result',
            result: data.result,
            ratingDelta: isRegisteredPlayer(addressRef.current) ? delta : 0,
            playerGuesses: data.playerGuesses,
            opponentGuesses: data.opponentGuesses,
            opponentGuessCount: data.opponentGuessCount,
            isPlayerTurn: false,
            opponentCurrentInput: [],
            currentInput: [],
            opponentCode: data.opponentCode ?? prev.opponentCode,
          };
        }

        // Don't let background sync flip the turn (or switch boards) while we're
        // deliberately holding the current board to show the just-played result.
        if (Date.now() < turnTransitionUntilRef.current) return prev;

        const guessesChanged =
          data.playerGuesses.length !== prev.playerGuesses.length ||
          data.opponentGuesses.length !== prev.opponentGuesses.length ||
          data.playerGuesses.at(-1)?.digits.join('') !== prev.playerGuesses.at(-1)?.digits.join('') ||
          data.opponentGuesses.at(-1)?.digits.join('') !== prev.opponentGuesses.at(-1)?.digits.join('');
        const turnChanged = data.isYourTurn !== prev.isPlayerTurn;

        // Trust the server when it has fewer guesses (fixes duplicate local entries),
        // unless we're mid-submit and still waiting for the server to catch up.
        if (
          data.playerGuesses.length < prev.playerGuesses.length &&
          isSubmittingRef.current
        ) {
          return prev;
        }

        if (!guessesChanged && !turnChanged) return prev;

        return {
          ...prev,
          isPlayerTurn: data.isYourTurn,
          playerGuesses: data.playerGuesses,
          opponentGuesses: data.opponentGuesses,
          opponentGuessCount: data.opponentGuessCount,
          opponentCurrentInput: [],
        };
      });

      if (pendingStatsSync !== null) {
        void syncResultStats(pendingStatsSync);
      }
    },
    [syncResultStats],
  );

  const syncGameState = useCallback(async () => {
    if (!currentGameId || !addressRef.current || gsRef.current.gameMode === 'ai') return;
    if (gsRef.current.phase !== 'playing') return;
    if (isSubmittingRef.current) return;

    try {
      const res = await fetch(
        `/api/games/sync?id=${currentGameId}&address=${encodeURIComponent(addressRef.current)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;
      applySyncPayload(data);
    } catch (err) {
      console.error('Game sync poll failed', err);
    }
  }, [currentGameId, applySyncPayload]);

  const emitTyping = useCallback((input: number[]) => {
    if (!currentGameId || gsRef.current.gameMode === 'ai') return;
    const sender = addressRef.current?.toLowerCase();
    if (!sender) return;
    const channel = pusherClient.channel(`private-game-${currentGameId}`);
    if (channel) {
      channel.trigger('client-typing', { input, sender });
    }
  }, [currentGameId]);

  const finalizeGameResult = useCallback(
    async (
      winnerAddress: string,
      mode: GameMode,
      options?: { opponentCode?: number[] | null },
    ) => {
      const playerAddress = addressRef.current || 'GUEST';
      const scoringMode = mode === 'ai' ? 'ai' : mode;
      const isDraw = winnerAddress === 'DRAW';
      const isWin =
        !isDraw && winnerAddress.toLowerCase() === playerAddress.toLowerCase();
      const result: GameResult = isDraw ? 'draw' : isWin ? 'win' : 'lose';
      const delta = isDraw ? 0 : scoreDeltaForMode(scoringMode, isWin);

      let opponentCode = options?.opponentCode ?? undefined;
      if (!opponentCode && currentGameId) {
        try {
          const revealRes = await fetch('/api/games/reveal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: currentGameId, address: playerAddress }),
          });
          const revealData = await revealRes.json();
          opponentCode = revealData.opponentCode;
        } catch (err) {
          console.error('Reveal after game end failed', err);
        }
      }

      setGs((prev: GameState) => ({
        ...prev,
        phase: 'result',
        result,
        ratingDelta: isRegisteredPlayer(playerAddress) ? delta : 0,
        currentInput: [],
        opponentCurrentInput: [],
        isPlayerTurn: false,
        opponentCode: opponentCode ?? prev.opponentCode,
      }));

      if (isRegisteredPlayer(playerAddress)) {
        await syncResultStats(delta);
      }
    },
    [currentGameId, syncResultStats],
  );

  useEffect(() => {
    if (!currentGameId || gs.gameMode === 'ai') return;

    const channelName = `private-game-${currentGameId}`;
    const channel = pusherClient.subscribe(channelName);

    const onTyping = (data: { input: number[]; sender?: string }) => {
      const myAddress = addressRef.current?.toLowerCase();
      if (myAddress && data.sender?.toLowerCase() === myAddress) return;
      setGs((prev: GameState) => ({ ...prev, opponentCurrentInput: data.input }));
    };

    const onOpponentGuess = (data: {
      digits: number[];
      clues: Clue[];
      tileClues?: TileClue[];
      sender: string;
      nextTurnAddress?: string;
      revealCode?: number[];
      winnerAddress?: string;
    }) => {
      const myAddress = addressRef.current?.toLowerCase();
      if (!myAddress || data.sender?.toLowerCase() === myAddress) return;

      const isMyTurn = data.nextTurnAddress
        ? data.nextTurnAddress.toLowerCase() === myAddress
        : true;
      const opponentWon = isWinningClues(data.clues);

      setGs((prev: GameState) => {
        const entry: GuessEntry = {
          digits: data.digits,
          clues: data.clues,
          tileClues: data.tileClues,
          id: `opp-${Date.now()}`,
        };

        if (isDuplicateOfLastGuess(prev.opponentGuesses, entry.digits, entry.clues)) {
          return prev;
        }

        const newGuesses = [...prev.opponentGuesses, entry];

        if (opponentWon) {
          const loss = scoreDeltaForMode(prev.gameMode === 'ai' ? 'ai' : prev.gameMode, false);

          void (async () => {
            try {
              const res = await fetch('/api/games/reveal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: currentGameId, address: addressRef.current || 'GUEST' }),
              });
              const revealData = await res.json();
              setGs((curr) => ({
                ...curr,
                opponentGuesses: newGuesses,
                phase: 'result',
                result: 'lose',
                ratingDelta: isRegisteredPlayer(addressRef.current) ? loss : 0,
                opponentCurrentInput: [],
                opponentCode: revealData.opponentCode || data.revealCode || [],
                isPlayerTurn: false,
              }));
              if (isRegisteredPlayer(addressRef.current)) {
                await syncResultStats(loss);
              }
            } catch (err) {
              console.error('Opponent win reveal failed', err);
            }
          })();

          return {
            ...prev,
            opponentGuesses: newGuesses,
            opponentCurrentInput: [],
            isPlayerTurn: false,
          };
        }

        // Reveal the opponent's guess + clues on their board now, but keep the
        // turn flag where it is. scheduleTurnHandover (below) flips it after a
        // beat so the result is readable before switching to my board.
        return {
          ...prev,
          opponentGuesses: newGuesses,
          opponentGuessCount: prev.opponentGuessCount + 1,
          opponentCurrentInput: [],
          isPlayerTurn: false,
        };
      });

      if (data.winnerAddress) {
        void finalizeGameResult(data.winnerAddress, gsRef.current.gameMode, {
          opponentCode: data.revealCode,
        });
        return;
      }

      if (!opponentWon) {
        scheduleTurnHandover(isMyTurn);
      }
    };

    const onGameStarted = () => {
      setIsWaiting(false);
      setGs((prev: GameState): GameState => ({ ...prev, phase: 'countdown' }));
    };

    channel.bind('client-typing', onTyping);
    channel.bind('opponent-guess', onOpponentGuess);
    channel.bind('game-started', onGameStarted);

    return () => {
      channel.unbind('client-typing', onTyping);
      channel.unbind('opponent-guess', onOpponentGuess);
      channel.unbind('game-started', onGameStarted);
      pusherClient.unsubscribe(channelName);
    };
  }, [currentGameId, gs.gameMode, syncResultStats, scheduleTurnHandover, finalizeGameResult]);

  // Poll server turn state during PvP — backup when Pusher events are missed
  useEffect(() => {
    if (gs.phase !== 'playing' || !currentGameId || gs.gameMode === 'ai' || !address) return;

    syncGameState();
    const interval = setInterval(syncGameState, 2000);
    return () => clearInterval(interval);
  }, [gs.phase, currentGameId, gs.gameMode, address, syncGameState]);

  // Set correct opening turn when the match begins
  useEffect(() => {
    if (gs.phase !== 'playing' || !currentGameId || gs.gameMode === 'ai' || !address) return;
    syncGameState();
  }, [gs.phase, currentGameId, gs.gameMode, address, syncGameState]);

  // PvP: show turn banner only when the turn actually flips (not after each guess)
  useEffect(() => {
    if (gs.phase !== 'playing' || gs.gameMode === 'ai') {
      prevPvpTurnRef.current = null;
      return;
    }

    const turn = gs.isPlayerTurn;
    if (prevPvpTurnRef.current === turn) return;

    prevPvpTurnRef.current = turn;
    setTurnNotification(turn ? 'player' : 'opponent');
    const timer = setTimeout(() => setTurnNotification(null), 2000);
    return () => clearTimeout(timer);
  }, [gs.isPlayerTurn, gs.phase, gs.gameMode]);

  // AI: Your Turn on handover back to player; Cipher's Turn after hint review
  useEffect(() => {
    if (gs.phase !== 'playing' || gs.gameMode !== 'ai') {
      prevAiTurnRef.current = null;
      return;
    }

    if (gs.isPlayerTurn) {
      if (prevAiTurnRef.current === true) return;
      prevAiTurnRef.current = true;
      setTurnNotification('player');
      const timer = setTimeout(() => setTurnNotification(null), 2000);
      return () => clearTimeout(timer);
    }

    prevAiTurnRef.current = false;
    const waitMs = Math.max(0, playerReviewUntilRef.current - Date.now());
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const showCipherTimer = setTimeout(() => {
      setTurnNotification('opponent');
      hideTimer = setTimeout(() => setTurnNotification(null), 2000);
    }, waitMs);

    return () => {
      clearTimeout(showCipherTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [gs.isPlayerTurn, gs.phase, gs.gameMode, gs.playerGuesses.length]);

  useEffect(() => {
    if (gs.phase !== 'playing') {
      setTurnNotification(null);
    }
  }, [gs.phase]);

  const scheduleOpponentTurn = useCallback(() => {
    if (gsRef.current.gameMode !== 'ai') return;
    if (gsRef.current.phase !== 'playing') return;
    if (gsRef.current.isPlayerTurn) return;
    if (aiTurnRunningRef.current) return;

    aiTurnRunningRef.current = true;
    clearOppTimer();

    const waitForPlayerReview = Math.max(0, playerReviewUntilRef.current - Date.now());

    oppTimerRef.current = setTimeout(() => {
      void (async () => {
      const currentGs = gsRef.current;
      if (currentGs.phase !== 'playing' || currentGs.isPlayerTurn) {
        aiTurnRunningRef.current = false;
        return;
      }

      const history = currentGs.opponentGuesses;
      const playerCode = currentGs.playerCode;
      if (!playerCode || playerCode.length === 0) {
        aiTurnRunningRef.current = false;
        return;
      }

      let targetDigits: number[];
      try {
        targetDigits = await cipherNextGuessAsync(history);
      } catch (err) {
        console.error('Cipher guess failed, using fallback', err);
        targetDigits = [0, 1, 2, 3];
      }

      if (gsRef.current.phase !== 'playing' || gsRef.current.isPlayerTurn) {
        aiTurnRunningRef.current = false;
        return;
      }

      let typeIndex = 0;
      const typeDigit = () => {
        if (typeIndex < CODE_LENGTH) {
          setGs((prev: GameState) => ({
            ...prev,
            opponentCurrentInput: targetDigits.slice(0, typeIndex + 1),
          }));
          typeIndex++;
          oppTimerRef.current = setTimeout(typeDigit, AI_DIGIT_MS);
        } else {
          const clues = evaluateGuess(targetDigits, gsRef.current.playerCode);
          const tileClues = toTileClues(targetDigits, gsRef.current.playerCode);
          setPendingOpponentTileClues(tileClues);

          const won = isWinningClues(clues);
          const revealMs = won ? AI_REVEAL_MS : AI_REVEAL_MS;

          oppTimerRef.current = setTimeout(() => {
            const entry: GuessEntry = {
              digits: targetDigits,
              clues,
              tileClues,
              id: `opp-${Date.now()}`,
            };

            if (won) {
              const loss = scoreDeltaForMode('ai', false);
              setPendingOpponentTileClues(null);

              setGs((prev: GameState) => ({
                ...prev,
                opponentGuesses: [...prev.opponentGuesses, entry],
                opponentGuessCount: prev.opponentGuessCount + 1,
                opponentCurrentInput: [],
                isPlayerTurn: false,
              }));

              void (async () => {
                try {
                  const res = await fetch('/api/games/reveal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gameId: currentGameId, address: address || 'GUEST' }),
                  });
                  const revealData = await res.json();
                  setGs((prev: GameState) => ({
                    ...prev,
                    phase: 'result',
                    result: 'lose',
                    ratingDelta: isRegisteredPlayer(address) ? loss : 0,
                    opponentCode: revealData.opponentCode || prev.opponentCode,
                  }));
                  if (isRegisteredPlayer(address)) {
                    await syncResultStats(loss);
                  }
                } catch (err) {
                  console.error('AI reveal sync failed', err);
                  setGs((prev: GameState) => ({
                    ...prev,
                    phase: 'result',
                    result: 'lose',
                    ratingDelta: isRegisteredPlayer(address) ? loss : 0,
                  }));
                } finally {
                  aiTurnRunningRef.current = false;
                  clearOppTimer();
                }
              })();
              return;
            }

            setGs((prev: GameState) => {
              if (prev.phase !== 'playing') return prev;
              return {
                ...prev,
                opponentGuesses: [...prev.opponentGuesses, entry],
                opponentGuessCount: prev.opponentGuessCount + 1,
                opponentCurrentInput: [],
                isPlayerTurn: true,
              };
            });
            setPendingOpponentTileClues(null);
            prefetchCipherGuess([
              ...history,
              { digits: entry.digits, clues: entry.clues },
            ]);
            aiTurnRunningRef.current = false;
          }, revealMs);
        }
      };

      setGs((prev: GameState) => ({ ...prev, opponentCurrentInput: [] }));
      typeDigit();
      })();
    }, waitForPlayerReview);
  }, [currentGameId, address, syncResultStats, AI_DIGIT_MS, AI_REVEAL_MS]);

  // AI Turn Trigger
  useEffect(() => {
    if (gs.phase === 'playing' && !gs.isPlayerTurn && gs.gameMode === 'ai') {
      scheduleOpponentTurn();
    }
  }, [gs.phase, gs.isPlayerTurn, gs.gameMode, gs.playerGuesses.length, scheduleOpponentTurn]);

  // ─── Phase: Lobby → Matchmaking ───────────────────────────────────────────

  const handleMatchFound = useCallback((
    gameId: string,
    opponentAddress: string,
    meta?: { mode?: GameMode; stake?: number }
  ) => {
    if (rematchWaitTimeoutRef.current) {
      clearTimeout(rematchWaitTimeoutRef.current);
      rematchWaitTimeoutRef.current = null;
    }
    setIsSearchHidden(false);
    setCurrentGameId(gameId);
    setResultStats(null);
    setRematchStatus('idle');
    setRematchLoading(false);
    clearTurnHandover();
    const isAIMatch = opponentAddress === 'AI_BOT' || opponentAddress === 'AI';
    if (!isAIMatch) {
      opponentAddressRef.current = opponentAddress.toLowerCase();
    }
    const mode = isAIMatch ? 'ai' : (meta?.mode ?? 'fun');
    
    setGs((prev: GameState) => ({
      ...prev,
      phase: 'setCode',
      gameMode: mode,
      stakeAmount: meta?.stake ?? prev.stakeAmount,
      opponentName: isAIMatch ? 'Cipher' : `${opponentAddress.slice(0, 6)}...`,
      playerCode: [],
      playerGuesses: [],
      opponentGuesses: [],
      opponentGuessCount: 0,
      currentInput: [],
      isPlayerTurn: true,
      timeLeft: GAME_DURATION,
      result: null,
      ratingDelta: null,
    }));
  }, [clearTurnHandover]);

  // User channel: match-found
  useEffect(() => {
    if (!address) return;
    const channelName = `private-user-${address.toLowerCase()}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind('match-found', (data: { gameId: string; opponentAddress: string }) => {
      handleMatchFound(data.gameId, data.opponentAddress);
      setActiveTab('home');
      toast.success('Opponent joined!', { description: 'Set your secret code to begin.' });
    });

    channel.bind('rematch-request', () => {
      setRematchStatus('opponent_wants');
    });

    channel.bind('rematch-declined', () => {
      if (rematchWaitTimeoutRef.current) {
        clearTimeout(rematchWaitTimeoutRef.current);
        rematchWaitTimeoutRef.current = null;
      }
      setRematchStatus('declined');
      setRematchLoading(false);
      toast.error('Rematch declined', {
        description: `${gsRef.current.opponentName} declined the rematch.`,
      });
    });

    channel.bind('rematch-started', (data: { gameId: string; opponentAddress: string; mode?: string; stake?: number }) => {
      if (rematchWaitTimeoutRef.current) {
        clearTimeout(rematchWaitTimeoutRef.current);
        rematchWaitTimeoutRef.current = null;
      }
      const mode = data.mode === 'cash' ? 'cash' : data.mode === 'ai' ? 'ai' : 'fun';
      handleMatchFound(data.gameId, data.opponentAddress, {
        mode,
        stake: parseFloat(String(data.stake)) || 0,
      });
      setRematchStatus('idle');
      setRematchLoading(false);
      toast.success('Rematch starting!', { description: 'Set your secret code to begin.' });
    });

    return () => {
      channel.unbind('match-found');
      channel.unbind('rematch-request');
      channel.unbind('rematch-declined');
      channel.unbind('rematch-started');
      pusherClient.unsubscribe(channelName);
    };
  }, [address, handleMatchFound]);

  // Poll while matchmaking (public queue + private invite) — backup if Pusher misses
  useEffect(() => {
    if ((gs.phase !== 'matchmaking' && !isSearchHidden) || !currentGameId || gs.gameMode === 'ai') return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/games/lobby?id=${currentGameId}`);
        if (!res.ok) return;
        const game = await res.json();
        if (game?.player2Address) {
          handleMatchFound(game.id, game.player2Address, {
            mode: game.mode === 'cash' ? 'cash' : 'fun',
            stake: parseFloat(String(game.stake)) || 0,
          });
          if (game.joinCode) setShareableJoinCode(game.joinCode);
        }
      } catch (err) {
        console.error('Matchmaking poll failed', err);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [gs.phase, currentGameId, gs.gameMode, handleMatchFound, isSearchHidden]);

  // Fetch shareable Game ID for private invites (e.g. older games created before joinCode existed)
  useEffect(() => {
    if (gs.phase !== 'matchmaking' || shareableJoinCode || !currentGameId) return;
    if (gs.opponentName !== 'WAITING') return;

    const fetchCode = async () => {
      try {
        const res = await fetch(`/api/games/lobby?id=${currentGameId}`);
        if (!res.ok) return;
        const game = await res.json();
        if (game?.joinCode) setShareableJoinCode(game.joinCode);
        else if (game?.id) setShareableJoinCode(game.id);
      } catch {
        /* ignore */
      }
    };
    fetchCode();
    const interval = setInterval(fetchCode, 2000);
    return () => clearInterval(interval);
  }, [gs.phase, gs.opponentName, shareableJoinCode, currentGameId]);

  // Poll while setting code — backup if game-started Pusher event is missed
  useEffect(() => {
    if (gs.phase !== 'setCode' || !currentGameId || gs.gameMode === 'ai') return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/games/lobby?id=${currentGameId}`);
        if (!res.ok) return;
        const game = await res.json();
        if (game?.player1Code && game?.player2Code) {
          setIsWaiting(false);
          setGs((prev: GameState) => ({ ...prev, phase: 'countdown' }));
        }
      } catch (err) {
        console.error('Set-code sync poll failed', err);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [gs.phase, currentGameId, gs.gameMode]);

  const executeOnChainJoin = useCallback(async (gameData: {
    id: string;
    stake: number;
    player1Address: string;
    mode?: GameMode;
  }) => {
    const joinerAddress = (payoutAddress || address)?.toLowerCase();
    if (!joinerAddress) throw new Error('Wallet not connected');

    const joinMode: GameMode = gameData.mode ?? 'cash';

    const reserveRes = await fetch('/api/games/reserve-join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: gameData.id, address: joinerAddress }),
    });
    const reserveData = await reserveRes.json();
    if (!reserveRes.ok) {
      if (reserveRes.status === 409) {
        throw new Error('Someone else is joining this challenge');
      }
      throw new Error(reserveData.error || 'Could not reserve join');
    }

    if (reserveData.onChainMatchId) {
      setCurrentOnChainMatchId(reserveData.onChainMatchId);
    }

    const challenger = gameData.player1Address as `0x${string}`;
    let txHash: `0x${string}`;

    if (smartWalletClient) {
      const data = encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: 'joinChallenge',
        args: [challenger],
      });
      txHash = (await smartWalletClient.sendTransaction({
        to: CONTRACT_ADDRESS as `0x${string}`,
        data,
        value: BigInt(0),
      })) as `0x${string}`;
      if (!publicClient) throw new Error('Public client not available');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== 'success') throw new Error('Join transaction failed');
    } else {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'joinChallenge',
        args: [challenger],
      });
      if (!publicClient) throw new Error('Public client not available');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('Join transaction failed');
      txHash = hash;
    }

    const confirmRes = await fetch('/api/games/confirm-join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: gameData.id,
        address: joinerAddress,
        joinTxHash: txHash,
      }),
    });
    const confirmData = await confirmRes.json();
    if (!confirmRes.ok) {
      if (confirmRes.status === 409) {
        throw new Error('Someone else joined first');
      }
      throw new Error(confirmData.error || 'Join confirmation failed');
    }

    const stake = parseFloat(String(gameData.stake)) || 0;
    setJoinGameIdInput('');
    setPendingJoinStake(null);
    handleMatchFound(confirmData.gameId, confirmData.opponentAddress, {
      mode: joinMode,
      stake: joinMode === 'cash' ? stake : 0,
    });
    setActiveTab('home');
    toast.success('Joined!', {
      description:
        joinMode === 'cash'
          ? 'Stake locked. Set your secret code to start.'
          : 'Set your secret code — game starts when both players lock in.',
    });
  }, [
    payoutAddress,
    address,
    smartWalletClient,
    publicClient,
    writeContractAsync,
    handleMatchFound,
  ]);

  const executeJoinGame = useCallback(async (gameData: {
    id: string;
    mode: string;
    stake: number;
    player1Address: string;
  }) => {
    const joinMode: GameMode = gameData.mode === 'cash' ? 'cash' : 'fun';
    await executeOnChainJoin({
      id: gameData.id,
      stake: parseFloat(String(gameData.stake)) || 0,
      player1Address: gameData.player1Address,
      mode: joinMode,
    });
  }, [executeOnChainJoin]);

  const handleFindMatch = useCallback(async (mode: GameMode, stake: number, isPublic: boolean = true, userBalance?: number) => {
    if (mode === 'cash' && !PROFESSIONAL_MODE_ENABLED) {
      toast.info('Professional mode coming soon', {
        description: 'Play free friendly matches or challenge Cipher AI today.',
      });
      return;
    }

    setSearchTime(0);
    if (mode !== 'ai') {
      setGs(curr => ({ ...curr, phase: 'matchmaking', gameMode: mode, opponentName: 'SEARCHING...' }));
    }

    const effectiveAddress = isSignedIn && payoutAddress ? payoutAddress : 'GUEST';
    setCurrentGameId(null);
    setCurrentOnChainMatchId(null);

    try {
      let onChainMatchId: string | undefined;

      const createOnChainChallenge = async (): Promise<string | undefined> => {
        const isPaid = mode === 'cash';
        const stakeAmt = parseUnits(stake.toString(), 6);
        let receipt;

        if (smartWalletClient) {
          const data = encodeFunctionData({
            abi: CONTRACT_ABI,
            functionName: 'createChallenge',
            args: [isPaid, stakeAmt],
          });
          const txHash = await smartWalletClient.sendTransaction({
            to: CONTRACT_ADDRESS as `0x${string}`,
            data,
            value: BigInt(0),
          });
          if (!publicClient) throw new Error('Public client not available');
          receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
        } else {
          const hash = await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'createChallenge',
            args: [isPaid, stakeAmt],
          });
          if (!publicClient) throw new Error('Public client not available');
          receipt = await publicClient.waitForTransactionReceipt({ hash });
        }

        const logs = parseEventLogs({
          abi: CONTRACT_ABI,
          eventName: 'ChallengeCreated',
          logs: receipt.logs,
        });
        return logs.length > 0 ? logs[0].args.matchId : undefined;
      };

      // Public PvP: join an existing host on-chain before opening a new challenge.
      if (mode !== 'ai' && isPublic && isConnected && txAddress) {
        const seekRes = await fetch('/api/games/find-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: effectiveAddress,
            mode,
            stake,
            isPublic,
            seekHost: true,
            smartWalletAddress: smartWalletAddress || payoutAddress,
          }),
        });
        const seekData = await seekRes.json();
        if (!seekRes.ok) {
          throw new Error(seekData.error || 'Matchmaking failed');
        }

        if (seekData.status === 'join_available') {
          await executeOnChainJoin({
            id: seekData.gameId,
            stake: parseFloat(String(seekData.stake)) || 0,
            player1Address: seekData.player1Address,
            mode,
          });
          return;
        }
      }

      if (mode !== 'ai' && isConnected && txAddress) {
        onChainMatchId = await createOnChainChallenge();
        if (onChainMatchId) setCurrentOnChainMatchId(onChainMatchId);
      }

      const res = await fetch('/api/games/find-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: effectiveAddress,
          mode,
          stake,
          onChainMatchId,
          isPublic,
          smartWalletAddress: smartWalletAddress || payoutAddress,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'DAILY_CIPHER_CAP') {
          throw new Error(data.error || 'Daily Cipher limit reached. See you tomorrow!');
        }
        throw new Error(data.error || 'Matchmaking failed');
      }

      if (data.status === 'matched') {
        handleMatchFound(data.gameId, data.opponentAddress || 'AI_BOT', {
          mode,
          stake: mode === 'cash' ? stake : 0,
        });
      } else {
        setCurrentGameId(data.gameId);
        // Short join code when migrated; internal id still works for join lookup
        setShareableJoinCode(data.joinCode ?? (!isPublic ? data.gameId : null) ?? null);
        if (onChainMatchId) setCurrentOnChainMatchId(onChainMatchId);
        
        setGs((prev: GameState): GameState => ({
          ...prev,
          phase: 'matchmaking',
          gameMode: mode,
          stakeAmount: stake,
          opponentName: !isPublic ? 'WAITING' : (mode === 'ai' ? 'Cipher' : 'Searching...')
        }));
        fetchMyActive();
      }
    } catch (err: any) {
      console.error('Matchmaking failed', err);
      const errMsg = getErrorMessage(err);
      toast.error('Matchmaking Error', { description: errMsg });
      setGs(prev => ({ ...prev, phase: 'lobby' }));
      if (errMsg.toLowerCase().includes('insufficient') || errMsg.toLowerCase().includes('balance')) {
        setTimeout(() => {
          window.location.href = "https://link.minipay.xyz/add_cash?tokens=USDT";
        }, 1500);
      }
    }
  }, [isSignedIn, payoutAddress, smartWalletAddress, txAddress, isConnected, smartWalletClient, publicClient, writeContractAsync, handleMatchFound, fetchMyActive, executeOnChainJoin]);

  const handleCancelMatchmaking = useCallback(async (options?: { fromTimeout?: boolean }) => {
    const gameId = currentGameIdRef.current;
    const onChainMatchId = currentOnChainMatchIdRef.current ?? undefined;

    if (gameId) {
      await handleCancelChallenge(gameId, onChainMatchId);
    } else if (onChainMatchId && isConnected && address) {
      setIsCancelling('pending');
      try {
        if (smartWalletClient) {
          const data = encodeFunctionData({
            abi: CONTRACT_ABI,
            functionName: 'cancelChallenge',
            args: [onChainMatchId as `0x${string}`]
          });
          const txHash = await smartWalletClient.sendTransaction({
            to: CONTRACT_ADDRESS as `0x${string}`,
            data: data,
            value: BigInt(0)
          });
          if (!publicClient) throw new Error("Public client not available");
          await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
        } else {
          await cancelChallenge(onChainMatchId as `0x${string}`);
        }
      } catch (err) {
        console.error('On-chain cancel failed during setup', err);
        toast.error('Cancel Failed', { description: getErrorMessage(err) });
        return;
      } finally {
        setIsCancelling(null);
      }
    }

    setIsSearchHidden(false);
    setGs((prev: GameState): GameState => ({ ...prev, phase: 'lobby' }));
    setSearchTime(0);
    setCurrentGameId(null);
    setShareableJoinCode(null);
    setCurrentOnChainMatchId(null);
    fetchMyActive();
    if (!options?.fromTimeout) {
      toast.info("Search Cancelled");
    }
  }, [handleCancelChallenge, isConnected, address, smartWalletClient, publicClient, cancelChallenge, fetchMyActive]);

  const handleTimeoutExpiry = useCallback(async () => {
    const gameId = currentGameIdRef.current;
    let expireOk = false;

    if (gameId) {
      try {
        const res = await fetch('/api/games/expire', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, address: payoutAddress || address }),
        });

        expireOk = res.ok;
      } catch (err) {
        console.error('Expire game failed', err);
      }
    }

    setGs((prev: GameState): GameState => ({ ...prev, phase: 'lobby' }));
    setSearchTime(0);
    setCurrentGameId(null);
    setShareableJoinCode(null);
    setCurrentOnChainMatchId(null);
    fetchMyActive();
    
    const isStakedProfessional =
      gs.gameMode === 'cash' && (gs.stakeAmount ?? 0) > 0;

    toast.info('Match Expired', {
      description: expireOk
        ? isStakedProfessional
          ? 'No opponent joined in time. Your stake has been returned.'
          : 'No opponent joined in time. Match expired.'
        : 'No opponent joined in time. Finalizing…',
    });
  }, [address, payoutAddress, fetchMyActive, gs.gameMode, gs.stakeAmount]);

  const handleHideSearch = useCallback(() => {
    setIsSearchHidden(true);
    setGs((prev: GameState): GameState => ({ ...prev, phase: 'lobby' }));
  }, []);

  const handleShowSearch = useCallback(() => {
    setIsSearchHidden(false);
    setGs((prev: GameState): GameState => ({
      ...prev,
      phase: 'matchmaking',
      opponentName: shareableJoinCode ? 'WAITING' : 'Searching...',
    }));
  }, [shareableJoinCode]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isActiveSearch = gs.phase === 'matchmaking' || isSearchHidden;
    if (isActiveSearch) {
      interval = setInterval(() => {
        setSearchTime(prev => {
          const timeout = gs.gameMode === 'ai' ? 60 : 300;

          if (prev >= timeout) {
            clearInterval(interval);
            setIsSearchHidden(false);
            void handleTimeoutExpiry();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setSearchTime(0);
    }
    return () => clearInterval(interval);
  }, [gs.phase, gs.gameMode, isSearchHidden, handleTimeoutExpiry]);

  const handleQuitGame = useCallback(async () => {
    if (!window.confirm('Are you sure you want to quit the game?')) return;

    clearOppTimer();
    clearTurnHandover();

    const playerAddress = isSignedIn && payoutAddress ? payoutAddress : 'GUEST';
    const gameId = currentGameId;
    let onChainMatchId = currentOnChainMatchIdRef.current ?? undefined;

    if (!onChainMatchId && gameId && (gs.gameMode === 'cash' || gs.gameMode === 'fun')) {
      try {
        const lobbyRes = await fetch(`/api/games/lobby?id=${gameId}`);
        if (lobbyRes.ok) {
          const game = await lobbyRes.json();
          onChainMatchId = game.onChainMatchId ?? undefined;
        }
      } catch {
        /* use ref only */
      }
    }

    const isOnChainQuit =
      (gs.gameMode === 'cash' || gs.gameMode === 'fun') &&
      !!onChainMatchId &&
      isRegisteredPlayer(playerAddress) &&
      isConnected;

    if (!gameId) {
      setGs(initialGameState(gs.playerPoints));
      setCurrentGameId(null);
      setCurrentOnChainMatchId(null);
      return;
    }

    try {
      let quitTxHash: `0x${string}` | undefined;

      if (isOnChainQuit) {
        if (smartWalletClient) {
          const data = encodeFunctionData({
            abi: CONTRACT_ABI,
            functionName: 'quitMatch',
            args: [onChainMatchId as `0x${string}`],
          });
          quitTxHash = (await smartWalletClient.sendTransaction({
            to: CONTRACT_ADDRESS as `0x${string}`,
            data,
            value: BigInt(0),
          })) as `0x${string}`;
          if (!publicClient) throw new Error('Public client not available');
          const receipt = await publicClient.waitForTransactionReceipt({ hash: quitTxHash });
          if (receipt.status !== 'success') throw new Error('Quit transaction failed');
        } else {
          const hash = await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'quitMatch',
            args: [onChainMatchId as `0x${string}`],
          });
          if (!publicClient) throw new Error('Public client not available');
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          if (receipt.status !== 'success') throw new Error('Quit transaction failed');
          quitTxHash = hash;
        }
      }

      const res = await fetch('/api/games/quit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          address: playerAddress,
          ...(quitTxHash ? { quitTxHash } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to quit game');
      }

      if (data.cancelled) {
        setGs(initialGameState(gs.playerPoints));
        setCurrentGameId(null);
        setCurrentOnChainMatchId(null);
        return;
      }

      const mode = gs.gameMode === 'ai' ? 'ai' : gs.gameMode;
      const lossDelta = scoreDeltaForMode(mode, false);

      setGs((prev: GameState) => ({
        ...prev,
        phase: 'result',
        result: 'lose',
        ratingDelta: isRegisteredPlayer(playerAddress) ? lossDelta : 0,
        currentInput: [],
        opponentCode: Array.isArray(data.opponentCode) ? data.opponentCode : prev.opponentCode,
      }));
      setCurrentGameId(null);
      setCurrentOnChainMatchId(null);

      if (isRegisteredPlayer(playerAddress) && gs.gameMode !== 'ai') {
        await syncResultStats(lossDelta);
      }
    } catch (err) {
      console.error('Quit game failed', err);
      toast.error('Quit failed', { description: getErrorMessage(err) });
    }
  }, [
    gs.playerPoints,
    gs.gameMode,
    isSignedIn,
    payoutAddress,
    currentGameId,
    isConnected,
    smartWalletClient,
    publicClient,
    writeContractAsync,
    clearTurnHandover,
    syncResultStats,
  ]);

  // ─── Phase: SetCode → Playing ─────────────────────────────────────────────

  const handleLockCode = useCallback(async (code: number[]) => {
    if (!currentGameId) return;
    if (!address && gs.gameMode !== 'ai') return;

    const effectiveAddress = address || 'GUEST';

    setGs((prev: GameState) => ({ ...prev, playerCode: code }));

    if (gs.gameMode === 'ai') {
      warmCipherWorker();
      try {
        const res = await fetch('/api/games/lock-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: currentGameId,
            address: effectiveAddress,
            code: code.join(''),
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to lock your code');
        }
        if (isSignedIn) {
          markCipherSessionStarted();
        }
        setGs((prev: GameState): GameState => ({ ...prev, phase: 'playing' }));
      } catch (err) {
        console.error('Failed to lock AI code', err);
        toast.error('System Error', { description: getErrorMessage(err) });
      }
      return;
    }

    setIsWaiting(true);

    try {
      await fetch('/api/games/lock-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: currentGameId, address: effectiveAddress, code: code.join('') })
      });
      // For PvP, we wait for 'game-started' Pusher event
    } catch (err) {
      console.error('Failed to lock code', err);
      toast.error('System Error', { description: 'Failed to lock your code. Please try again.' });
      setIsWaiting(false);
    }
  }, [currentGameId, address, gs.gameMode, isSignedIn, markCipherSessionStarted]);

  // ─── Phase: Playing — submit guess ────────────────────────────────────────

  const handleSubmitGuess = useCallback(async (digits: number[]) => {
    if (!gs.isPlayerTurn || gs.phase !== 'playing' || isSubmitting || turnLockedRef.current) return;
    if (digits.length !== CODE_LENGTH) return;

    setIsSubmitting(true);
    isSubmittingRef.current = true;

    try {
    const playerAddress = isSignedIn && payoutAddress ? payoutAddress : 'GUEST';
    // 1. Send guess to server
    if (currentGameId) {
      try {
        const res = await fetch('/api/games/submit-guess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: currentGameId, digits, playerAddress })
        });
        const data = await res.json();

        if (data.success) {
          const clues = data.clues as Clue[];
          const tileClues = data.tileClues as TileClue[] | undefined;
          const won = isWinningClues(clues);
          const mode = gs.gameMode === 'ai' ? 'ai' : gs.gameMode;

          setGs((prev: GameState) => {
            if (isDuplicateOfLastGuess(prev.playerGuesses, digits, clues)) {
              return prev;
            }

            const entry: GuessEntry = {
              digits,
              clues,
              tileClues,
              id: `${Date.now()}`,
            };
            const newGuesses = [...prev.playerGuesses, entry];
            const guessLimit = maxGuessesForMode(prev.gameMode);
            const reachedMax = newGuesses.length >= guessLimit;

            if (won) {
              clearOppTimer();
              // Cipher USDT reward campaign ended
              // if (data.cipherReward) {
              //   setLastCipherReward(data.cipherReward);
              //   if (data.cipherReward.paid) {
              //     void refetchUsdtBalance();
              //   }
              // }
              return {
                ...prev,
                playerGuesses: newGuesses,
                phase: 'result',
                result: 'win',
                ratingDelta: isRegisteredPlayer(playerAddress) ? scoreDeltaForMode(mode, true) : 0,
                currentInput: [],
                opponentCode: data.opponentCode,
              };
            }

            if (reachedMax) {
              return {
                ...prev,
                playerGuesses: newGuesses,
                isPlayerTurn: false,
                currentInput: [],
                opponentCurrentInput: [],
              };
            }

            if (prev.gameMode === 'ai') {
              playerReviewUntilRef.current = Date.now() + PLAYER_GUESS_REVIEW_MS;
              return {
                ...prev,
                playerGuesses: newGuesses,
                isPlayerTurn: false,
                currentInput: [],
                opponentCurrentInput: [],
              };
            }

            return {
              ...prev,
              playerGuesses: newGuesses,
              currentInput: [],
              opponentCurrentInput: [],
            };
          });

          emitTyping([]);

          if (won) {
            if (isRegisteredPlayer(playerAddress)) {
              await syncResultStats(scoreDeltaForMode(mode, true));
            }
          } else if (data.winnerAddress) {
            await finalizeGameResult(data.winnerAddress, gs.gameMode, {
              opponentCode: data.opponentCode,
            });
          } else if (gs.gameMode !== 'ai') {
            const nextIsMyTurn =
              typeof data.nextTurnAddress === 'string' &&
              data.nextTurnAddress.toLowerCase() === playerAddress.toLowerCase();
            scheduleTurnHandover(nextIsMyTurn);
          }
        }
      } catch (err) {
        console.error('Failed to submit guess', err);
        toast.error('Submission Failed', { description: getErrorMessage(err) });
      }
    }
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }, [gs, currentGameId, isSignedIn, payoutAddress, isSubmitting, syncResultStats, scheduleTurnHandover, finalizeGameResult, emitTyping]);

  // ─── Number pad: add / remove digit ──────────────────────────────────────

  const handleDigitPress = useCallback((digit: number) => {
    if (turnLockedRef.current) return;
    setGs((prev: GameState) => {
      if (!prev.isPlayerTurn || prev.phase !== 'playing') return prev;
      if (prev.playerGuesses.length >= maxGuessesForMode(prev.gameMode)) return prev;
      if (prev.currentInput.length >= CODE_LENGTH) return prev;
      const newInput = [...prev.currentInput, digit];
      emitTyping(newInput);
      return { ...prev, currentInput: newInput };
    });
  }, [emitTyping]);

  const handleDeleteDigit = useCallback(() => {
    setGs((prev: GameState) => {
      const newInput = prev.currentInput.slice(0, -1);
      emitTyping(newInput);
      return { ...prev, currentInput: newInput };
    });
  }, [emitTyping]);

  // ─── Phase: Result → Lobby ────────────────────────────────────────────────

  const exitResultScreen = useCallback(() => {
    if (rematchWaitTimeoutRef.current) {
      clearTimeout(rematchWaitTimeoutRef.current);
      rematchWaitTimeoutRef.current = null;
    }
    clearOppTimer();
    clearTurnHandover();
    const points = resultStats?.pointsAfter ?? gs.playerPoints;
    setGs(initialGameState(points));
    setResultStats(null);
    setLastCipherReward(null);
    setRematchStatus('idle');
    setRematchLoading(false);
    setCurrentGameId(null);
    setShareableJoinCode(null);
    opponentAddressRef.current = null;
    bumpCipherDaily();
    if (address) {
      void refreshUserStats();
      void fetchMyActive();
    }
  }, [gs.playerPoints, resultStats, address, refreshUserStats, fetchMyActive, clearTurnHandover, bumpCipherDaily]);

  const handlePlayAgain = useCallback(() => {
    if (gs.gameMode !== 'ai') return;
    exitResultScreen();
    setTimeout(() => {
      handleFindMatch('ai', 0, true);
    }, 100);
  }, [gs.gameMode, exitResultScreen, handleFindMatch]);

  const handleRematch = useCallback(async () => {
    if (!currentGameId || !address || gs.gameMode === 'ai') return;

    setRematchLoading(true);
    try {
      const res = await fetch('/api/games/rematch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: currentGameId, address, action: 'accept' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rematch failed');

      if (data.status === 'started') {
        handleMatchFound(data.gameId, data.opponentAddress, {
          mode: gs.gameMode,
          stake: gs.stakeAmount,
        });
        setRematchStatus('idle');
        toast.success('Rematch starting!', { description: 'Set your secret code to begin.' });
      } else {
        setRematchStatus('waiting');

        // If opponent is offline, they may never respond — avoid waiting forever.
        if (rematchWaitTimeoutRef.current) {
          clearTimeout(rematchWaitTimeoutRef.current);
          rematchWaitTimeoutRef.current = null;
        }
        const WAIT_MS = 20_000;
        rematchWaitTimeoutRef.current = setTimeout(() => {
          setRematchStatus('idle');
          setRematchLoading(false);
          toast.info('Rematch unavailable', {
            description: 'Opponent looks offline/logged out. Please try again later.',
          });
          exitResultScreen();
        }, WAIT_MS);
      }
    } catch (err) {
      setRematchStatus('idle');
      toast.error('Rematch failed', { description: getErrorMessage(err) });
    } finally {
      setRematchLoading(false);
    }
  }, [currentGameId, address, gs.gameMode, gs.stakeAmount, handleMatchFound, exitResultScreen]);

  const handleDeclineRematch = useCallback(async () => {
    if (currentGameId && address && gs.gameMode !== 'ai') {
      try {
        await fetch('/api/games/rematch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: currentGameId, address, action: 'decline' }),
        });
      } catch (err) {
        console.error('Decline rematch failed', err);
      }
    }
    exitResultScreen();
  }, [currentGameId, address, gs.gameMode, exitResultScreen]);

  const handleHome = useCallback(() => {
    exitResultScreen();
  }, [exitResultScreen]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => () => { clearOppTimer(); clearTurnHandover(); }, []); // eslint-disable-line

  // ─── Keyboard support (desktop / testing) ────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gs.phase !== 'playing') return;
      if (e.key >= '0' && e.key <= '9') handleDigitPress(Number(e.key));
      if (e.key === 'Backspace') handleDeleteDigit();
      if (e.key === 'Enter' && gs.currentInput.length === CODE_LENGTH)
        handleSubmitGuess(gs.currentInput);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gs.phase, gs.currentInput, handleDigitPress, handleDeleteDigit, handleSubmitGuess]);

  const handleJoinChallenge = useCallback(async (gameIdOrCode: string) => {
    if (!isConnected || !address) return;

    const lookupKey = normalizeJoinCodeInput(gameIdOrCode) || gameIdOrCode.trim();
    setIsJoining(lookupKey);
    try {
      const gameRes = await fetch(`/api/games/lobby?joinCode=${encodeURIComponent(lookupKey)}`);
      const gameData = await gameRes.json();

      if (!gameData || gameData.error) throw new Error('Challenge not found or expired');

      if (gameData.player1Address?.toLowerCase() === address.toLowerCase()) {
        toast.error('Invalid Action', { description: 'You cannot join your own challenge.' });
        return;
      }

      if (gameData.player2Address) {
        toast.error('Challenge full', { description: 'Someone already joined this game.' });
        return;
      }

      if (gameData.mode === 'cash') {
        if (!PROFESSIONAL_MODE_ENABLED) {
          toast.info('Professional mode coming soon', {
            description: 'This challenge uses USDT stakes, which are not live yet.',
          });
          return;
        }
        setPendingJoinStake({
          gameId: gameData.id,
          stake: parseFloat(String(gameData.stake)) || 0,
          player1Address: gameData.player1Address,
          opponentLabel: `${gameData.player1Address.slice(0, 6)}...`,
        });
        setIsJoining(null);
        return;
      }

      await executeJoinGame(gameData);
    } catch (err) {
      console.error('Join failed', err);
      const errMsg = getErrorMessage(err);
      if (errMsg.includes('joined first') || errMsg.includes('joining this challenge')) {
        toast.error('Challenge taken', { description: errMsg });
      } else {
        toast.error('Join Error', { description: errMsg });
      }
      if (errMsg.toLowerCase().includes('insufficient') || errMsg.toLowerCase().includes('balance')) {
        setTimeout(() => {
          window.location.href = 'https://link.minipay.xyz/add_cash?tokens=USDT';
        }, 1500);
      }
    } finally {
      setIsJoining(null);
    }
  }, [isConnected, address, executeJoinGame]);

  const handleConfirmJoinStake = async () => {
    if (!pendingJoinStake) return;
    setIsJoining(pendingJoinStake.gameId);
    try {
      const gameRes = await fetch(`/api/games/lobby?id=${pendingJoinStake.gameId}`);
      const gameData = await gameRes.json();
      if (!gameData || gameData.error) throw new Error('Challenge not found or expired');
      if (gameData.player2Address) throw new Error('Challenge full');
      await executeJoinGame(gameData);
    } catch (err) {
      console.error('Paid join failed', err);
      const errMsg = getErrorMessage(err);
      if (errMsg.includes('joined first') || errMsg.includes('joining this challenge')) {
        toast.error('Challenge taken', { description: errMsg });
      } else {
        toast.error('Join Error', { description: errMsg });
      }
    } finally {
      setIsJoining(null);
    }
  };

  const handleJoinByGameId = useCallback(async () => {
    const code = normalizeJoinCodeInput(joinGameIdInput);
    if (!code) {
      toast.error('Enter a Game ID', { description: 'Ask your friend for the code shown on their invite screen.' });
      return;
    }
    if (!isConnected || !address) {
      toast.error('Sign in required', { description: 'Connect your wallet to join a challenge.' });
      login();
      return;
    }
    await handleJoinChallenge(code);
  }, [joinGameIdInput, isConnected, address, login, handleJoinChallenge]);

  const abandonCipherGame = useCallback(async () => {
    const gameId = currentGameId;
    const playerAddress = isSignedIn && payoutAddress ? payoutAddress : 'GUEST';
    clearOppTimer();
    clearTurnHandover();
    setGs(initialGameState(gs.playerPoints));
    setCurrentGameId(null);
    setShareableJoinCode(null);
    setCurrentOnChainMatchId(null);

    if (!gameId || gs.gameMode !== 'ai') return;

    try {
      await fetch('/api/games/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, address: playerAddress }),
      });
    } catch (err) {
      console.error('Failed to abandon Cipher game', err);
    }
  }, [
    currentGameId,
    gs.gameMode,
    gs.playerPoints,
    isSignedIn,
    payoutAddress,
    clearTurnHandover,
  ]);

  // ─── Sub-views ────────────────────────────────────────────────────────────

  const handleCancelOpenChallenge = useCallback(async (gameId: string, onChainMatchId?: string) => {
    if (!address) return;
    setIsCancelling(gameId);
    const toastId = toast.loading('Closing challenge...');
    try {
      if (onChainMatchId) {
        await cancelChallenge(onChainMatchId as `0x${string}`);
      }
      const res = await fetch('/api/games/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, address }),
      });
      if (!res.ok) throw new Error('API cancellation failed');
      toast.success('Challenge closed', { id: toastId });
      fetchMyActive();
    } catch (err) {
      toast.error(getErrorMessage(err), { id: toastId });
    } finally {
      setIsCancelling(null);
    }
  }, [address, cancelChallenge, fetchMyActive]);

  const pointsLoading = !!address && !playerStatsLoaded;

  const handleWithdrawMpesa = useCallback(async (_phone: string, _amount: number) => {
    toast.info('Coming soon', {
      description: 'M-Pesa cash-out on Celo is on the way — you\'ll wire this up next.',
    });
  }, []);

  const handleSendUsdt = useCallback(async (recipient: string, amount: number): Promise<string> => {
    if (!payoutAddress || !publicClient) {
      throw new Error('Wallet not connected');
    }
    try {
      const txHash = await sendUsdtToAddress({
        recipient: recipient as `0x${string}`,
        amount,
        smartWalletClient,
        writeContractAsync,
        publicClient,
      });
      void refetchUsdtBalance();
      return txHash;
    } catch (err) {
      throw err;
    }
  }, [payoutAddress, publicClient, smartWalletClient, writeContractAsync, refetchUsdtBalance]);

  const renderHomeContent = () => {
    return gs.phase === 'lobby' || gs.phase === 'matchmaking' ? (
      <motion.div key="lobby" className="w-full relative flex flex-col gap-4" {...screenVariants}>
        <Lobby
          points={gs.playerPoints}
          pointsLoading={pointsLoading}
          isMatchmaking={gs.phase === 'matchmaking'}
          opponentName={gs.opponentName}
          isSignedIn={isSignedIn}
          isWalletConnecting={isWalletConnecting}
          payoutAddress={payoutAddress}
          cipherStatus={cipherStatus}
          cipherStatusLoaded={cipherStatusLoaded}
          onFindMatch={handleFindMatch}
          onMatchFound={handleMatchFound}
          onWalletClick={() => setActiveTab('wallet')}
          searchTime={searchTime}
          onCancelMatchmaking={handleCancelMatchmaking}
          isCancellingMatchmaking={!!isCancelling}
          shareableJoinCode={
            shareableJoinCode ??
            (gs.phase === 'matchmaking' && gs.opponentName === 'WAITING' ? currentGameId ?? undefined : undefined)
          }
          joinGameIdInput={joinGameIdInput}
          onJoinGameIdInputChange={setJoinGameIdInput}
          onJoinByGameId={handleJoinByGameId}
          onJoinCashChallenge={(game) =>
            executeOnChainJoin({ ...game, mode: 'cash' })
          }
          isJoining={!!isJoining}
          onHideSearch={handleHideSearch}
          hasPendingSearch={isSearchHidden}
          onShowSearch={handleShowSearch}
          pendingStake={gs.stakeAmount}
        />
      </motion.div>
    ) : gs.phase === 'setCode' ? (
      <motion.div key="setcode" className="w-full relative" {...screenVariants}>
        <SetCode
          opponentName={gs.opponentName}
          onLockCode={handleLockCode}
          onBack={() => {
            void abandonCipherGame();
          }}
          isWaiting={isWaiting}
        />
        <AnimatePresence>
          {isWaiting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030C15]/80 backdrop-blur-xl p-8 text-center"
            >
              <div className="relative mb-8 h-24 w-24">
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-[var(--accent)]/20"
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-t-[var(--accent)]"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ShieldCheck size={40} className="text-[var(--accent)]" />
                </motion.div>
              </div>
              
              <h3 className="font-orbitron text-2xl font-black tracking-widest text-white uppercase mb-2">Synchronizing...</h3>
              <p className="text-sm text-[var(--text-dim)] uppercase tracking-widest max-w-xs mx-auto mb-8">
                Waiting for <span className="text-[var(--accent)]">{gs.opponentName}</span> to finalize their encryption code.
              </p>
              
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-2 w-2 rounded-full bg-[var(--accent)]"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    ) : (gs.phase === 'playing' || gs.phase === 'result' || gs.phase === 'countdown') ? (
      <motion.div key="game" className="h-dvh w-full overflow-hidden" {...screenVariants}>
        <GameBoard
          playerGuesses={gs.playerGuesses}
          opponentGuesses={gs.opponentGuesses}
          opponentGuessCount={gs.opponentGuessCount}
          currentInput={gs.currentInput}
          opponentCurrentInput={gs.opponentCurrentInput}
          isPlayerTurn={gs.isPlayerTurn}
          opponentName={gs.opponentName}
          playerRating={gs.playerPoints}
          playerPoints={gs.playerPoints}
          pointsLoading={pointsLoading}
          isSubmitting={isSubmitting}
          inputLocked={turnLocked}
          onDigitPress={handleDigitPress}
          onDelete={handleDeleteDigit}
          onSubmit={() => handleSubmitGuess(gs.currentInput)}
          onQuit={handleQuitGame}
          pendingOpponentTileClues={pendingOpponentTileClues}
          turnNotification={turnNotification}
          isAI={gs.gameMode === 'ai'}
          phase={gs.phase}
        />

        <AnimatePresence>
          {gs.phase === 'countdown' && countdown !== null && (
            <motion.div 
              key="countdown"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 2 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030C15]/60 backdrop-blur-sm"
            >
              <motion.div
                key={countdown}
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12 }}
                className="font-orbitron text-9xl font-black italic tracking-tighter"
                style={{ 
                  color: countdown === 'GO' ? 'var(--accent)' : 'white',
                  textShadow: `0 0 40px ${countdown === 'GO' ? 'var(--accent-glow)' : 'rgba(255,255,255,0.3)'}`
                }}
              >
                {countdown}
              </motion.div>
            </motion.div>
          )}

          {gs.phase === 'result' && gs.result && (
            <ResultModal
              result={gs.result}
              gameMode={gs.gameMode}
              stakeAmount={gs.stakeAmount}
              opponentCode={gs.opponentCode}
              opponentName={gs.opponentName}
              ratingDelta={gs.ratingDelta ?? 0}
              pointsBefore={resultStats?.pointsBefore ?? matchStartStatsRef.current.points}
              pointsAfter={resultStats?.pointsAfter ?? gs.playerPoints}
              playerRating={resultStats?.pointsAfter ?? gs.playerPoints}
              statsLoading={resultStats?.loading ?? false}
              guessCount={gs.playerGuesses.length}
              cipherReward={null}
              // cipherReward={lastCipherReward}
              onPlayAgain={handlePlayAgain}
              onHome={handleHome}
              rematchStatus={rematchStatus}
              onRematch={handleRematch}
              onDeclineRematch={handleDeclineRematch}
              rematchLoading={rematchLoading}
            />
          )}
        </AnimatePresence>
      </motion.div>
    ) : null;
  };

  const renderOpenGames = () => (
    <motion.div key="games" className="page-tab flex w-full flex-col text-left h-[calc(100dvh-var(--nav-clearance-with-safe))]" {...screenVariants}>
      {isWalletConnecting ? (
        <div className="theme-sky-readout flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="font-body text-sm text-[var(--text-dim)]">Connecting your MiniPay wallet…</p>
        </div>
      ) : !isSignedIn || !payoutAddress ? (
        <div className="theme-sky-readout flex flex-col items-center justify-center gap-4 py-16 text-center">
          <span className="text-4xl" aria-hidden>🛡️</span>
          <p className="font-body text-sm text-[var(--text-dim)]">Connect wallet to view your open challenges</p>
          <button
            onClick={() => login()}
            className="theme-game-btn theme-game-btn--pvp max-w-[200px] min-h-0 py-3"
            type="button"
          >
            <span className="theme-game-btn__title text-sm">Sign In</span>
          </button>
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-10 bg-[var(--bg)] pb-3 pt-1">
            <div className="theme-tab-switcher">
              <button
                type="button"
                onClick={() => setOpenGamesTab('active')}
                className={`theme-tab-switcher__btn ${
                  openGamesTab === 'active'
                    ? 'theme-tab-switcher__btn--active'
                    : 'theme-tab-switcher__btn--inactive'
                }`}
              >
                My Active
              </button>
              <button
                type="button"
                onClick={() => setOpenGamesTab('history')}
                className={`theme-tab-switcher__btn ${
                  openGamesTab === 'history'
                    ? 'theme-tab-switcher__btn--active'
                    : 'theme-tab-switcher__btn--inactive'
                }`}
              >
                History
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-4">
            {openGamesTab === 'active' ? (
              <OpenChallengesList
                isConnected={!!isConnected}
                myActiveGames={myActiveGames}
                onCancelOpenChallenge={handleCancelOpenChallenge}
                isCancellingId={isCancelling}
              />
            ) : (
              <MatchHistoryList games={gameHistory} address={payoutAddress} walletAliases={walletAliases} />
            )}
          </div>
        </>
      )}
    </motion.div>
  );

  const renderLeaderboard = () => (
    <motion.div key="leaderboard" className="page-tab flex w-full flex-col gap-4" {...screenVariants}>
      <LeaderboardPanel currentAddress={address} />
    </motion.div>
  );

  const renderAbout = () => (
    <motion.div key="about" className="page-tab flex w-full flex-col gap-6" {...screenVariants}>
      <AboutHowToPlay />
    </motion.div>
  );

  const renderWalletContent = () => (
    <motion.div key="wallet" className="page-tab flex w-full flex-col gap-5 text-left" {...screenVariants}>
      <SettingsPanel
        address={address}
        points={gs.playerPoints}
        pointsLoading={pointsLoading}
        usdtFormatted={usdtData?.formatted}
        copied={copied}
        profileName={playerProfile?.name ?? null}
        onNameSaved={(name) => {
          if (!address) return;
          setPlayerProfile((prev) =>
            prev
              ? {
                  ...prev,
                  name,
                  needsName: false,
                }
              : prev,
          );
          dismissNameModal(address);
        }}
        onLogin={() => login()}
        onCopyAddress={() => {
          if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        }}
        onTabChange={setActiveTab}
        onWithdrawMpesa={handleWithdrawMpesa}
        onSendUsdt={handleSendUsdt}
      />
      {address && !isMiniPay && !isFarcaster && (
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="sign-out-btn flex w-full items-center justify-center gap-2 py-3.5 font-ui text-sm font-bold transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      )}
    </motion.div>
  );

  const renderStats = () => (
    <motion.div key="stats" className="page-tab flex w-full flex-col gap-6 text-left" {...screenVariants}>
      <StatsPanel address={address} onBack={() => setActiveTab('wallet')} />
    </motion.div>
  );

  const renderTerms = () => (
    <motion.div key="terms" className="page-tab flex w-full flex-col gap-6 text-left" {...screenVariants}>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => setActiveTab('wallet' as any)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-mid)] bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--border-bright)] transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h2 className="font-orbitron text-xl font-black tracking-widest text-[var(--text)] uppercase">Terms</h2>
      </div>
      <div className="theme-card flex flex-col gap-6 p-6 text-sm leading-relaxed text-[var(--text-2)]">
        <p>Welcome to Crack My Code. By using our Mini App, you agree to these terms.</p>
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-2">1. Acceptance of Terms</h3>
          <p>By accessing or using the application, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
        </div>
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-2">2. Gameplay and Staking</h3>
          <p>Crack My Code allows you to play games using stablecoins (USDT) on the Celo network. All transactions are executed on-chain and are final. You are solely responsible for understanding the risks involved in staking stablecoins.</p>
        </div>
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-2">3. Fees</h3>
          <p>The platform may take a small fee from the prize pool of cash games to cover protocol operations. Network fees for Celo are abstracted where applicable.</p>
        </div>
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-2">4. Limitation of Liability</h3>
          <p>We are not liable for any losses of funds, network errors, or disruptions related to the underlying blockchain infrastructure.</p>
        </div>
      </div>
    </motion.div>
  );

  const renderPrivacy = () => (
    <motion.div key="privacy" className="page-tab flex w-full flex-col gap-6 text-left" {...screenVariants}>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => setActiveTab('wallet' as any)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-mid)] bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--border-bright)] transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h2 className="font-orbitron text-xl font-black tracking-widest text-[var(--text)] uppercase">Privacy</h2>
      </div>
      <div className="theme-card flex flex-col gap-6 p-6 text-sm leading-relaxed text-[var(--text-2)]">
        <p>At Crack My Code, we prioritize your privacy and decentralized identity.</p>
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-2">1. Data We Collect</h3>
          <p>We rely on your wallet address as your primary identifier. We track on-chain transactions and basic game history to provide the service.</p>
        </div>
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-2">2. Use of Data</h3>
          <p>Your on-chain data is publicly available on the Celo blockchain. We index and use this data strictly to facilitate gameplay, leaderboards, and dispute resolution.</p>
        </div>
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-2">3. Third Parties</h3>
          <p>We may use minimal third-party analytics (like Plausible or basic logging) to monitor overall application performance. No personally identifiable information (PII) beyond your wallet address is shared or sold.</p>
        </div>
      </div>
    </motion.div>
  );

  const renderContact = () => (
    <motion.div key="contact" className="page-tab flex w-full flex-col gap-6 text-left" {...screenVariants}>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => setActiveTab('wallet' as any)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-mid)] bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--border-bright)] transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h2 className="font-orbitron text-xl font-black tracking-widest text-[var(--text)] uppercase">Contact Us</h2>
      </div>
      <div className="theme-card flex flex-col gap-6 p-6 text-sm leading-relaxed text-[var(--text-2)]">
        <p>If you have any questions, encounter a bug, or need help with a transaction, our support team is available on Telegram.</p>
        <a href="https://t.me/crackmycode" target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#0088cc] px-6 py-4 shadow-sm hover:scale-105 transition-all text-white mt-4">
          <ExternalLink size={20} />
          <span className="font-black uppercase tracking-widest">Open Telegram</span>
        </a>
      </div>
    </motion.div>
  );

  const showBottomNav = splashResolved && !showSplash && (gs.phase === 'lobby' || (gs.phase === 'matchmaking' && gs.gameMode === 'ai'));
  const contentHidden = !splashResolved || showSplash;

  return (
    <main className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {showSplash && (
          <SplashScreen
            key="splash"
            minDurationMs={4500}
            onComplete={handleSplashComplete}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showHowToPlay && gs.phase === 'lobby' && activeTab === 'home' && (
          <HowToPlayModal key="how-to-play" onClose={() => setShowHowToPlay(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSetNameModal &&
          playerProfile?.needsName &&
          gs.phase === 'lobby' &&
          activeTab === 'home' &&
          (payoutAddress || address) && (
            <SetNameModal
              open={showSetNameModal}
              address={String(payoutAddress || address)}
              initialName={playerProfile?.name}
              onClose={() => {
                setShowSetNameModal(false);
              }}
              onSaved={(name) => {
                const statsAddress = payoutAddress || address;
                if (statsAddress) dismissNameModal(statsAddress);
                setPlayerProfile((prev) =>
                  prev ? { ...prev, name, needsName: false } : prev,
                );
                setShowSetNameModal(false);
              }}
            />
          )}
      </AnimatePresence>
      <JoinStakeModal
        open={!!pendingJoinStake}
        stake={pendingJoinStake?.stake ?? 0}
        opponentLabel={pendingJoinStake?.opponentLabel}
        isJoining={!!isJoining && !!pendingJoinStake}
        onConfirm={handleConfirmJoinStake}
        onCancel={() => {
          if (!isJoining) setPendingJoinStake(null);
        }}
      />
      <div
        className={`app-page-scroll w-full ${showBottomNav ? 'app-page-scroll--with-nav' : ''} ${contentHidden ? 'invisible pointer-events-none' : ''}`}
      >
        <div className="relative mx-auto w-full max-w-xl app-page-gutter">
          {activeTab === 'home' ? renderHomeContent() :
            activeTab === 'games' ? renderOpenGames() :
              activeTab === 'leaderboard' ? renderLeaderboard() :
              activeTab === 'wallet' ? renderWalletContent() :
                activeTab === 'stats' ? renderStats() :
                  activeTab === 'terms' ? renderTerms() :
                    activeTab === 'privacy' ? renderPrivacy() :
                      activeTab === 'contact' ? renderContact() :
                        renderAbout()}
        </div>
      </div>

      <BottomNav
        activeTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t);
          if (gs.phase === 'result') handleHome();
        }}
        openGamesCount={myActiveGames.length}
        visible={showBottomNav}
      />
    </main>
  );
}


