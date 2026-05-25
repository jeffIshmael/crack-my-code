'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Lobby from '@/components/Lobby';
import { normalizeJoinCodeInput } from '@/lib/join-code';
import JoinStakeModal from '@/components/JoinStakeModal';
import OpenGamesPanel from '@/components/OpenGamesPanel';
import Image from 'next/image';
import SetCode from '@/components/SetCode';
import GameBoard from '@/components/GameBoard';
import ResultModal from '@/components/ResultModal';
import { BottomNav, type NavTab } from '@/components/BottomNav';
import {
  CODE_LENGTH,
  GAME_DURATION,
  initialGameState,
  evaluateGuess,
  toTileClues,
  isWinningClues,
  cipherNextGuess,
  MAX_GUESSES,
  PROFESSIONAL_MODE_ENABLED,
} from '@/lib/game';
import type { GameMode, GuessEntry, GameState, GamePhase, TileClue } from '@/lib/game';
import { useAccount, useWriteContract, usePublicClient, useBalance, useSendTransaction } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { parseUnits, parseEventLogs, encodeFunctionData, parseEther } from 'viem';
import { CONTRACT_ABI, CONTRACT_ADDRESS, USDT_ADDRESS } from '../../blockchain/constants';
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets';
import { useGuessMyCode } from '../../blockchain/hooks';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { Wallet, LogOut, ExternalLink, ShieldCheck, Copy, Check, History, Send, ArrowLeft, Activity, Users, Zap, BarChart2, ChevronRight } from 'lucide-react';

// ─── Settings ───────────────────────────────────────────────────────────────

const MATCHMAKING_MS = 2400;

const screenVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.3, ease: 'easeIn' } },
};

import { pusherClient } from '@/lib/pusher-client';

