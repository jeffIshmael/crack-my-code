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
import { Wallet, LogOut, ExternalLink, ShieldCheck, Copy, Check, History } from 'lucide-react';

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
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [countdown, setCountdown] = useState<number | 'GO' | null>(null);
  const [readyGame, setReadyGame] = useState<any | null>(null);
  const [currentOnChainMatchId, setCurrentOnChainMatchId] = useState<string | null>(null);
  const [turnNotification, setTurnNotification] = useState<'player' | 'opponent' | null>(null);
  const [pendingOpponentClues, setPendingOpponentClues] = useState<any[] | null>(null);
  const [copied, setCopied] = useState(false);

  const { cancelChallenge } = useGuessMyCode();

  const clearOppTimer = () => { if (oppTimerRef.current) clearTimeout(oppTimerRef.current); };

  const fetchLobby = useCallback(async () => {
    try {
      const res = await fetch('/api/games/lobby');
      const data = await res.json();
      setLobbyGames(data);
    } catch (err) {
      console.error('Lobby fetch failed', err);
    }
  }, []);

  useEffect(() => {
    fetchLobby();
  }, [fetchLobby]);

  // 1.2 Fetch my active challenges
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
      // If using Privy, wait for smartWalletClient to be ready if it's supposed to be there
      if (authenticated && !smartWalletClient) return;
      
      // Auto-join if user is connected
      handleJoinChallenge(inviteId, 'INVITE_LINK');
    }
  }, [searchParams, address, isConnected, smartWalletClient, authenticated]); // eslint-disable-line

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

  // ─── Real-time Gameplay Logic ───────────────────────────────────────────

  useEffect(() => {
    if (!currentGameId || gs.gameMode === 'ai') return;

    const channel = pusherClient.subscribe(`private-game-${currentGameId}`);

    channel.bind('client-typing', (data: { input: number[] }) => {
      setGs((prev: GameState) => ({ ...prev, opponentCurrentInput: data.input }));
    });

    channel.bind('opponent-guess', (data: { digits: number[], clues: any[], sender: string }) => {
      if (data.sender === address) return;
      setGs((prev: GameState) => {
        const entry: GuessEntry = { digits: data.digits, clues: data.clues as any[], id: `opp-${Date.now()}` };
        const newGuesses = [...prev.opponentGuesses, entry];

        if (isWinningClues(data.clues)) {
          const delta = prev.gameMode === 'ai' ? -5 : -15;
          const pointsDelta = delta * 2;
          
          updateBackendPoints(delta, pointsDelta);

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
  }, [currentGameId, gs.gameMode, address, updateBackendPoints]);

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
    clearOppTimer();

    // Wait 1.5s so the player can see their own guess result
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
        if (candidates.length > 200) {
          targetDigits = candidates[Math.floor(Math.random() * candidates.length)];
        } else {
          let bestGuess = candidates[0];
          let minMaxRemaining = Infinity;
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

      // 3. Execute Turn Fast Typing Simulation
      let typeIndex = 0;
      const typeDigit = () => {
        if (typeIndex < CODE_LENGTH) {
          setGs((prev: GameState) => ({
            ...prev,
            opponentCurrentInput: [...prev.opponentCurrentInput, targetDigits[typeIndex]]
          }));
          typeIndex++;
          oppTimerRef.current = setTimeout(typeDigit, 400); // Slower typing, 400ms per digit
        } else {
          // Typing done, evaluate and show result ON THE SAME LINE first
          const clues = evaluateGuess(targetDigits, gsRef.current.playerCode);
          setPendingOpponentClues(clues);

          // Wait 2 seconds so the user can see the result on the current line
          oppTimerRef.current = setTimeout(() => {
            setGs((prev: GameState) => {
              if (prev.phase !== 'playing') return prev;
              
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
                    setGs((p: GameState) => ({
                      ...p,
                      phase: 'result',
                      result: 'lose',
                      ratingDelta: -5,
                      opponentCode: data.opponentCode || []
                    }));
                  });
                setPendingOpponentClues(null);
                return { ...prev, opponentGuesses: newGuesses, opponentGuessCount: newCount, opponentCurrentInput: [] };
              }

              // Return turn to player
              setPendingOpponentClues(null);
              return { ...prev, opponentGuesses: newGuesses, opponentGuessCount: newCount, opponentCurrentInput: [], isPlayerTurn: true };
            });
          }, 2000); // 2 second pause to show result on the current line
        }
      };

      typeDigit();
    }, 1500);
  }, [currentGameId, address]); 

  // AI Turn Trigger
  useEffect(() => {
    if (gs.phase === 'playing' && !gs.isPlayerTurn && gs.gameMode === 'ai') {
      scheduleOpponentTurn();
    }
  }, [gs.phase, gs.isPlayerTurn, gs.gameMode, scheduleOpponentTurn]);

  // ─── Phase: Lobby → Matchmaking ───────────────────────────────────────────

  const handleMatchFound = useCallback((gameId: string, opponentAddress: string) => {
    setCurrentGameId(gameId);
    const isAIMatch = opponentAddress === 'AI_BOT' || opponentAddress === 'AI';
    
    setGs((prev: GameState) => ({
      ...prev,
      phase: 'setCode',
      gameMode: isAIMatch ? 'ai' : prev.gameMode,
      opponentName: isAIMatch ? 'Cipher' : opponentAddress.slice(0, 6),
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

  const handleFindMatch = async (mode: GameMode, stake: number, isPublic: boolean = true, userBalance?: number) => {
    setSearchTime(0);
    setGs(curr => ({ ...curr, phase: 'matchmaking', gameMode: mode, opponentName: 'SEARCHING...' }));

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
  };

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
          const entry: GuessEntry = { digits, clues: data.clues as any[], id: `${Date.now()}` };
          const newGuesses = [...gs.playerGuesses, entry];

          setGs((prev: GameState) => {
            // Win check
            if (isWinningClues(clues)) {
              clearOppTimer();
              const delta = gs.gameMode === 'ai' ? 10 : 25;
              const pointsDelta = delta * 2;
              updateBackendPoints(delta, pointsDelta);
              
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
              const pointsDelta = delta * 2;
              updateBackendPoints(delta, pointsDelta);

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

            // Opponent's turn (now handled by useEffect)
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
    const nextRating = gs.playerRating + (gs.ratingDelta ?? 0);
    const nextPoints = gs.playerPoints + (gs.gameMode === 'ai' ? 0 : (gs.ratingDelta ?? 0) * 2);
    
    setGs(initialGameState(nextRating, nextPoints));
    
    // If it was an AI game, we can go straight back to setCode
    if (gs.gameMode === 'ai') {
      setTimeout(() => {
        handleFindMatch('ai', 0, true);
      }, 100);
    }
  }, [gs.playerRating, gs.playerPoints, gs.ratingDelta, gs.gameMode, handleFindMatch]);

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
      <motion.div key="setcode" className="w-full relative" {...screenVariants}>
        <SetCode
          opponentName={gs.opponentName}
          onLockCode={handleLockCode}
          onBack={() => {
            clearOppTimer();
            setGs(initialGameState(gs.playerRating, gs.playerPoints));
            setCurrentGameId(null);
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
          pendingOpponentClues={pendingOpponentClues}
          turnNotification={turnNotification}
          isAI={gs.gameMode === 'ai'}
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
    
    // Prevent joining own challenge
    if (challengerAddress.toLowerCase() === address.toLowerCase()) {
      toast.error("Invalid Action", { description: "You cannot join your own challenge." });
      return;
    }

    setIsJoining(gameId);
    try {
      // Fetch game details if not already available
      const gameRes = await fetch(`/api/games/lobby?id=${gameId}`);
      const gameData = await gameRes.json();
      
      if (!gameData) throw new Error("Challenge not found or expired");
      const actualChallenger = gameData.player1Address;
      const isPaid = gameData.mode === 'cash';

      if (isPaid) {
        console.log("On-chain joinChallenge required for paid match");
        

        let receipt;
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
          receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
        } else {
          const hash = await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'joinChallenge',
            args: [actualChallenger as `0x${string}`],
          });
          if (!publicClient) throw new Error("Public client not available");
          receipt = await publicClient.waitForTransactionReceipt({ hash });
        }
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

  const [lobbyTab, setLobbyTab] = useState<'open' | 'mine'>('open');

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
          <div className="flex w-full">
            <div className="rounded-xl border-2 border-black/10 bg-[var(--bg-elevated)] px-4 py-2 shadow-sm">
              <span className="font-orbitron text-[10px] font-black tracking-widest text-[var(--text)] uppercase">
                CODE <span className="text-[var(--accent)]">CRACKER</span>
              </span>
            </div>
          </div>

          <div className="flex w-full overflow-hidden rounded-xl border-2 border-black/10 bg-black/5 p-1 shadow-sm">
            <button 
              onClick={() => setLobbyTab('open')}
              className={`flex-1 rounded-lg py-3 text-[10px] font-black uppercase tracking-widest transition-all ${lobbyTab === 'open' ? 'bg-[var(--bg-elevated)] text-[var(--accent)] shadow-sm' : 'text-black/40'}`}
            >
              Open Challenges
            </button>
            <button 
              onClick={() => setLobbyTab('mine')}
              className={`flex-1 rounded-lg py-3 text-[10px] font-black uppercase tracking-widest transition-all ${lobbyTab === 'mine' ? 'bg-[var(--bg-elevated)] text-[var(--accent)] shadow-sm' : 'text-black/40'}`}
            >
              My Open Challenges
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {(lobbyTab === 'open' ? lobbyGames : myActiveGames).length > 0 ? (
              (lobbyTab === 'open' ? lobbyGames : myActiveGames).map((game) => (
                <motion.div key={game.id} className="relative flex flex-col gap-3 rounded-2xl border-2 border-black/10 bg-[var(--bg-elevated)] p-6 shadow-md">
                  <div className="absolute top-4 right-6 text-[10px] font-black uppercase tracking-widest text-black/40">
                    {game.mode === 'cash' ? `${game.stake} USDT` : 'Free'}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-code text-sm font-bold text-black/70">
                      {game.player1Address.slice(0, 8)}...{game.player1Address.slice(-4)}
                    </span>
                    <span className="text-[10px] font-black text-black/30 tracking-widest uppercase">(1200 CMC)</span>
                  </div>
                  <div className="flex w-full justify-end">
                    {game.player1Address.toLowerCase() === address.toLowerCase() ? (
                      <div className="rounded-lg border-2 border-black/10 px-6 py-2 text-[10px] font-black uppercase tracking-widest text-black/20">Hosting</div>
                    ) : (
                      <button onClick={() => setReadyGame(game)} className="rounded-lg border-2 border-black/10 bg-[var(--bg-elevated)] px-8 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--accent)] shadow-sm">JOIN</button>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="flex items-center justify-center py-20 text-center opacity-30">
                <span className="text-[10px] font-black uppercase tracking-widest">No challenges found</span>
              </div>
            )}
          </div>

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

      <AnimatePresence>
        {readyGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReadyGame(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-black/10 bg-[var(--bg-elevated)] p-8 shadow-2xl">
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]"><ShieldCheck size={32} /></div>
                <div className="flex flex-col gap-2">
                  <h2 className="font-orbitron text-xl font-black tracking-widest text-[var(--text)] uppercase">Ready to Duel?</h2>
                  <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">You are about to join a {readyGame.mode === 'cash' ? 'Paid' : 'Free'} match.</p>
                </div>
                {readyGame.mode === 'cash' && (
                  <div className="w-full rounded-2xl bg-black/5 border-2 border-black/10 p-4">
                    <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">Stake Required</p>
                    <p className="text-2xl font-black text-[var(--text)]">{readyGame.stake} <span className="text-xs opacity-60">USDT</span></p>
                  </div>
                )}
                <div className="flex w-full flex-col gap-3">
                  <button onClick={() => { handleJoinChallenge(readyGame.id, readyGame.player1Address); setReadyGame(null); }} disabled={isJoining === readyGame.id} className="w-full rounded-2xl bg-[var(--accent)] py-4 text-[10px] font-black uppercase tracking-widest text-[var(--bg-base)] transition-transform active:scale-95 shadow-lg">{isJoining === readyGame.id ? 'PROCESSING...' : 'INITIALIZE DUEL'}</button>
                  <button onClick={() => setReadyGame(null)} className="w-full rounded-2xl border-2 border-black/10 bg-black/5 py-4 text-[10px] font-black uppercase tracking-widest text-black/40 transition-all">ABORT</button>
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
      <div className="flex flex-col gap-6 rounded-3xl border-2 border-black/10 bg-[var(--bg-elevated)] p-6">
        {[
          { t: 'Objective', d: 'Crack your opponent\'s secret 4-digit code before they crack yours.' },
          { t: 'The Clues', d: 'The game provides numerical feedback: "X in the right place" and "Y reallocated" (right digit, wrong place).' },
          { t: 'USDT Staking', d: 'In Professional mode, both players stake USDT. Winner takes 99% of the pool.' },
          { t: 'Fair Play', d: 'Quitting during a cash game results in an automatic loss.' }
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
              <span className="font-orbitron text-2xl font-black text-[var(--accent)]">{usdtData ? parseFloat(usdtData.formatted).toFixed(0) : '0'}</span>
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

  return (
    <main className="relative flex flex-col items-center justify-start min-h-full">
      <div className="w-full max-w-xl px-4 relative">
        {activeTab === 'home' ? renderHomeContent() :
          activeTab === 'games' ? renderOpenGames() :
            activeTab === 'wallet' ? renderWalletContent() :
              renderAbout()}


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


