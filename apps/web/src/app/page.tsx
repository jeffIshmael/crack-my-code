'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  MAX_GUESSES,
} from '@/lib/game';
import type { GameMode, GuessEntry, GameState } from '@/lib/game';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, parseEventLogs } from 'viem';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../../blockchain/constants';
import { useGuessMyCode } from '../../blockchain/hooks';

// ─── Settings ───────────────────────────────────────────────────────────────

const MATCHMAKING_MS = 2400;

const screenVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.3, ease: 'easeIn' } },
};

import { pusherClient } from '@/lib/pusher-client';

export default function Home() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [gs, setGs] = useState(() => initialGameState());
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [lobbyGames, setLobbyGames] = useState<any[]>([]);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const oppTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myActiveGames, setMyActiveGames] = useState<any[]>([]);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);

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
    if (!isConnected || !address) return;
    try {
      const res = await fetch(`/api/games/my-active?address=${address}`);
      const data = await res.json();
      setMyActiveGames(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('My active games fetch failed', err);
    }
  }, [isConnected, address]);

  useEffect(() => {
    fetchMyActive();
  }, [fetchMyActive]);

  // 1.5 User Registration / Fetch Rating
  useEffect(() => {
    if (isConnected && address) {
      const register = async () => {
        try {
          const res = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address })
          });
          const data = await res.json();
          if (data.rating !== undefined) {
            setGs(prev => ({ ...prev, playerRating: data.rating }));
          }
        } catch (err) {
          console.error('Registration failed', err);
        }
      };
      register();
    }
  }, [isConnected, address]);

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
      setGs((prev: GameState) => ({ ...prev, phase: 'playing' }));
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
    if (gs.gameMode !== 'ai') return;
    clearOppTimer();

    const thinkingDelay = 1000 + Math.random() * 1000;

    oppTimerRef.current = setTimeout(() => {
      // 🚀 SMARTER AI: Mastermind Solver
      // 1. Get all previous guesses the AI has made against the player
      const history = gs.opponentGuesses;

      // 2. Generate/Filter possible codes
      // We generate all permutations of 4 unique digits (0-9)
      const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      let candidates: number[][] = [];

      // Recursive permutation generator (simplified)
      const generate = (current: number[]) => {
        if (current.length === 4) {
          // Check if this candidate is consistent with all previous clues
          const isConsistent = history.every((h: GuessEntry) => {
            const clues = evaluateGuess(h.digits, current);
            return JSON.stringify(clues) === JSON.stringify(h.clues);
          });
          if (isConsistent) candidates.push(current);
          return;
        }
        for (let d of digits) {
          if (!current.includes(d)) generate([...current, d]);
        }
      };

      generate([]);

      // 3. Pick the next guess using a smarter heuristic (Entropy/Size reduction)
      let targetDigits: number[];

      if (history.length === 0) {
        // First guess is always a diverse set for max info
        targetDigits = [0, 1, 2, 3];
      } else if (candidates.length <= 1) {
        targetDigits = candidates[0] || [0, 1, 2, 3];
      } else if (candidates.length > 300) {
        // Pool too large for full entropy calc; pick random from candidates to keep it snappy
        targetDigits = candidates[Math.floor(Math.random() * candidates.length)];
      } else {
        // 🚀 SMARTEST: Heuristic selection (Knuth-lite)
        // Find the candidate that minimizes the maximum possible remaining candidate pool size
        let bestGuess = candidates[0];
        let minMaxRemaining = Infinity;

        // Note: For speed, we only test candidates as potential guesses
        for (const guess of candidates) {
          const clueGroups: Record<string, number> = {};

          for (const secret of candidates) {
            const clues = evaluateGuess(guess, secret);
            const key = JSON.stringify(clues);
            clueGroups[key] = (clueGroups[key] || 0) + 1;
          }

          const maxInGroup = Math.max(...Object.values(clueGroups));
          if (maxInGroup < minMaxRemaining) {
            minMaxRemaining = maxInGroup;
            bestGuess = guess;
          }
        }
        targetDigits = bestGuess;
      }

      // 4. Simulate typing
      let typedCount = 0;
      const typeDigit = () => {
        typedCount++;
        setGs((prev: GameState) => ({ ...prev, opponentCurrentInput: targetDigits.slice(0, typedCount) }));

        if (typedCount < CODE_LENGTH) {
          oppTimerRef.current = setTimeout(typeDigit, 200);
        } else {
          setGs((prev: GameState) => {
            if (prev.phase !== 'playing') return prev;
            const clues = evaluateGuess(targetDigits, prev.playerCode);
            const entry: GuessEntry = { digits: targetDigits, clues, id: `opp-${Date.now()}` };
            const newGuesses = [...prev.opponentGuesses, entry];
            const newCount = prev.opponentGuessCount + 1;

            if (isWinningClues(clues)) {
              // 1. Reveal AI's code (since game is over)
              fetch('/api/games/reveal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: currentGameId, address: address || 'GUEST' })
              })
                .then(res => res.json())
                .then(data => {
                  // 2. Wait 2 seconds so player sees the winning guess on board
                  setTimeout(() => {
                    setGs((prev: GameState) => ({
                      ...prev,
                      phase: 'result',
                      result: 'lose',
                      ratingDelta: -15,
                      opponentCode: data.opponentCode || []
                    }));
                  }, 2000);
                });

              // Return updated state with AI's final guess
              return { ...prev, opponentGuesses: newGuesses, opponentGuessCount: newCount, opponentCurrentInput: [] };
            }

            oppTimerRef.current = setTimeout(() => {
              setGs((p: GameState) => ({ ...p, isPlayerTurn: true, opponentCurrentInput: [] }));
            }, 2000);

            return { ...prev, opponentGuesses: newGuesses, opponentGuessCount: newCount, opponentCurrentInput: [] };
          });
        }
      };

      typeDigit();
    }, thinkingDelay);
  }, [gs.gameMode]); // eslint-disable-line

  // ─── Phase: Lobby → Matchmaking ───────────────────────────────────────────

  const [matchError, setMatchError] = useState<string | null>(null);

  const handleMatchFound = useCallback((gameId: string, opponentAddress: string) => {
    setCurrentGameId(gameId);
    setMatchError(null);
    setGs((prev: GameState) => ({
      ...prev,
      phase: 'setCode',
      opponentName: opponentAddress === 'AI_BOT' ? 'Neural_X' : opponentAddress.slice(0, 6),
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
        await cancelChallenge(onChainMatchId as `0x${string}`);
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
    } finally {
      setIsCancelling(null);
    }
  };

  const handleFindMatch = useCallback(async (mode: GameMode, stake: number) => {
    setMatchError(null);

    if (!address && mode !== 'ai') {
      setMatchError("Connect wallet to play PvP or Professional duels.");
      return;
    }

    // Check if user has active challenges
    if (mode !== 'ai' && myActiveGames.length > 0) {
      setMatchError("You already have an active challenge. Cancel it to create a new one.");
      setActiveTab('games');
      return;
    }

    const effectiveAddress = address || 'GUEST';

    setGs((prev: GameState) => ({
      ...prev,
      phase: 'matchmaking',
      gameMode: mode,
      stakeAmount: stake,
      opponentName: mode === 'ai' ? 'Neural_X' : 'Searching...'
    }));

    try {
      let onChainMatchId: string | undefined;

      // --- ON-CHAIN: Create Challenge ---
      if (mode !== 'ai' && isConnected) {
        const isPaid = mode === 'cash';
        const stakeAmt = parseUnits(stake.toString(), 6);
        console.log("the paid status", isPaid);

        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'createChallenge',
          args: [isPaid, stakeAmt],
        });

        if (!publicClient) throw new Error("Public client not available");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

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
          onChainMatchId // Synchronize with blockchain
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Matchmaking failed');
      }

      if (data.status === 'matched') {
        handleMatchFound(data.gameId, data.opponentAddress || 'AI_BOT');
      }
    } catch (err: any) {
      console.error('Matchmaking failed', err);
      setMatchError(err.message || 'System error. Please try again.');
      setGs(prev => ({ ...prev, phase: 'lobby' }));
    }
  }, [address, isConnected, publicClient, writeContractAsync, handleMatchFound]);

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
        setGs(prev => ({ ...prev, phase: 'playing' }));
      }
      // For PvP, we wait for 'game-started' Pusher event
    } catch (err) {
      console.error('Failed to lock code', err);
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
                ratingDelta: +22,
                currentInput: [],
                opponentCode: data.opponentCode // Revealed by server
              };
            }

            // Max guesses exhausted?
            // Only end if opponent has also finished their turn for this round
            if (newGuesses.length >= MAX_GUESSES && prev.opponentGuesses.length >= newGuesses.length) {
              return { ...prev, playerGuesses: newGuesses, phase: 'result', result: 'lose', ratingDelta: -10, currentInput: [] };
            }

            // Opponent's turn
            if (prev.gameMode === 'ai') scheduleOpponentTurn();
            return { ...prev, playerGuesses: newGuesses, isPlayerTurn: false, currentInput: [] };
          });
        }
      } catch (err) {
        console.error('Failed to notify opponent', err);
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
    setGs(initialGameState(gs.playerRating + (gs.ratingDelta ?? 0)));
  }, [gs.playerRating, gs.ratingDelta]); // eslint-disable-line

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

  const renderHomeContent = () => (
    gs.phase === 'lobby' || gs.phase === 'matchmaking' ? (
      <motion.div key="lobby" className="w-full relative" {...screenVariants}>
        <AnimatePresence>
          {matchError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-4 left-4 right-4 z-50 rounded-2xl border border-red-500/50 bg-red-500/10 p-4 backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-500">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Matchmaking Error</span>
                  <p className="text-[10px] text-red-200/70 font-medium">{matchError}</p>
                </div>
                <button
                  onClick={() => setMatchError(null)}
                  className="ml-auto text-red-500/50 hover:text-red-500"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Lobby
          rating={gs.playerRating}
          isMatchmaking={gs.phase === 'matchmaking'}
          opponentName={gs.opponentName}
          onFindMatch={handleFindMatch}
          onMatchFound={handleMatchFound}
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
    ) : (gs.phase === 'playing' || gs.phase === 'result') ? (
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
          isSubmitting={isSubmitting}
          onDigitPress={handleDigitPress}
          onDelete={handleDeleteDigit}
          onSubmit={() => handleSubmitGuess(gs.currentInput)}
        />
        <AnimatePresence>
          {gs.phase === 'result' && gs.result && (
            <ResultModal
              result={gs.result}
              gameMode={gs.gameMode}
              stakeAmount={gs.stakeAmount}
              opponentCode={gs.opponentCode}
              opponentName={gs.opponentName}
              ratingDelta={gs.ratingDelta ?? 0}
              playerRating={gs.playerRating}
              guessCount={gs.playerGuesses.length}
              onPlayAgain={handlePlayAgain}
            />
          )}
        </AnimatePresence>
      </motion.div>
    ) : null
  );

  const handleJoinChallenge = async (gameId: string, challengerAddress: string) => {
    if (!isConnected || !address) return;
    setIsJoining(gameId);
    try {
      // --- ON-CHAIN: Join Challenge ---
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'joinChallenge',
        args: [challengerAddress as `0x${string}`],
      });

      if (!publicClient) throw new Error("Public client not available");
      await publicClient.waitForTransactionReceipt({ hash });

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
    } finally {
      setIsJoining(null);
    }
  };

  const renderOpenGames = () => (
    <motion.div key="games" className="flex w-full flex-col gap-10 px-5 pt-24 pb-32 text-left" {...screenVariants}>
      {!isConnected ? (
        <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
          <div className="text-6xl grayscale opacity-30">🛡️</div>
          <div className="flex flex-col gap-2">
            <h2 className="font-orbitron text-xl font-black tracking-widest text-[var(--text)] uppercase">Wallet Not Connected</h2>
            <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-widest max-w-[200px] mx-auto">Connect your wallet to view active challenges and accept duels</p>
          </div>
          <button 
            onClick={() => {
              // Trigger RainbowKit connect if possible, or just scroll to top
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="rounded-full bg-[var(--accent)] px-8 py-3 text-[10px] font-black uppercase tracking-widest text-[#030C15]"
          >
            Connect Wallet
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
                      <span className="font-code text-sm font-bold text-[var(--text)]">{game.player1Address.slice(0, 6)}...{game.player1Address.slice(-4)}</span>
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
                          onClick={() => handleJoinChallenge(game.id, game.player1Address)}
                          disabled={isJoining === game.id}
                          className="rounded-xl bg-[var(--text)] px-4 py-2 text-[10px] font-black uppercase tracking-tighter text-[var(--bg)] transition-transform active:scale-95 disabled:opacity-50"
                        >
                          {isJoining === game.id ? 'Joining...' : 'Accept'}
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

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-start overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-xl px-4 relative">
        {activeTab === 'home' ? renderHomeContent() :
          activeTab === 'games' ? renderOpenGames() :
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