export default function Home() {
  const searchParams = useSearchParams();
  const { address: wagmiAddress, isConnected } = useAccount();
  const { login, logout, authenticated, user } = usePrivy();
  const address = wagmiAddress || user?.wallet?.address;
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const { client: smartWalletClient } = useSmartWallets();

  const { data: celoData } = useBalance({
    address: address as `0x${string}` | undefined,
  });

  const { data: usdtData } = useBalance({
    address: address as `0x${string}` | undefined,
    token: USDT_ADDRESS as `0x${string}`,
  });
  const [gs, setGs] = useState(() => initialGameState());
  const gsRef = useRef(gs);
  useEffect(() => { gsRef.current = gs; }, [gs]);

  const aiTurnRunningRef = useRef(false);
  const playerReviewUntilRef = useRef(0);
  const PLAYER_GUESS_REVIEW_MS = 2800;

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace('/', '');
      if (['games', 'wallet', 'about', 'stats', 'terms', 'privacy', 'contact'].includes(path)) {
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
  const [myActiveGames, setMyActiveGames] = useState<any[]>([]);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [countdown, setCountdown] = useState<number | 'GO' | null>(null);
  const [currentOnChainMatchId, setCurrentOnChainMatchId] = useState<string | null>(null);
  const [turnNotification, setTurnNotification] = useState<'player' | 'opponent' | null>(null);
  const [pendingOpponentTileClues, setPendingOpponentTileClues] = useState<TileClue[] | null>(null);
  const [copied, setCopied] = useState(false);

  const matchStartStatsRef = useRef({ points: 1000, rating: 1000 });
  const [resultStats, setResultStats] = useState<{
    pointsBefore: number;
    pointsAfter: number;
    rating: number;
    loading: boolean;
  } | null>(null);

  const [isSendSectionOpen, setIsSendSectionOpen] = useState(false);
  const [sendTab, setSendTab] = useState<'celo' | 'usdt'>('usdt');
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!sendAddress || !sendAmount) return;
    setIsSending(true);
    console.log("[handleSend] Initializing", {
      sendTab,
      sendAddress,
      sendAmount,
      hasSmartWallet: !!smartWalletClient,
      celoBalance: celoData?.formatted,
      usdtBalance: usdtData?.formatted,
    });
    try {
      if (sendTab === 'celo') {
        const celoAddress = "0x471ece3750da237f93b8e339c536989b8978a438" as `0x${string}`;
        const amount = parseEther(sendAmount);
        console.log("[handleSend] Sending CELO via ERC20", { amount: amount.toString() });
        const ERC20_TRANSFER_ABI = [{ "constant": false, "inputs": [ { "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" } ], "name": "transfer", "outputs": [ { "name": "", "type": "bool" } ], "type": "function" }] as const;

        if (smartWalletClient) {
            console.log("[handleSend] Using smartWalletClient for CELO ERC20");
            const data = encodeFunctionData({
              abi: ERC20_TRANSFER_ABI,
              functionName: 'transfer',
              args: [sendAddress as `0x${string}`, amount]
            });
            const txHash = await smartWalletClient.sendTransaction({
              to: celoAddress,
              data: data,
              value: BigInt(0),
              type: 'legacy'
            });
            console.log("[handleSend] smartWalletClient CELO txHash", txHash);
            if (!publicClient) throw new Error("Public client not available");
            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
            console.log("[handleSend] smartWalletClient receipt", receipt);
        } else {
            console.log("[handleSend] Using writeContractAsync for CELO ERC20");
            const hash = await writeContractAsync({
              address: celoAddress,
              abi: ERC20_TRANSFER_ABI,
              functionName: 'transfer',
              args: [sendAddress as `0x${string}`, amount],
              type: 'legacy'
            });
            console.log("[handleSend] writeContractAsync CELO hash", hash);
            if (!publicClient) throw new Error("Public client not available");
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            console.log("[handleSend] receipt", receipt);
        }
      } else {
        const amount = parseUnits(sendAmount, 6); // assuming 6 decimals for USDT on Celo
        console.log("[handleSend] Sending USDT", { amount: amount.toString() });
        const ERC20_TRANSFER_ABI = [{ "constant": false, "inputs": [ { "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" } ], "name": "transfer", "outputs": [ { "name": "", "type": "bool" } ], "type": "function" }] as const;

        if (smartWalletClient) {
            console.log("[handleSend] Using smartWalletClient for USDT");
            const data = encodeFunctionData({
              abi: ERC20_TRANSFER_ABI,
              functionName: 'transfer',
              args: [sendAddress as `0x${string}`, amount]
            });
            const txHash = await smartWalletClient.sendTransaction({
              to: USDT_ADDRESS as `0x${string}`,
              data: data,
              value: BigInt(0),
              type: 'legacy'
            });
            console.log("[handleSend] smartWalletClient USDT txHash", txHash);
            if (!publicClient) throw new Error("Public client not available");
            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
            console.log("[handleSend] smartWalletClient USDT receipt", receipt);
        } else {
            console.log("[handleSend] Using writeContractAsync for USDT");
            const hash = await writeContractAsync({
              address: USDT_ADDRESS,
              abi: ERC20_TRANSFER_ABI,
              functionName: 'transfer',
              args: [sendAddress as `0x${string}`, amount],
              type: 'legacy'
            });
            console.log("[handleSend] writeContractAsync USDT hash", hash);
            if (!publicClient) throw new Error("Public client not available");
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            console.log("[handleSend] receipt", receipt);
        }
      }
      toast.success("Transaction successful!");
      setIsSendSectionOpen(false);
      setSendAmount('');
      setSendAddress('');
    } catch (err: any) {
      console.error("[handleSend] Error caught:", err);
      const debugMsg = err?.message || err?.shortMessage || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      alert("DEBUG ERROR: " + debugMsg);
      toast.error("Send failed", { 
        description: debugMsg,
        duration: 10000
      });
    } finally {
      setIsSending(false);
    }
  };

  const { cancelChallenge } = useGuessMyCode();

  const clearOppTimer = () => { if (oppTimerRef.current) clearTimeout(oppTimerRef.current); };

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

  // 1.5 User Registration / Fetch Rating
  useEffect(() => {
    if (authenticated && address) {
      const register = async () => {
        try {
          const res = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address })
          });
          const data = await res.json();
          if (data.rating !== undefined && data.points !== undefined) {
            setGs(prev => ({
              ...prev,
              playerRating: data.rating,
              playerPoints: data.points
            }));
          }
        } catch (err) {
          console.error('Registration failed', err);
        }
      };
      register();
    }
  }, [authenticated, address]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gs.phase === 'matchmaking') {
      interval = setInterval(() => {
        setSearchTime(prev => {
          // Public search timeout: 60s, Private search timeout: 300s (5m)
          const timeout = (gs.opponentName === 'WAITING' || gs.gameMode === 'cash') ? 300 : 60;
          
          if (prev >= timeout) {
            clearInterval(interval);
            setGs(curr => ({ ...curr, phase: 'lobby' }));
            toast.error("Matchmaking Timeout", {
              description: gs.opponentName === 'WAITING' ? "Invite expired. No one joined in time." : "No opponents found. Try again or invite a friend."
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
  }, [gs.phase, gs.gameMode, gs.opponentName]);

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
    if (gs.phase === 'playing' && !snappedMatchStatsRef.current) {
      matchStartStatsRef.current = {
        points: gs.playerPoints,
        rating: gs.playerRating,
      };
      snappedMatchStatsRef.current = true;
    }
    if (gs.phase !== 'playing' && gs.phase !== 'result') {
      snappedMatchStatsRef.current = false;
    }
  }, [gs.phase, gs.playerPoints, gs.playerRating]);

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

  const updateBackendPoints = useCallback(async (rDelta: number, pDelta: number) => {
    if (!address) return;
    try {
      await fetch('/api/users/update-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, ratingDelta: rDelta, pointsDelta: pDelta })
      });
    } catch (err) {
      console.error('Failed to update points on backend', err);
    }
  }, [address]);

  const refreshUserStats = useCallback(async (): Promise<{
    points: number;
    rating: number;
  } | null> => {
    if (!address) return null;
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (data.rating !== undefined && data.points !== undefined) {
        setGs((prev) => ({
          ...prev,
          playerRating: data.rating,
          playerPoints: data.points,
        }));
        return { points: data.points, rating: data.rating };
      }
    } catch (err) {
      console.error('Failed to refresh user stats', err);
    }
    return null;
  }, [address]);

  const syncResultStats = useCallback(
    async (ratingDelta: number, serverStats?: { points: number; rating: number } | null) => {
      const before = matchStartStatsRef.current;
      setResultStats({
        pointsBefore: before.points,
        pointsAfter: before.points,
        rating: before.rating,
        loading: true,
      });

      const stats = serverStats ?? (await refreshUserStats());
      const afterPoints = stats?.points ?? before.points + ratingDelta;
      const afterRating = stats?.rating ?? before.rating + ratingDelta;

      setResultStats({
        pointsBefore: before.points,
        pointsAfter: afterPoints,
        rating: afterRating,
        loading: false,
      });

      if (stats) {
        setGs((prev) => ({
          ...prev,
          playerPoints: stats.points,
          playerRating: stats.rating,
        }));
      }
    },
    [refreshUserStats]
  );

  // ─── Real-time Gameplay Logic ───────────────────────────────────────────

  useEffect(() => {
    if (!currentGameId || gs.gameMode === 'ai') return;

    const channel = pusherClient.subscribe(`private-game-${currentGameId}`);

    channel.bind('client-typing', (data: { input: number[] }) => {
      setGs((prev: GameState) => ({ ...prev, opponentCurrentInput: data.input }));
    });

    channel.bind('opponent-guess', (data: { digits: number[], clues: any[], tileClues?: TileClue[], sender: string }) => {
      if (data.sender === address) return;
      setGs((prev: GameState) => {
        const entry: GuessEntry = {
          digits: data.digits,
          clues: data.clues as any[],
          tileClues: data.tileClues,
          id: `opp-${Date.now()}`,
        };
        const newGuesses = [...prev.opponentGuesses, entry];

        if (isWinningClues(data.clues)) {
          const delta = prev.gameMode === 'ai' ? -5 : -15;
          if (prev.gameMode === 'ai') {
            updateBackendPoints(delta, delta * 2);
            void syncResultStats(delta);
          }

          // Reveal code on loss
          fetch('/api/games/reveal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: currentGameId, address: address || 'GUEST' })
          })
            .then(res => res.json())
            .then(revealData => {
              setGs(curr => ({
                ...curr,
                opponentGuesses: newGuesses,
                phase: 'result',
                result: 'lose',
                ratingDelta: delta,
                opponentCurrentInput: [],
                opponentCode: revealData.opponentCode || []
              }));
              if (prev.gameMode !== 'ai') {
                void syncResultStats(delta);
              }
            });

          return {
            ...prev,
            opponentGuesses: newGuesses,
            opponentCurrentInput: []
          };
        }

        return {
          ...prev,
          opponentGuesses: newGuesses,
          opponentGuessCount: prev.opponentGuessCount + 1,
          isPlayerTurn: true,
          opponentCurrentInput: []
        };
      });
    });

    channel.bind('game-started', () => {
      setIsWaiting(false);
      setGs((prev: GameState): GameState => ({ ...prev, phase: 'countdown' }));
    });

    return () => {
      pusherClient.unsubscribe(`private-game-${currentGameId}`);
    };
  }, [currentGameId, gs.gameMode, address, updateBackendPoints, syncResultStats]);

  // Turn notification effect
  useEffect(() => {
    if (gs.phase === 'playing') {
      if (gs.gameMode === 'ai') {
        setTurnNotification(null);
        return;
      }
      setTurnNotification(gs.isPlayerTurn ? 'player' : 'opponent');
      const timer = setTimeout(() => setTurnNotification(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [gs.isPlayerTurn, gs.phase, gs.gameMode]);

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
    if (aiTurnRunningRef.current) return;
    clearOppTimer();

    const waitForPlayerReview = Math.max(0, playerReviewUntilRef.current - Date.now());

    oppTimerRef.current = setTimeout(() => {
      const currentGs = gsRef.current;
      if (currentGs.phase !== 'playing' || currentGs.isPlayerTurn) return;

      const history = currentGs.opponentGuesses;
      const playerCode = currentGs.playerCode;
      if (!playerCode || playerCode.length === 0) return;

      aiTurnRunningRef.current = true;

      const targetDigits = cipherNextGuess(history);

      let typeIndex = 0;
      const typeDigit = () => {
        if (typeIndex < CODE_LENGTH) {
          setGs((prev: GameState) => ({
            ...prev,
            opponentCurrentInput: [...prev.opponentCurrentInput, targetDigits[typeIndex]],
          }));
          typeIndex++;
          oppTimerRef.current = setTimeout(typeDigit, 320);
        } else {
          const clues = evaluateGuess(targetDigits, gsRef.current.playerCode);
          const tileClues = toTileClues(targetDigits, gsRef.current.playerCode);
          setPendingOpponentTileClues(tileClues);

          const won = isWinningClues(clues);
          const revealMs = won ? 1400 : 1800;

          oppTimerRef.current = setTimeout(() => {
            const entry: GuessEntry = {
              digits: targetDigits,
              clues,
              tileClues,
              id: `opp-${Date.now()}`,
            };

            if (won) {
              clearOppTimer();
              aiTurnRunningRef.current = false;
              setPendingOpponentTileClues(null);
              updateBackendPoints(-5, -10);

              setGs((prev: GameState) => ({
                ...prev,
                phase: 'result',
                result: 'lose',
                ratingDelta: -5,
                opponentGuesses: [...prev.opponentGuesses, entry],
                opponentGuessCount: prev.opponentGuessCount + 1,
                opponentCurrentInput: [],
                opponentCode: prev.playerCode,
                isPlayerTurn: false,
              }));
              void syncResultStats(-5);

              fetch('/api/games/reveal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: currentGameId, address: address || 'GUEST' }),
              }).catch((err) => console.error('AI reveal sync failed', err));
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
            aiTurnRunningRef.current = false;
          }, revealMs);
        }
      };

      setGs((prev: GameState) => ({ ...prev, opponentCurrentInput: [] }));
      typeDigit();
    }, waitForPlayerReview);
  }, [currentGameId, address, updateBackendPoints, syncResultStats]);

  // AI Turn Trigger
  useEffect(() => {
    if (gs.phase === 'playing' && !gs.isPlayerTurn && gs.gameMode === 'ai') {
      scheduleOpponentTurn();
    }
    if (gs.isPlayerTurn || gs.phase !== 'playing') {
      aiTurnRunningRef.current = false;
    }
  }, [gs.phase, gs.isPlayerTurn, gs.gameMode, scheduleOpponentTurn]);

  // ─── Phase: Lobby → Matchmaking ───────────────────────────────────────────

  const handleMatchFound = useCallback((
    gameId: string,
    opponentAddress: string,
    meta?: { mode?: GameMode; stake?: number }
  ) => {
    setCurrentGameId(gameId);
    setResultStats(null);
    const isAIMatch = opponentAddress === 'AI_BOT' || opponentAddress === 'AI';
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
  }, []);

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

    return () => {
      channel.unbind('match-found');
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

  const handleCancelChallenge = async (gameId: string, onChainMatchId?: string) => {
    if (!isConnected || !address) return;
    setIsCancelling(gameId);
    try {
      if (onChainMatchId) {
        // --- ON-CHAIN: Cancel Challenge ---
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
      }

      const res = await fetch('/api/games/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId })
      });

      if (res.ok) {
        setMyActiveGames(prev => prev.filter(g => g.id !== gameId));
      }
    } catch (err) {
      console.error('Cancel failed', err);
      toast.error('Cancel Failed', { description: getErrorMessage(err) });
    } finally {
      setIsCancelling(null);
    }
  };

  const handleFindMatch = async (mode: GameMode, stake: number, isPublic: boolean = true, userBalance?: number) => {
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
        if (!isPublic) fetchMyActive();
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
  };

  const handleCancelMatchmaking = useCallback(async () => {
    if (currentGameId) {
      await handleCancelChallenge(currentGameId, currentOnChainMatchId || undefined);
    }
    setGs((prev: GameState): GameState => ({ ...prev, phase: 'lobby' }));
    setSearchTime(0);
    setCurrentGameId(null);
    setShareableJoinCode(null);
    setCurrentOnChainMatchId(null);
    toast.info("Search Cancelled");
  }, [currentGameId, currentOnChainMatchId, handleCancelChallenge]);

  const handleQuitGame = useCallback(() => {
    if (window.confirm("Are you sure you want to quit the game?")) {
      clearOppTimer();
      setGs(initialGameState(gs.playerRating, gs.playerPoints));
      setCurrentGameId(null);
      setCurrentOnChainMatchId(null);
    }
  }, [gs.playerRating, gs.playerPoints]);

  // ─── Phase: SetCode → Playing ─────────────────────────────────────────────

  const handleLockCode = useCallback(async (code: number[]) => {
    if (!currentGameId) return;
    if (!address && gs.gameMode !== 'ai') return;

    const effectiveAddress = address || 'GUEST';

    setGs((prev: GameState) => ({ ...prev, playerCode: code }));

    // For AI games, skip the synchronizing modal and go straight to playing
    if (gs.gameMode === 'ai') {
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
    if (!gs.isPlayerTurn || gs.phase !== 'playing' || isSubmitting) return;
    if (digits.length !== CODE_LENGTH) return;

    setIsSubmitting(true);

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
          const clues = data.clues;
          const entry: GuessEntry = {
            digits,
            clues: data.clues as any[],
            tileClues: data.tileClues,
            id: `${Date.now()}`,
          };
          const newGuesses = [...gs.playerGuesses, entry];

          setGs((prev: GameState) => {
            // Win check
            if (isWinningClues(clues)) {
              clearOppTimer();
              const delta = gs.gameMode === 'ai' ? 10 : 25;
              if (gs.gameMode === 'ai') {
                updateBackendPoints(delta, delta * 2);
                void syncResultStats(delta);
              } else {
                void syncResultStats(delta, data.playerStats ?? null);
              }

              return {
                ...prev,
                playerGuesses: newGuesses,
                phase: 'result',
                result: 'win',
                ratingDelta: delta,
                currentInput: [],
                opponentCode: data.opponentCode // Revealed by server
              };
            }

            // Max guesses exhausted?
            if (newGuesses.length >= MAX_GUESSES) {
              const delta = gs.gameMode === 'ai' ? -5 : -15;
              if (gs.gameMode === 'ai') {
                updateBackendPoints(delta, delta * 2);
                void syncResultStats(delta);
              }

              // Reveal the code even on loss
              fetch('/api/games/reveal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: currentGameId, address: address || 'GUEST' })
              })
                .then(res => res.json())
                .then(data => {
                  setGs((prev: GameState) => ({
                    ...prev,
                    playerGuesses: newGuesses,
                    phase: 'result',
                    result: 'lose',
                    ratingDelta: delta,
                    currentInput: [],
                    opponentCode: data.opponentCode || []
                  }));
                  if (prev.gameMode !== 'ai') void syncResultStats(delta);
                });
              return { ...prev, playerGuesses: newGuesses, isPlayerTurn: false };
            }

            // Hold on your board so you can read green/yellow/gray feedback before Cipher moves
            if (prev.gameMode === 'ai') {
              playerReviewUntilRef.current = Date.now() + PLAYER_GUESS_REVIEW_MS;
            }
            return { ...prev, playerGuesses: newGuesses, isPlayerTurn: false, currentInput: [] };
          });
        }
      } catch (err) {
        console.error('Failed to submit guess', err);
        toast.error('Submission Failed', { description: getErrorMessage(err) });
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [gs, currentGameId, address, scheduleOpponentTurn, isSubmitting, updateBackendPoints, syncResultStats]);

  // ─── Number pad: add / remove digit ──────────────────────────────────────

  const handleDigitPress = useCallback((digit: number) => {
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
    const rating = resultStats?.rating ?? gs.playerRating;
    const points = resultStats?.pointsAfter ?? gs.playerPoints;
    setGs(initialGameState(rating, points));
    setResultStats(null);
    setCurrentGameId(null);
    setShareableJoinCode(null);
  }, [gs.playerRating, gs.playerPoints, resultStats]);

  const handlePlayAgain = useCallback(() => {
    if (gs.gameMode !== 'ai') return;
    exitResultScreen();
    setTimeout(() => {
      handleFindMatch('ai', 0, true);
    }, 100);
  }, [gs.gameMode, exitResultScreen, handleFindMatch]);

  const handleHome = useCallback(() => {
    exitResultScreen();
  }, [exitResultScreen]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => () => { clearOppTimer(); }, []); // eslint-disable-line

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

  const executeJoinGame = async (gameData: {
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
  };

  const handleJoinChallenge = async (gameIdOrCode: string) => {
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
  };

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
  }, [joinGameIdInput, isConnected, address, login]);

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

  const renderHomeContent = () => {
    return gs.phase === 'lobby' || gs.phase === 'matchmaking' ? (
      <motion.div key="lobby" className="w-full relative flex flex-col gap-4" {...screenVariants}>
        <Lobby
          rating={gs.playerRating}
          points={gs.playerPoints}
          isMatchmaking={gs.phase === 'matchmaking'}
          opponentName={gs.opponentName}
          onFindMatch={handleFindMatch}
          onMatchFound={handleMatchFound}
          onWalletClick={() => setActiveTab('wallet')}
          searchTime={searchTime}
          onCancelMatchmaking={handleCancelMatchmaking}
          shareableJoinCode={
            shareableJoinCode ??
            (gs.phase === 'matchmaking' && gs.opponentName === 'WAITING' ? currentGameId ?? undefined : undefined)
          }
        />
      </motion.div>
    ) : gs.phase === 'setCode' ? (
      <motion.div key="setcode" className="w-full relative" {...screenVariants}>
        <SetCode
          opponentName={gs.opponentName}
          onLockCode={handleLockCode}
          onBack={() => {
            clearOppTimer();
            setGs(initialGameState(gs.playerRating, gs.playerPoints));
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
      <motion.div key="game" className="w-full h-full pb-10" {...screenVariants}>
        <GameBoard
          playerGuesses={gs.playerGuesses}
          opponentGuesses={gs.opponentGuesses}
          opponentGuessCount={gs.opponentGuessCount}
          currentInput={gs.currentInput}
          opponentCurrentInput={gs.opponentCurrentInput}
          isPlayerTurn={gs.isPlayerTurn}
          opponentName={gs.opponentName}
          playerRating={gs.playerRating}
          playerPoints={gs.playerPoints}
          isSubmitting={isSubmitting}
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
              playerRating={resultStats?.rating ?? gs.playerRating}
              statsLoading={resultStats?.loading ?? false}
              guessCount={gs.playerGuesses.length}
              onPlayAgain={handlePlayAgain}
              onHome={handleHome}
            />
          )}
        </AnimatePresence>
      </motion.div>
    ) : null;
  };

  const renderOpenGames = () => (
    <motion.div key="games" className="flex w-full flex-col gap-8 px-5 pt-12 pb-48 text-left" {...screenVariants}>
      {!address ? (
        <div className="flex flex-col items-center justify-center gap-6 py-20 text-center rounded-3xl border-2 border-black/10 bg-[var(--bg-elevated)] p-8">
          <div className="text-5xl grayscale opacity-30">🛡️</div>
          <p className="text-[10px] font-black tracking-widest text-[var(--text-dim)] uppercase">Connect wallet to view board</p>
          <button onClick={() => login()} className="rounded-xl border-2 border-black/10 bg-[var(--bg-elevated)] px-8 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text)]">Sign In</button>
        </div>
      ) : (
        <>
          <div className="flex w-full flex-col gap-4 mb-6">
            {/* Row 1: Logo (Centered) */}
            <div className="flex w-full justify-center">
              <span className="font-['Dancing_Script'] text-3xl font-bold leading-none bg-blue-500 bg-clip-text text-transparent drop-shadow-sm">
                Crack My Code
              </span>
            </div>

            {/* Row 2: Stats */}
            <div className="flex items-center justify-between">
              {/* CMC Points */}
              <div className="flex items-center gap-1.5 rounded-xl bg-white/80 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-black/5 px-3 py-1.5">
                <span className="text-[10px] font-black text-black/40 uppercase tracking-widest">CMC</span>
                <span className="font-orbitron text-xs font-black text-[var(--clue-yellow)]">{gs.playerPoints}</span>
              </div>

              {/* USDT Balance */}
              <div className="flex items-center gap-1.5 rounded-xl bg-white/80 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-[var(--accent)]/10 px-3 py-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="font-orbitron text-xs font-black text-[var(--accent)]">
                  {usdtData && parseFloat(usdtData.formatted) > 0 ? parseFloat(usdtData.formatted).toFixed(3) : '0.000'} <span className="text-[8px] opacity-60">USDT</span>
                </span>
              </div>
            </div>
          </div>

          <OpenGamesPanel
            joinGameIdInput={joinGameIdInput}
            onJoinGameIdInputChange={setJoinGameIdInput}
            onJoinByGameId={handleJoinByGameId}
            isJoining={!!isJoining}
            isConnected={!!isConnected}
            myActiveGames={myActiveGames}
            onCancelOpenChallenge={handleCancelOpenChallenge}
            isCancellingId={isCancelling}
          />

          {gameHistory.length > 0 && (
            <div className="flex flex-col gap-6 mt-8">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 text-black/40"><History size={16} /></div>
                <h3 className="font-orbitron text-xs font-black tracking-[0.2em] text-black/40 uppercase">Match History</h3>
              </div>
              <div className="flex flex-col gap-3">
                {gameHistory.map((game) => {
                  const isWinner = game.winnerAddress?.toLowerCase() === (address?.toLowerCase() || '');
                  const isDraw = !game.winnerAddress;
                  const opponentAddr = game.player1Address.toLowerCase() === (address?.toLowerCase() || '') ? game.player2Address : game.player1Address;
                  return (
                    <div key={game.id} className="flex items-center justify-between rounded-2xl border-2 border-black/10 bg-[var(--bg-elevated)] p-4 shadow-sm">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest ${isWinner ? 'text-green-600' : isDraw ? 'text-blue-600' : 'text-red-600'}`}>{isWinner ? 'Victory' : isDraw ? 'Draw' : 'Defeat'}</span>
                        <span className="text-[10px] font-bold text-black/60 uppercase tracking-widest">vs {opponentAddr ? `${opponentAddr.slice(0, 6)}...${opponentAddr.slice(-4)}` : 'AI'}</span>
                      </div>
                      <div className="text-[10px] font-black text-black/70">{game.mode === 'cash' ? (isWinner ? `+${(game.stake * 2 * 0.99).toFixed(2)}` : `-${game.stake}`) : 'FREE'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

    </motion.div>
  );

  const renderAbout = () => (
    <motion.div key="about" className="flex w-full flex-col gap-8 px-5 pt-24 pb-32 text-left" {...screenVariants}>
      <div className="flex flex-col gap-2 text-center">
        <h2 className="font-orbitron text-2xl font-black tracking-widest text-[var(--text)]">ABOUT GAME</h2>
        <p className="text-xs text-[var(--text-dim)] uppercase tracking-widest">Rules & Rewards</p>
      </div>
      <div className="flex flex-col gap-6 rounded-3xl border-2 border-black/10 bg-[var(--bg-elevated)] p-6">
        {[
          { t: 'Objective', d: 'Crack your opponent\'s secret 4-digit code before they crack yours. Codes can repeat digits (e.g. 1122).' },
          { t: 'The Clues', d: 'Each digit is colored Wordle-style: green = correct digit in the correct spot, yellow = digit is in the code but wrong spot, light gray = not in the code. A dark gray tile means that digit appears in the code but you already used all copies of it in this guess.' },
          { t: 'How to Play', d: 'Take turns submitting 4-digit guesses. You have 8 attempts. Use the colors on your guess row to narrow down the secret code.' },
          { t: 'Professional Mode', d: 'USDT staking duels are coming soon. Free friendly matches and Cipher AI are available now.' },
          { t: 'Fair Play', d: 'Quitting mid-match counts as a loss once ranked stakes go live.' }
        ].map((rule, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">{rule.t}</span>
            <p className="text-sm leading-relaxed text-black/60">{rule.d}</p>
          </div>
        ))}
      </div>

    </motion.div>
  );

  const renderWalletContent = () => (
    <motion.div key="wallet" className="flex w-full flex-col gap-6 px-5 pt-12 pb-32 text-left" {...screenVariants}>
      {!address ? (
        <div className="flex flex-col items-center justify-center gap-6 py-20 text-center rounded-3xl border-2 border-black/10 bg-[var(--bg-elevated)] p-8">
          <div className="text-5xl grayscale opacity-30">🛡️</div>
          <div className="flex flex-col gap-2">
            <h2 className="font-orbitron text-lg font-black tracking-widest text-[var(--text)] uppercase">Sign In Required</h2>
            <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-widest max-w-[200px] mx-auto">Connect your wallet to view your account details</p>
          </div>
          <button onClick={() => login()} className="rounded-xl border-2 border-black/10 bg-[var(--bg-elevated)] px-8 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text)]">Sign In</button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 rounded-2xl border-2 border-black/10 bg-[var(--bg-elevated)] p-6 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-black/40">USDT</span>
              <span className="font-orbitron text-2xl font-black text-[var(--accent)]">{usdtData ? parseFloat(usdtData.formatted).toFixed(3) : '0.000'}</span>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl border-2 border-black/10 bg-[var(--bg-elevated)] p-6 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-black/40">CMC</span>
              <span className="font-orbitron text-2xl font-black text-[var(--clue-yellow)]">{gs.playerPoints}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border-2 border-black/10 bg-[var(--bg-elevated)] p-6 shadow-md">
            <span className="text-[10px] font-black uppercase tracking-widest text-black/40 text-center">Wallet Address</span>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-xl border-2 border-black/10 bg-black/5 px-4 py-3 font-code text-xs font-bold text-black/60 truncate">{address}</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black/10 bg-black/5"><div className="h-4 w-4 rotate-45 border-2 border-black/30" /></div>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            {/* <button onClick={() => setActiveTab('stats' as any)} className="flex w-full items-center justify-between rounded-2xl border-2 border-black/10 bg-[var(--bg-elevated)] px-6 py-4 shadow-sm hover:bg-black/5 transition-all">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                  <Activity size={16} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text)]">Platform Stats</span>
              </div>
              <ChevronRight size={16} className="text-black/30" />
            </button> */}

            <button onClick={() => setActiveTab('terms' as any)} className="flex w-full items-center justify-between rounded-2xl border-2 border-black/10 bg-[var(--bg-elevated)] px-6 py-4 shadow-sm hover:bg-black/5 transition-all">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/5 text-black/60">
                  <ShieldCheck size={16} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text)]">Terms of Service</span>
              </div>
              <ChevronRight size={16} className="text-black/30" />
            </button>

            <button onClick={() => setActiveTab('privacy' as any)} className="flex w-full items-center justify-between rounded-2xl border-2 border-black/10 bg-[var(--bg-elevated)] px-6 py-4 shadow-sm hover:bg-black/5 transition-all">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/5 text-black/60">
                  <Users size={16} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text)]">Privacy Policy</span>
              </div>
              <ChevronRight size={16} className="text-black/30" />
            </button>

            <button onClick={() => setActiveTab('contact' as any)} className="flex w-full items-center justify-between rounded-2xl border-2 border-black/10 bg-[var(--bg-elevated)] px-6 py-4 shadow-sm hover:bg-black/5 transition-all">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0088cc]/10 text-[#0088cc]">
                  <ExternalLink size={16} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text)]">Telegram Support</span>
              </div>
              <ChevronRight size={16} className="text-black/30" />
            </button>
          </div>

          {/* <AnimatePresence initial={false}>
            {isSendSectionOpen ? (
              <motion.div
                key="send-section"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-6 rounded-3xl border-2 border-black/10 bg-[var(--bg-elevated)] p-6 shadow-md">
                  <div className="flex justify-between items-center">
                    <h3 className="font-orbitron text-xs font-black tracking-[0.2em] text-black/40 uppercase">Send Stablecoin</h3>
                  </div>

                  <div className="flex flex-col gap-4 text-left">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Address</label>
                      <input 
                        type="text" 
                        placeholder="0x..." 
                        value={sendAddress}
                        onChange={(e) => setSendAddress(e.target.value)}
                        className="w-full rounded-xl border-2 border-black/10 bg-transparent px-4 py-3 font-code text-xs font-bold text-black focus:border-[var(--accent)] focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Amount</label>
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        value={sendAmount}
                        onChange={(e) => setSendAmount(e.target.value)}
                        className="w-full rounded-xl border-2 border-black/10 bg-transparent px-4 py-3 font-orbitron text-sm font-bold text-black focus:border-[var(--accent)] focus:outline-none"
                      />
                      <span className="text-[10px] font-bold text-black/40 px-1">
                        Balance: {usdtData ? parseFloat(usdtData.formatted).toFixed(2) : '0.00'} USDT
                      </span>
                    </div>
                  </div>

                  <div className="flex w-full gap-3 mt-2">
                    <button onClick={() => setIsSendSectionOpen(false)} className="flex-1 rounded-2xl border-2 border-black/10 bg-black/5 py-4 text-[10px] font-black uppercase tracking-widest text-black/40 transition-all">
                      CANCEL
                    </button>
                    <button onClick={handleSend} disabled={isSending || !sendAddress || !sendAmount} className="flex-1 rounded-2xl bg-[var(--accent)] py-4 text-[10px] font-black uppercase tracking-widest text-[var(--bg-base)] transition-transform active:scale-95 shadow-lg disabled:opacity-50">
                      {isSending ? 'PROCESSING...' : 'SEND'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <button onClick={() => setIsSendSectionOpen(true)} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--accent)] py-4 text-[10px] font-black uppercase tracking-widest text-[var(--bg-base)] shadow-md transition-all active:scale-95">
                 <Send size={16} /> Send Stablecoin
              </button>
            )}
          </AnimatePresence> */}

          {!(typeof window !== 'undefined' && ((window as any).ethereum?.isMiniPay || (window as any).ethereum?.isFarcaster)) && (
            <button onClick={() => { logout(); setActiveTab('home'); }} className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-red-500/10 bg-red-500/5 py-4 text-[10px] font-black uppercase tracking-widest text-red-500/60 hover:bg-red-500/10 transition-all">
              <LogOut size={16} />
              Sign Out Account
            </button>
          )}
        </div>
      )}
    </motion.div>
  );

  const renderStats = () => (
    <motion.div key="stats" className="flex w-full flex-col gap-6 px-5 pt-12 pb-32 text-left" {...screenVariants}>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => setActiveTab('wallet' as any)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/5 text-black/60 hover:bg-black/10 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex flex-col">
          <h2 className="font-orbitron text-xl font-black tracking-widest text-[var(--text)] uppercase">Stats</h2>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-widest text-green-500">Live Data</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Daily Active Users", value: "1,245", icon: Users },
          { label: "Monthly Active Users", value: "14,580", icon: Activity },
          { label: "Total Transactions", value: "32,891", icon: Zap },
          { label: "Total Volume", value: "$125,430", icon: Wallet },
          { label: "D7 Retention", value: "48%", icon: BarChart2 },
          { label: "Network Fees", value: "$4.20", icon: Zap },
        ].map((stat, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border-2 border-black/10 bg-[var(--bg-elevated)] p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <stat.icon size={12} className="text-[var(--accent)]" />
              <span className="text-[8px] font-black uppercase tracking-widest text-black/40">{stat.label}</span>
            </div>
            <span className="font-orbitron text-lg font-black">{stat.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );

  const renderTerms = () => (
    <motion.div key="terms" className="flex w-full flex-col gap-6 px-5 pt-12 pb-32 text-left" {...screenVariants}>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => setActiveTab('wallet' as any)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/5 text-black/60 hover:bg-black/10 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h2 className="font-orbitron text-xl font-black tracking-widest text-[var(--text)] uppercase">Terms</h2>
      </div>
      <div className="flex flex-col gap-6 rounded-3xl border-2 border-black/10 bg-[var(--bg-elevated)] p-6 text-sm leading-relaxed text-black/70">
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
    <motion.div key="privacy" className="flex w-full flex-col gap-6 px-5 pt-12 pb-32 text-left" {...screenVariants}>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => setActiveTab('wallet' as any)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/5 text-black/60 hover:bg-black/10 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h2 className="font-orbitron text-xl font-black tracking-widest text-[var(--text)] uppercase">Privacy</h2>
      </div>
      <div className="flex flex-col gap-6 rounded-3xl border-2 border-black/10 bg-[var(--bg-elevated)] p-6 text-sm leading-relaxed text-black/70">
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
    <motion.div key="contact" className="flex w-full flex-col gap-6 px-5 pt-12 pb-32 text-left" {...screenVariants}>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => setActiveTab('wallet' as any)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/5 text-black/60 hover:bg-black/10 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h2 className="font-orbitron text-xl font-black tracking-widest text-[var(--text)] uppercase">Contact Us</h2>
      </div>
      <div className="flex flex-col gap-6 rounded-3xl border-2 border-black/10 bg-[var(--bg-elevated)] p-6 text-sm leading-relaxed text-black/70">
        <p>If you have any questions, encounter a bug, or need help with a transaction, our support team is available on Telegram.</p>
        <a href="https://t.me/crackmycode" target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#0088cc] px-6 py-4 shadow-sm hover:scale-105 transition-all text-white mt-4">
          <ExternalLink size={20} />
          <span className="font-black uppercase tracking-widest">Open Telegram</span>
        </a>
      </div>
    </motion.div>
  );

  return (
    <main className="relative flex flex-col items-center justify-start min-h-full">
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
      <div className="w-full max-w-xl px-4 relative">
        {activeTab === 'home' ? renderHomeContent() :
          activeTab === 'games' ? renderOpenGames() :
            activeTab === 'wallet' ? renderWalletContent() :
              activeTab === 'stats' ? renderStats() :
                activeTab === 'terms' ? renderTerms() :
                  activeTab === 'privacy' ? renderPrivacy() :
                    activeTab === 'contact' ? renderContact() :
                      renderAbout()}


      </div>



      <BottomNav
        activeTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t);
          if (gs.phase === 'result') handleHome();
        }}
        visible={gs.phase === 'lobby' || gs.phase === 'matchmaking'}
      />
    </main>
  );
}


