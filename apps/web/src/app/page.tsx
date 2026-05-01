'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Lobby from '@/components/Lobby';
import SetCode from '@/components/SetCode';
import GameBoard from '@/components/GameBoard';
import ResultModal from '@/components/ResultModal';
import { BottomNav, type NavTab } from '@/components/BottomNav';
import {
  CODE_LENGTH,
  GAME_DURATION,
  initialGameState,
  evaluateGuess,
  isWinningClues,
  getClueCounts,
  MAX_GUESSES,
} from '@/lib/game';
import type { GameMode, GuessEntry, GameState, GamePhase } from '@/lib/game';
import { useAccount, useWriteContract, usePublicClient, useBalance } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { parseUnits, parseEventLogs, encodeFunctionData } from 'viem';
import { CONTRACT_ABI, CONTRACT_ADDRESS, USDT_ADDRESS } from '../../blockchain/constants';
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets';
import { useGuessMyCode } from '../../blockchain/hooks';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { Wallet, LogOut, ExternalLink, ShieldCheck } from 'lucide-react';

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
  const { client: smartWalletClient } = useSmartWallets();

  const { data: usdtData } = useBalance({
    address: address as `0x${string}` | undefined,
    token: USDT_ADDRESS as `0x${string}`,
  });
  const [gs, setGs] = useState(() => initialGameState());
  const gsRef = useRef(gs);
  useEffect(() => { gsRef.current = gs; }, [gs]);

  const allPermutations = useRef<number[][]>([]);
  if (allPermutations.current.length === 0) {
    const generate = (current: number[]) => {
      if (current.length === 4) {
        allPermutations.current.push(current);
        return;
      }
      for (let i = 0; i <= 9; i++) {
        if (!current.includes(i)) generate([...current, i]);
      }
    };
    generate([]);
  }

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [lobbyGames, setLobbyGames] = useState<any[]>([]);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const oppTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myActiveGames, setMyActiveGames] = useState<any[]>([]);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [countdown, setCountdown] = useState<number | 'GO' | null>(null);
  const [readyGame, setReadyGame] = useState<any | null>(null);
  const [currentOnChainMatchId, setCurrentOnChainMatchId] = useState<string | null>(null);

  const { cancelChallenge } = useGuessMyCode();

  const clearOppTimer = () => { if (oppTimerRef.current) clearTimeout(oppTimerRef.current); };

  // 1. Fetch initial lobby
  useEffect(() => {
    const fetchLobby = async () => {
      try {
        const res = await fetch('/api/games/lobby');
        const data = await res.json();
        setLobbyGames(data);
      } catch (err) {
        console.error('Lobby fetch failed', err);
      }
    };
    fetchLobby();
  }, []);

  // 1.2 Fetch my active challenges
  const fetchMyActive = useCallback(async () => {
    if (!authenticated || !address) return;
    try {
      const res = await fetch(`/api/games/my-active?address=${address}`);
      const data = await res.json();
      setMyActiveGames(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('My active games fetch failed', err);
    }
  }, [authenticated, address]);

  useEffect(() => {
    fetchMyActive();
  }, [fetchMyActive]);

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

  // 1.7 Handle Invite Link on Mount
  useEffect(() => {
    const inviteId = searchParams.get('invite');
    if (inviteId && address && isConnected && gs.phase === 'lobby') {
      // Auto-join if user is connected
      handleJoinChallenge(inviteId, 'INVITE_LINK');
    }
  }, [searchParams, address, isConnected]); // eslint-disable-line

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

  // 2. Subscribe to Lobby events
  useEffect(() => {
    const channel = pusherClient.subscribe('lobby-channel');

    channel.bind('challenge-created', (data: any) => {
      setLobbyGames(prev => [data, ...prev]);
    });

    channel.bind('challenge-joined', (data: any) => {
      setLobbyGames(prev => prev.filter(g => g.id !== data.gameId));
    });

    return () => {
      pusherClient.unsubscribe('lobby-channel');
    };
  }, [address]);

  // ─── Real-time Gameplay Logic ───────────────────────────────────────────

  useEffect(() => {
    if (!currentGameId || gs.gameMode === 'ai') return;

    const channel = pusherClient.subscribe(`private-game-${currentGameId}`);

    channel.bind('client-typing', (data: { input: number[] }) => {
      setGs((prev: GameState) => ({ ...prev, opponentCurrentInput: data.input }));
    });

    channel.bind('opponent-guess', (data: { digits: number[], clues: any[] }) => {
      setGs((prev: GameState) => {
        const entry: GuessEntry = { digits: data.digits, clues: data.clues as any[], id: `opp-${Date.now()}` };
        const newGuesses = [...prev.opponentGuesses, entry];

        if (isWinningClues(data.clues)) {
          return {
            ...prev,
            opponentGuesses: newGuesses,
            phase: 'result',
            result: 'lose',
            ratingDelta: -15,
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
  }, [currentGameId, gs.gameMode]);

  const emitTyping = (input: number[]) => {
    if (!currentGameId || gs.gameMode === 'ai') return;
    const channel = pusherClient.channel(`private-game-${currentGameId}`);
    if (channel) {
      channel.trigger('client-typing', { input });
    }
  };

  const scheduleOpponentTurn = useCallback(() => {
    if (gsRef.current.gameMode !== 'ai') return;
    clearOppTimer();

    const thinkingDelay = 1000 + Math.random() * 1000;

    oppTimerRef.current = setTimeout(() => {
      const currentGs = gsRef.current;
      const history = currentGs.opponentGuesses;
      const playerCode = currentGs.playerCode;

      if (!playerCode || playerCode.length === 0) return;

      // 1. Filter candidates based on history
      const candidates = allPermutations.current.filter((cand) => {
        return history.every((h: GuessEntry) => {
          const candClues = evaluateGuess(h.digits, cand);
          const c1 = getClueCounts(candClues);
          const c2 = getClueCounts(h.clues);
          return c1.green === c2.green && c1.yellow === c2.yellow;
        });
      });

      // 2. Pick next guess
      let targetDigits: number[];
      if (history.length === 0) {
        targetDigits = [0, 1, 2, 3];
      } else if (candidates.length === 1) {
        targetDigits = candidates[0];
      } else {
        // Smarter pick: if pool is small enough, use minimax. Otherwise pick random from candidates.
        if (candidates.length > 200) {
          targetDigits = candidates[Math.floor(Math.random() * candidates.length)];
        } else {
          // Knuth-lite minimax
          let bestGuess = candidates[0];
          let minMaxRemaining = Infinity;

          // Optimization: sample candidates if still too many
          const testPool = candidates.length > 50 ? candidates.slice(0, 50) : candidates;

          for (const guess of testPool) {
            const groups: Record<string, number> = {};
            for (const secret of candidates) {
              const clues = evaluateGuess(guess, secret);
              const { green, yellow } = getClueCounts(clues);
              const key = `${green}-${yellow}`;
              groups[key] = (groups[key] || 0) + 1;
            }
            const maxInGroup = Math.max(...Object.values(groups));
            if (maxInGroup < minMaxRemaining) {
              minMaxRemaining = maxInGroup;
              bestGuess = guess;
            }
          }
          targetDigits = bestGuess;
        }
      }

      // 3. Simulate typing
      let typedCount = 0;
      const typeDigit = () => {
        typedCount++;
        setGs((prev: GameState) => ({ ...prev, opponentCurrentInput: targetDigits.slice(0, typedCount) }));

        if (typedCount < CODE_LENGTH) {
          oppTimerRef.current = setTimeout(typeDigit, 150 + Math.random() * 100);
        } else {
          setGs((prev: GameState) => {
            if (prev.phase !== 'playing') return prev;
            const clues = evaluateGuess(targetDigits, prev.playerCode);
            const entry: GuessEntry = { digits: targetDigits, clues, id: `opp-${Date.now()}` };
            const newGuesses = [...prev.opponentGuesses, entry];
            const newCount = prev.opponentGuessCount + 1;

            if (isWinningClues(clues)) {
              // Reveal AI's code and end game
              fetch('/api/games/reveal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: currentGameId, address: address || 'GUEST' })
              })
                .then(res => res.json())
                .then(data => {
                  setTimeout(() => {
                    setGs((p: GameState) => ({
                      ...p,
                      phase: 'result',
                      result: 'lose',
                      ratingDelta: -5,
                      opponentCode: data.opponentCode || []
                    }));
                  }, 1500);
                });
              return { ...prev, opponentGuesses: newGuesses, opponentGuessCount: newCount, opponentCurrentInput: [] };
            }

            oppTimerRef.current = setTimeout(() => {
              setGs((p: GameState) => ({ ...p, isPlayerTurn: true, opponentCurrentInput: [] }));
            }, 1000);

            return { ...prev, opponentGuesses: newGuesses, opponentGuessCount: newCount, opponentCurrentInput: [] };
          });
        }
      };

      typeDigit();
    }, thinkingDelay);
  }, [currentGameId, address]); // eslint-disable-line

  // ─── Phase: Lobby → Matchmaking ───────────────────────────────────────────

  const handleMatchFound = useCallback((gameId: string, opponentAddress: string) => {
    setCurrentGameId(gameId);
    setGs((prev: GameState) => ({
      ...prev,
      phase: 'setCode',
      opponentName: opponentAddress === 'AI_BOT' ? 'Cipher' : opponentAddress.slice(0, 6),
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

  const handleFindMatch = useCallback(async (mode: GameMode, stake: number, isPublic: boolean = true) => {
    if (!address && mode !== 'ai') {
      toast.error("Connect wallet to play PvP or Professional duels.");
      return;
    }

    // Check if user has active challenges
    if (mode !== 'ai' && myActiveGames.length > 0) {
      toast.error("Active Challenge Detected", {
        description: "You already have an active challenge. Cancel it to create a new one."
      });
      setActiveTab('games');
      return;
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
        handleMatchFound(data.gameId, data.opponentAddress || 'AI_BOT');
      } else {
        setCurrentGameId(data.gameId);
        if (onChainMatchId) setCurrentOnChainMatchId(onChainMatchId);
        
        setGs((prev: GameState): GameState => ({
          ...prev,
          phase: 'matchmaking',
          gameMode: mode,
          stakeAmount: stake,
          opponentName: !isPublic ? 'WAITING' : (mode === 'ai' ? 'Cipher' : 'Searching...')
        }));
      }
    } catch (err: any) {
      console.error('Matchmaking failed', err);
      toast.error('Matchmaking Error', { description: getErrorMessage(err) });
      setGs(prev => ({ ...prev, phase: 'lobby' }));
    }
  }, [address, isConnected, publicClient, writeContractAsync, smartWalletClient, handleMatchFound]);

  const handleCancelMatchmaking = useCallback(async () => {
    if (currentGameId) {
      await handleCancelChallenge(currentGameId, currentOnChainMatchId || undefined);
    }
    setGs((prev: GameState): GameState => ({ ...prev, phase: 'lobby' }));
    setSearchTime(0);
    setCurrentGameId(null);
    setCurrentOnChainMatchId(null);
    toast.info("Search Cancelled");
  }, [currentGameId, currentOnChainMatchId, handleCancelChallenge]);

  // ─── Phase: SetCode → Playing ─────────────────────────────────────────────

  const handleLockCode = useCallback(async (code: number[]) => {
    if (!currentGameId) return;
    if (!address && gs.gameMode !== 'ai') return;

    const effectiveAddress = address || 'GUEST';

    setGs((prev: GameState) => ({ ...prev, playerCode: code }));
    setIsWaiting(true);

    try {
      await fetch('/api/games/lock-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: currentGameId, address: effectiveAddress, code: code.join('') })
      });

      // For AI games, we can start immediately since AI code is already set
      if (gs.gameMode === 'ai') {
        setIsWaiting(false);
        setGs((prev: GameState): GameState => ({ ...prev, phase: 'countdown' }));
      }
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
          const entry: GuessEntry = { digits, clues: data.clues as any[], id: `${Date.now()}` };
          const newGuesses = [...gs.playerGuesses, entry];

          setGs((prev: GameState) => {
            // Win check
            if (isWinningClues(clues)) {
              clearOppTimer();
              return {
                ...prev,
                playerGuesses: newGuesses,
                phase: 'result',
                result: 'win',
                ratingDelta: gs.gameMode === 'ai' ? 10 : 25,
                currentInput: [],
                opponentCode: data.opponentCode // Revealed by server
              };
            }

            // Max guesses exhausted?
            if (newGuesses.length >= MAX_GUESSES) {
              const delta = gs.gameMode === 'ai' ? -5 : -15;
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
                });
              return { ...prev, playerGuesses: newGuesses, isPlayerTurn: false };
            }

            // Opponent's turn
            if (prev.gameMode === 'ai') scheduleOpponentTurn();
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
  }, [gs, currentGameId, address, scheduleOpponentTurn, isSubmitting]);

  // ─── Number pad: add / remove digit ──────────────────────────────────────

  const handleDigitPress = useCallback((digit: number) => {
    setGs((prev: GameState) => {
      if (!prev.isPlayerTurn || prev.phase !== 'playing') return prev;
      if (prev.currentInput.length >= CODE_LENGTH) return prev;
      if (prev.currentInput.includes(digit)) return prev; // no repeats
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

  const handlePlayAgain = useCallback(() => {
    clearOppTimer();
    setGs(initialGameState(
      gs.playerRating + (gs.ratingDelta ?? 0),
      gs.playerPoints + (gs.gameMode === 'ai' ? 0 : (gs.ratingDelta ?? 0) * 2) // Rough points logic for now
    ));
  }, [gs.playerRating, gs.playerPoints, gs.ratingDelta, gs.gameMode]); // eslint-disable-line

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

  // ─── Sub-views ────────────────────────────────────────────────────────────

  const renderHomeContent = () => {
    const inviteId = searchParams.get('invite');
    
    return gs.phase === 'lobby' || gs.phase === 'matchmaking' ? (
      <motion.div key="lobby" className="w-full relative" {...screenVariants}>

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
          gameId={currentGameId || inviteId || undefined}
        />
      </motion.div>
    ) : gs.phase === 'setCode' ? (
      <motion.div key="setcode" className="w-full" {...screenVariants}>
        <SetCode
          opponentName={gs.opponentName}
          onLockCode={handleLockCode}
          isWaiting={isWaiting}
        />
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
              playerRating={gs.playerRating}
              playerPoints={gs.playerPoints}
              guessCount={gs.playerGuesses.length}
              onPlayAgain={handlePlayAgain}
            />
          )}
        </AnimatePresence>
      </motion.div>
    ) : null;
  };

  const handleJoinChallenge = async (gameId: string, challengerAddress: string) => {
    if (!isConnected || !address) return;
    setIsJoining(gameId);
    try {
      let actualChallenger = challengerAddress;
      
      // If joining via invite link, we need to fetch game details to get the creator's address
      if (challengerAddress === 'INVITE_LINK') {
        const gameRes = await fetch(`/api/games/lobby?id=${gameId}`);
        const gameData = await gameRes.json();
        if (gameData && gameData.player1Address) {
          actualChallenger = gameData.player1Address;
        } else {
          throw new Error("Challenge not found or expired");
        }
      }

      // --- ON-CHAIN: Join Challenge ---
      if (smartWalletClient) {
        const data = encodeFunctionData({
          abi: CONTRACT_ABI,
          functionName: 'joinChallenge',
          args: [actualChallenger as `0x${string}`]
        });
        const txHash = await smartWalletClient.sendTransaction({
          to: CONTRACT_ADDRESS as `0x${string}`,
          data: data,
          value: BigInt(0)
        });
        if (!publicClient) throw new Error("Public client not available");
        await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      } else {
        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'joinChallenge',
          args: [actualChallenger as `0x${string}`],
        });
        if (!publicClient) throw new Error("Public client not available");
        await publicClient.waitForTransactionReceipt({ hash });
      }

      const res = await fetch('/api/games/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, gameId })
      });
      const data = await res.json();
      if (data.status === 'matched') {
        handleMatchFound(data.gameId, data.opponentAddress);
        setActiveTab('home');
      }
    } catch (err) {
      console.error('Join failed', err);
      toast.error('Join Error', { description: getErrorMessage(err) });
    } finally {
      setIsJoining(null);
    }
  };
  const renderOpenGames = () => (
    <motion.div key="games" className="flex w-full flex-col gap-10 px-5 pt-12 pb-48 text-left" {...screenVariants}>
      {!isConnected ? (
        <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
          <div className="text-6xl grayscale opacity-30">🛡️</div>
          <div className="flex flex-col gap-2">
            <h2 className="font-orbitron text-xl font-black tracking-widest text-[var(--text)] uppercase">Wallet Not Connected</h2>
            <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-widest max-w-[200px] mx-auto">Connect your wallet to view active challenges and accept duels</p>
          </div>
          <button
            onClick={() => login()}
            className="rounded-full bg-[var(--accent)] px-8 py-3 text-[10px] font-black uppercase tracking-widest text-[#030C15]"
          >
            Sign In
          </button>
        </div>
      ) : (
        <>
          {/* Section: My Active Challenges */}
          {myActiveGames.length > 0 && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="font-orbitron text-base font-black tracking-widest text-[var(--orange)] uppercase">My Pending Dues</h2>
                <p className="text-[8px] text-[var(--text-dim)] uppercase tracking-widest">You are currently hosting these challenges</p>
              </div>
              <div className="flex flex-col gap-3">
                {myActiveGames.map((game) => (
                  <motion.div
                    key={game.id}
                    className="flex items-center justify-between rounded-2xl border border-[var(--orange)]/20 bg-[var(--orange)]/5 p-5"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-orbitron text-[9px] font-black tracking-widest text-[var(--orange)] uppercase">
                        {game.mode === 'cash' ? 'Professional' : 'Friendly'} Duel
                      </span>
                      <span className="text-[10px] font-bold text-[var(--text-dim)]">WAITING FOR OPPONENT...</span>
                    </div>
                    <button
                      onClick={() => handleCancelChallenge(game.id, game.onChainMatchId)}
                      disabled={isCancelling === game.id}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-tighter text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {isCancelling === game.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  </motion.div>
                ))}
              </div>
              <div className="h-px w-full bg-white/5" />
            </div>
          )}

          {/* Section: Global Board */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="font-orbitron text-xl font-black tracking-widest text-[var(--text)] uppercase">Global Challenges</h2>
              <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-widest pt-1">Accept a duel on the global board</p>
            </div>

            <div className="flex flex-col gap-4">
              {lobbyGames.length > 0 ? (
                lobbyGames.map((game) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-5 transition-all hover:bg-white/[0.08]"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-orbitron text-[10px] font-black tracking-widest text-[var(--accent)] uppercase">{game.mode === 'cash' ? 'Professional' : 'Friendly'} Duel</span>
                      <div className="flex items-center gap-2">
                        <span className="font-code text-sm font-bold text-[var(--text)]">{game.player1Address.slice(0, 6)}...{game.player1Address.slice(-4)}</span>
                        <span className="text-[8px] font-bold text-[var(--text-dim)] uppercase">
                          • {Math.floor((Date.now() - new Date(game.createdAt).getTime()) / 60000)}m waiting
                        </span>
                      </div>
                    </div>
 
                    <div className="flex items-center gap-6">
                      {game.mode === 'cash' && (
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-dim)]">Stake</span>
                          <span className="text-sm font-black text-[var(--orange)]">{game.stake} USDT</span>
                        </div>
                      )}
                      {game.player1Address === address ? (
                        <div className="rounded-xl border border-[var(--orange)]/30 bg-[var(--orange)]/5 px-4 py-2 text-[10px] font-black uppercase tracking-tighter text-[var(--orange)] opacity-80">
                          Hosting
                        </div>
                      ) : (
                        <button
                          onClick={() => setReadyGame(game)}
                          className="rounded-xl bg-[var(--text)] px-4 py-2 text-[10px] font-black uppercase tracking-tighter text-[var(--bg-base)] transition-transform active:scale-95 disabled:opacity-50"
                        >
                          Accept
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex items-center justify-center rounded-3xl border border-white/5 bg-white/5 py-20 text-center">
                  <div className="flex flex-col gap-3">
                    <div className="mx-auto h-12 w-12 rounded-full border-2 border-dashed border-[var(--text-dim)] opacity-20" />
                    <p className="text-sm font-bold text-[var(--text-dim)]">No active public challenges</p>
                    <button onClick={() => setActiveTab('home')} className="mx-auto mt-2 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] underline underline-offset-4">Create one now</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Join Confirmation Modal */}
      <AnimatePresence>
        {readyGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReadyGame(null)}
              className="absolute inset-0 bg-[#030C15]/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0A121A] p-8 shadow-2xl"
            >
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
                  <ShieldCheck size={32} />
                </div>
                
                <div className="flex flex-col gap-2">
                  <h2 className="font-orbitron text-xl font-black tracking-widest text-white uppercase">Ready to Duel?</h2>
                  <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">
                    You are about to join a {readyGame.mode === 'cash' ? 'Paid' : 'Free'} match against {readyGame.player1Address.slice(0, 8)}...
                  </p>
                </div>

                {readyGame.mode === 'cash' && (
                  <div className="w-full rounded-2xl bg-[var(--orange)]/10 border border-[var(--orange)]/30 p-4">
                    <p className="text-[10px] font-black text-[var(--orange)] uppercase tracking-widest mb-1">Stake Required</p>
                    <p className="text-2xl font-black text-white">{readyGame.stake} <span className="text-xs opacity-60">USDT</span></p>
                  </div>
                )}

                <div className="flex w-full flex-col gap-3">
                  <button
                    onClick={() => {
                      handleJoinChallenge(readyGame.id, readyGame.player1Address);
                      setReadyGame(null);
                    }}
                    disabled={isJoining === readyGame.id}
                    className="w-full rounded-2xl bg-[var(--accent)] py-4 text-[10px] font-black uppercase tracking-widest text-[#030C15] transition-transform active:scale-95 shadow-[0_0_20px_rgba(0,207,255,0.2)]"
                  >
                    {isJoining === readyGame.id ? 'PROCESSING...' : 'INITIALIZE DUEL'}
                  </button>
                  <button
                    onClick={() => setReadyGame(null)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-[10px] font-black uppercase tracking-widest text-white/60 transition-all hover:bg-white/10"
                  >
                    ABORT
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderAbout = () => (
    <motion.div key="about" className="flex w-full flex-col gap-8 px-5 pt-24 pb-32 text-left" {...screenVariants}>
      <div className="flex flex-col gap-2 text-center">
        <h2 className="font-orbitron text-2xl font-black tracking-widest text-[var(--text)]">ABOUT GAME</h2>
        <p className="text-xs text-[var(--text-dim)] uppercase tracking-widest">Rules & Rewards</p>
      </div>
      <div className="flex flex-col gap-6 rounded-3xl border border-white/5 bg-white/5 p-6">
        {[
          { t: 'Objective', d: 'Crack your opponent\'s secret 4-digit code before they crack yours.' },
          { t: 'The Clues', d: 'The game provides numerical feedback: "X in the right place" and "Y reallocated" (right digit, wrong place).' },
          { t: 'USDT Staking', d: 'In Professional mode, both players stake USDT. Winner takes 99% of the pool.' },
          { t: 'Fair Play', d: 'Quitting during a cash game results in an automatic loss and forfeit of your stake.' }
        ].map((rule, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">{rule.t}</span>
            <p className="text-sm leading-relaxed text-[var(--text-2)]">{rule.d}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );

  const renderWalletContent = () => (
    <motion.div key="wallet" className="flex w-full flex-col gap-8 px-5 pt-24 pb-32 text-left" {...screenVariants}>
      <div className="flex flex-col gap-2 text-center">
        <h2 className="font-orbitron text-2xl font-black tracking-widest text-[var(--text)] uppercase">My Account</h2>
        <p className="text-xs text-[var(--text-dim)] uppercase tracking-widest">Secure Account & Assets</p>
      </div>

      {!authenticated ? (
        <div className="flex flex-col items-center justify-center gap-6 py-12 text-center bg-white/5 rounded-[2.5rem] border border-white/10 p-10">
          <div className="text-6xl grayscale opacity-30">🛡️</div>
          <div className="flex flex-col gap-2">
            <h2 className="font-orbitron text-xl font-black tracking-widest text-[var(--text)] uppercase">Not Signed In</h2>
            <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-widest max-w-[200px] mx-auto">Connect your wallet to manage your assets and points</p>
          </div>
          <button
            onClick={() => login()}
            className="rounded-full bg-[var(--accent)] px-8 py-3 text-[10px] font-black uppercase tracking-widest text-[#030C15]"
          >
            Sign In Now
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Main Card */}
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#03111C] p-8 shadow-2xl">
            {/* Background Glow */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--accent)]/10 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
                    <Wallet size={24} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)]">Connected Wallet</span>
                    <span className="font-code text-sm font-bold text-[var(--text)]">{address?.slice(0, 10)}...{address?.slice(-10)}</span>
                  </div>
                </div>
                <a
                  href={`https://celoscan.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-white/5 p-3 text-[var(--text-dim)] hover:bg-white/10 transition-colors"
                >
                  <ExternalLink size={18} />
                </a>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)]">USDT Balance</span>
                    <span className="text-3xl font-black text-[var(--accent)]">
                      {usdtData ? parseFloat(usdtData.formatted).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-[var(--clue-yellow)]/20 bg-[var(--clue-yellow)]/5 p-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--clue-yellow)]/50">Points</span>
                    <span className="text-3xl font-black text-[var(--clue-yellow)]">
                      {gs.playerPoints} <span className="text-[20px] font-black text-[var(--clue-yellow)]/20">CMC</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>



          {/* Logout (Non-miniapp) */}
          {!(typeof window !== 'undefined' && ((window as any).ethereum?.isMiniPay || (window as any).ethereum?.isFarcaster)) && (
            <button
              onClick={() => {
                logout();
                setActiveTab('home');
              }}
              className="flex w-full items-center justify-center gap-3 rounded-[2rem] border border-red-500/20 bg-red-500/5 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          )}
        </div>
      )}
    </motion.div>
  );

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-start overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-xl px-4 relative">
        {activeTab === 'home' ? renderHomeContent() :
          activeTab === 'games' ? renderOpenGames() :
            activeTab === 'wallet' ? renderWalletContent() :
              renderAbout()}

        {/* Debug fallback to ensure component is rendering */}
        {!gs.phase && (
          <div className="text-white text-center p-10">
            Initial loading state...
          </div>
        )}
      </div>



      <BottomNav
        activeTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t);
          if (gs.phase === 'result') handlePlayAgain();
        }}
        visible={gs.phase === 'lobby' || gs.phase === 'matchmaking'}
      />
    </main>
  );
}


