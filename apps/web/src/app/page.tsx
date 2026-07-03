'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  CODE_LENGTH,
  GAME_DURATION,
  initialGameState,
  evaluateGuess,
  toTileClues,
  isWinningClues,
  MAX_GUESSES,
  PROFESSIONAL_MODE_ENABLED,
} from '@/lib/game';
import type { Clue, GameMode, GuessEntry, GameState, GamePhase, TileClue } from '@/lib/game';
import { cipherNextGuessAsync, prefetchCipherGuess, warmCipherWorker } from '@/lib/cipher-async';
import { useAccount, useWriteContract, usePublicClient, useBalance, useDisconnect } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { parseUnits, parseEventLogs, encodeFunctionData } from 'viem';
import { CONTRACT_ABI, CONTRACT_ADDRESS, USDT_ADDRESS } from '../../blockchain/constants';
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets';
import { useGuessMyCode } from '../../blockchain/hooks';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
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

export default function Home() {
  const searchParams = useSearchParams();
  const { address: wagmiAddress, isConnected } = useAccount();
  const { login, logout, authenticated, user } = usePrivy();
  const { isMiniPay, isFarcaster } = useMiniAppEnvironment();
  const address = wagmiAddress || user?.wallet?.address;
  const publicClient = usePublicClient();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();
  const { client: smartWalletClient } = useSmartWallets();

  const { data: usdtData } = useBalance({
    address: address as `0x${string}` | undefined,
    token: USDT_ADDRESS as `0x${string}`,
  });
  const [gs, setGs] = useState(() => initialGameState());
  const [playerStatsLoaded, setPlayerStatsLoaded] = useState(false);
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = activeTab === 'home' ? '/' : `/${activeTab}`;
      if (window.location.pathname !== path) {
        window.history.pushState(null, '', path);
      }
    }
  }, [activeTab]);
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
    if (!authenticated || !address) return;
    try {
      const [activeRes, historyRes] = await Promise.all([
        fetch(`/api/games/my-active?address=${address}`),
        fetch(`/api/games/history?address=${address}`)
      ]);
      const activeData = await activeRes.json();
      const historyData = await historyRes.json();
      setMyActiveGames(Array.isArray(activeData) ? activeData : []);
      setGameHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      console.error('Games data fetch failed', err);
    }
  }, [authenticated, address]);

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
    if (!address) return null;
    try {
      const res = await fetch(
        `/api/users/stats?address=${encodeURIComponent(address)}`,
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
  }, [address]);

  useEffect(() => {
    if (!address) {
      setPlayerStatsLoaded(false);
      return;
    }

    let cancelled = false;
    setPlayerStatsLoaded(false);

    refreshUserStats().finally(() => {
      if (!cancelled) setPlayerStatsLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [address, refreshUserStats]);

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
      result?: 'win' | 'lose' | null;
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
              : scoreDeltaForMode(mode, false);

          if (isRegisteredPlayer(addressRef.current) && prev.phase === 'playing') {
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

  useEffect(() => {
    if (!currentGameId || gs.gameMode === 'ai') return;

    const channelName = `private-game-${currentGameId}`;
    const channel = pusherClient.subscribe(channelName);

    const onTyping = (data: { input: number[] }) => {
      setGs((prev: GameState) => ({ ...prev, opponentCurrentInput: data.input }));
    };

    const onOpponentGuess = (data: {
      digits: number[];
      clues: Clue[];
      tileClues?: TileClue[];
      sender: string;
      nextTurnAddress?: string;
      revealCode?: number[];
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
  }, [currentGameId, gs.gameMode, syncResultStats, scheduleTurnHandover]);

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

  const emitTyping = (input: number[]) => {
    if (!currentGameId || gs.gameMode === 'ai') return;
    const channel = pusherClient.channel(`private-game-${currentGameId}`);
    if (channel) {
      channel.trigger('client-typing', { input });
    }
  };

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
      setRematchStatus('declined');
      setRematchLoading(false);
      toast.error('Rematch declined', {
        description: `${gsRef.current.opponentName} declined the rematch.`,
      });
    });

    channel.bind('rematch-started', (data: { gameId: string; opponentAddress: string; mode?: string; stake?: number }) => {
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
    if (gs.phase !== 'matchmaking' || !currentGameId || gs.gameMode === 'ai') return;

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
  }, [gs.phase, currentGameId, gs.gameMode, handleMatchFound]);

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

    const effectiveAddress = address || 'GUEST';
    setCurrentGameId(null);
    setCurrentOnChainMatchId(null);

    try {
      let onChainMatchId: string | undefined;

      // --- ON-CHAIN: Create Challenge ---
      if (mode !== 'ai' && isConnected) {
        const isPaid = mode === 'cash';
        const stakeAmt = parseUnits(stake.toString(), 6);
        console.log("the paid status", isPaid);


        let receipt;

        if (smartWalletClient) {
          const data = encodeFunctionData({
            abi: CONTRACT_ABI,
            functionName: 'createChallenge',
            args: [isPaid, stakeAmt]
          });
          const txHash = await smartWalletClient.sendTransaction({
            to: CONTRACT_ADDRESS as `0x${string}`,
            data: data,
            value: BigInt(0)
          });
          if (!publicClient) throw new Error("Public client not available");
          receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
        } else {
          const hash = await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'createChallenge',
            args: [isPaid, stakeAmt],
          });
          if (!publicClient) throw new Error("Public client not available");
          receipt = await publicClient.waitForTransactionReceipt({ hash });
        }

        const logs = parseEventLogs({
          abi: CONTRACT_ABI,
          eventName: 'ChallengeCreated',
          logs: receipt.logs,
        });

        if (logs.length > 0) {
          onChainMatchId = logs[0].args.matchId;
          setCurrentOnChainMatchId(onChainMatchId);
        }
      }

      const res = await fetch('/api/games/find-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: effectiveAddress,
          mode,
          stake,
          onChainMatchId, // Synchronize with blockchain
          isPublic
        })
      });

      const data = await res.json();

      if (!res.ok) {
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
  }, [address, isConnected, smartWalletClient, publicClient, writeContractAsync, handleMatchFound, fetchMyActive]);

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gs.phase === 'matchmaking') {
      interval = setInterval(() => {
        setSearchTime(prev => {
          const timeout = (gs.opponentName === 'WAITING' || gs.gameMode === 'cash') ? 300 : 60;

          if (prev >= timeout) {
            clearInterval(interval);
            void handleCancelMatchmaking({ fromTimeout: true });
            toast.error("Matchmaking Timeout", {
              description: gs.opponentName === 'WAITING'
                ? "Invite expired. No one joined in time."
                : "No opponents found. Try again or invite a friend."
            });
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setSearchTime(0);
    }
    return () => clearInterval(interval);
  }, [gs.phase, gs.gameMode, gs.opponentName, handleCancelMatchmaking]);

  const handleQuitGame = useCallback(() => {
    if (window.confirm("Are you sure you want to quit the game?")) {
      clearOppTimer();
      clearTurnHandover();
      setGs(initialGameState(gs.playerPoints));
      setCurrentGameId(null);
      setCurrentOnChainMatchId(null);
    }
  }, [gs.playerPoints, clearTurnHandover]);

  // ─── Phase: SetCode → Playing ─────────────────────────────────────────────

  const handleLockCode = useCallback(async (code: number[]) => {
    if (!currentGameId) return;
    if (!address && gs.gameMode !== 'ai') return;

    const effectiveAddress = address || 'GUEST';

    setGs((prev: GameState) => ({ ...prev, playerCode: code }));

    // For AI games, skip the synchronizing modal and go straight to playing
    if (gs.gameMode === 'ai') {
      warmCipherWorker();
      setGs((prev: GameState): GameState => ({ ...prev, phase: 'playing' }));
      // Do the server lock-code in the background without blocking
      fetch('/api/games/lock-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: currentGameId, address: effectiveAddress, code: code.join('') })
      }).catch(err => console.error('Failed to lock AI code', err));
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
  }, [currentGameId, address, gs.gameMode]);

  // ─── Phase: Playing — submit guess ────────────────────────────────────────

  const handleSubmitGuess = useCallback(async (digits: number[]) => {
    if (!gs.isPlayerTurn || gs.phase !== 'playing' || isSubmitting || turnLockedRef.current) return;
    if (digits.length !== CODE_LENGTH) return;

    setIsSubmitting(true);
    isSubmittingRef.current = true;

    try {
    // 1. Send guess to server
    if (currentGameId) {
      try {
        const res = await fetch('/api/games/submit-guess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: currentGameId, digits, playerAddress: address || 'GUEST' })
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
            const reachedMax = newGuesses.length >= MAX_GUESSES;

            if (won) {
              clearOppTimer();
              return {
                ...prev,
                playerGuesses: newGuesses,
                phase: 'result',
                result: 'win',
                ratingDelta: isRegisteredPlayer(address) ? scoreDeltaForMode(mode, true) : 0,
                currentInput: [],
                opponentCode: data.opponentCode,
              };
            }

            if (reachedMax) {
              return {
                ...prev,
                playerGuesses: newGuesses,
                isPlayerTurn: false,
              };
            }

            if (prev.gameMode === 'ai') {
              playerReviewUntilRef.current = Date.now() + PLAYER_GUESS_REVIEW_MS;
              return { ...prev, playerGuesses: newGuesses, isPlayerTurn: false, currentInput: [] };
            }

            return { ...prev, playerGuesses: newGuesses, currentInput: [] };
          });

          if (won) {
            if (isRegisteredPlayer(address)) {
              await syncResultStats(scoreDeltaForMode(mode, true));
            }
          } else if (gs.playerGuesses.length + 1 >= MAX_GUESSES) {
            const loss = scoreDeltaForMode(mode, false);
            try {
              const revealRes = await fetch('/api/games/reveal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: currentGameId, address: address || 'GUEST' }),
              });
              const revealData = await revealRes.json();
              setGs((prev: GameState) => ({
                ...prev,
                phase: 'result',
                result: 'lose',
                ratingDelta: isRegisteredPlayer(address) ? loss : 0,
                currentInput: [],
                opponentCode: revealData.opponentCode || [],
              }));
              if (isRegisteredPlayer(address)) {
                await syncResultStats(loss);
              }
            } catch (revealErr) {
              console.error('Reveal after max guesses failed', revealErr);
            }
          } else if (gs.gameMode !== 'ai') {
            scheduleTurnHandover(false);
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
  }, [gs, currentGameId, address, isSubmitting, syncResultStats, scheduleTurnHandover]);

  // ─── Number pad: add / remove digit ──────────────────────────────────────

  const handleDigitPress = useCallback((digit: number) => {
    if (turnLockedRef.current) return;
    setGs((prev: GameState) => {
      if (!prev.isPlayerTurn || prev.phase !== 'playing') return prev;
      if (prev.currentInput.length >= CODE_LENGTH) return prev;
      const newInput = [...prev.currentInput, digit];
      emitTyping(newInput);
      return { ...prev, currentInput: newInput };
    });
  }, [currentGameId, gs.gameMode]); // eslint-disable-line

  const handleDeleteDigit = useCallback(() => {
    setGs((prev: GameState) => {
      const newInput = prev.currentInput.slice(0, -1);
      emitTyping(newInput);
      return { ...prev, currentInput: newInput };
    });
  }, [currentGameId, gs.gameMode]); // eslint-disable-line

  // ─── Phase: Result → Lobby ────────────────────────────────────────────────

  const exitResultScreen = useCallback(() => {
    clearOppTimer();
    clearTurnHandover();
    const points = resultStats?.pointsAfter ?? gs.playerPoints;
    setGs(initialGameState(points));
    setResultStats(null);
    setRematchStatus('idle');
    setRematchLoading(false);
    setCurrentGameId(null);
    setShareableJoinCode(null);
    opponentAddressRef.current = null;
    if (address) void refreshUserStats();
  }, [gs.playerPoints, resultStats, address, refreshUserStats, clearTurnHandover]);

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
      }
    } catch (err) {
      setRematchStatus('idle');
      toast.error('Rematch failed', { description: getErrorMessage(err) });
    } finally {
      setRematchLoading(false);
    }
  }, [currentGameId, address, gs.gameMode, gs.stakeAmount, handleMatchFound]);

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

  const executeJoinGame = useCallback(async (gameData: {
    id: string;
    mode: string;
    stake: number;
    player1Address: string;
  }) => {
    const actualChallenger = gameData.player1Address;
    const isPaid = gameData.mode === 'cash';
    const joinMode: GameMode = isPaid ? 'cash' : 'fun';
    const stake = parseFloat(String(gameData.stake)) || 0;

    if (isPaid) {
      if (smartWalletClient) {
        const data = encodeFunctionData({
          abi: CONTRACT_ABI,
          functionName: 'joinChallenge',
          args: [actualChallenger as `0x${string}`],
        });
        const txHash = await smartWalletClient.sendTransaction({
          to: CONTRACT_ADDRESS as `0x${string}`,
          data,
          value: BigInt(0),
        });
        if (!publicClient) throw new Error('Public client not available');
        await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      } else {
        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'joinChallenge',
          args: [actualChallenger as `0x${string}`],
        });
        if (!publicClient) throw new Error('Public client not available');
        await publicClient.waitForTransactionReceipt({ hash });
      }
    }

    const res = await fetch('/api/games/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, gameId: gameData.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Join failed');

    if (data.status === 'matched') {
      setJoinGameIdInput('');
      setPendingJoinStake(null);
      handleMatchFound(data.gameId, data.opponentAddress, { mode: joinMode, stake });
      setActiveTab('home');
      toast.success('Joined!', {
        description: isPaid
          ? 'Stake locked. Set your secret code to start.'
          : 'Set your secret code — game starts when both players lock in.',
      });
    }
  }, [smartWalletClient, publicClient, writeContractAsync, address, handleMatchFound]);

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
      toast.error('Join Error', { description: errMsg });
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
      toast.error('Join Error', { description: errMsg });
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

  const renderHomeContent = () => {
    return gs.phase === 'lobby' || gs.phase === 'matchmaking' ? (
      <motion.div key="lobby" className="w-full relative flex flex-col gap-4" {...screenVariants}>
        <Lobby
          rating={gs.playerPoints}
          points={gs.playerPoints}
          pointsLoading={pointsLoading}
          isMatchmaking={gs.phase === 'matchmaking'}
          opponentName={gs.opponentName}
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
          isJoining={!!isJoining}
        />
      </motion.div>
    ) : gs.phase === 'setCode' ? (
      <motion.div key="setcode" className="w-full relative" {...screenVariants}>
        <SetCode
          opponentName={gs.opponentName}
          onLockCode={handleLockCode}
          onBack={() => {
            clearOppTimer();
            clearTurnHandover();
            setGs(initialGameState(gs.playerPoints));
            setCurrentGameId(null);
            setShareableJoinCode(null);
            setCurrentOnChainMatchId(null);
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
    <motion.div key="games" className="page-tab flex w-full flex-col gap-6 px-5 text-left" {...screenVariants}>
      {!address ? (
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

          {openGamesTab === 'active' ? (
            <OpenChallengesList
              isConnected={!!isConnected}
              myActiveGames={myActiveGames}
              onCancelOpenChallenge={handleCancelOpenChallenge}
              isCancellingId={isCancelling}
            />
          ) : (
            <MatchHistoryList games={gameHistory} address={address} />
          )}
        </>
      )}
    </motion.div>
  );

  const renderLeaderboard = () => (
    <motion.div key="leaderboard" className="page-tab flex w-full flex-col gap-4 px-5" {...screenVariants}>
      <LeaderboardPanel currentAddress={address} />
    </motion.div>
  );

  const renderAbout = () => (
    <motion.div key="about" className="page-tab flex w-full flex-col gap-6 px-5" {...screenVariants}>
      <AboutHowToPlay />
    </motion.div>
  );

  const renderWalletContent = () => (
    <motion.div key="wallet" className="page-tab flex w-full flex-col gap-5 px-5 text-left" {...screenVariants}>
      <SettingsPanel
        address={address}
        points={gs.playerPoints}
        pointsLoading={pointsLoading}
        usdtFormatted={usdtData?.formatted}
        copied={copied}
        onLogin={() => login()}
        onCopyAddress={() => {
          if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        }}
        onTabChange={setActiveTab}
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
    <motion.div key="stats" className="page-tab flex w-full flex-col gap-6 px-5 text-left" {...screenVariants}>
      <StatsPanel address={address} onBack={() => setActiveTab('wallet')} />
    </motion.div>
  );

  const renderTerms = () => (
    <motion.div key="terms" className="page-tab flex w-full flex-col gap-6 px-5 text-left" {...screenVariants}>
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
    <motion.div key="privacy" className="page-tab flex w-full flex-col gap-6 px-5 text-left" {...screenVariants}>
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
    <motion.div key="contact" className="page-tab flex w-full flex-col gap-6 px-5 text-left" {...screenVariants}>
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

  const showBottomNav = gs.phase === 'lobby' || gs.phase === 'matchmaking';

  return (
    <main className="relative flex h-full min-h-0 flex-col overflow-hidden">
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
        className={`app-page-scroll w-full ${showBottomNav ? 'app-page-scroll--with-nav' : ''}`}
      >
        <div className="relative mx-auto w-full max-w-xl px-4">
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
        visible={showBottomNav}
      />
    </main>
  );
}


