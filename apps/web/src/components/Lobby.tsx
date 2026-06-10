'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { ConnectButton } from "@/components/connect-button";
import type { GameMode } from '@/lib/game';
import { PROFESSIONAL_MODE_ENABLED } from '@/lib/game';
import { parseUnits } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI, USDT_ADDRESS, ERC20_ABI } from '../../blockchain/constants';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { ChevronRight } from 'lucide-react';
import { ThemeLogo } from '@/components/ThemeLogo';
import { ThemePlayfulHeader } from '@/components/ThemePlayfulHeader';
import JoinChallenge from '@/components/JoinChallenge';

interface LobbyProps {
  rating: number;
  points: number;
  pointsLoading?: boolean;
  isMatchmaking: boolean;
  opponentName: string;
  onFindMatch: (mode: GameMode, stake: number, isPublic?: boolean, userBalance?: number) => Promise<void>;
  onMatchFound: (gameId: string, opponentAddress: string) => void;
  onWalletClick?: () => void;
  searchTime?: number;
  onCancelMatchmaking?: () => void;
  shareableJoinCode?: string;
  joinGameIdInput?: string;
  onJoinGameIdInputChange?: (value: string) => void;
  onJoinByGameId?: () => void;
  isJoining?: boolean;
}

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function Lobby({
  rating,
  points,
  pointsLoading = false,
  isMatchmaking,
  opponentName,
  onFindMatch,
  onMatchFound,
  onWalletClick,
  searchTime = 0,
  onCancelMatchmaking,
  shareableJoinCode,
  joinGameIdInput = '',
  onJoinGameIdInputChange,
  onJoinByGameId,
  isJoining = false,
}: LobbyProps) {
  const { isConnected, address } = useAccount();
  const { login } = usePrivy();
  const { data: usdtData } = useBalance({
    address,
    token: USDT_ADDRESS as `0x${string}`,
  });

  const [showPvPModal, setShowPvPModal] = useState(false);
  const [pvpStep, setPvpStep] = useState<'selection' | 'config' | 'visibility'>('selection');
  const [selectedMode, setSelectedMode] = useState<GameMode>('fun');
  const [stake, setStake] = useState<string>('5');
  const [isCreating, setIsCreating] = useState(false);

  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESS] : undefined,
    query: {
      enabled: !!address,
    }
  });

  const allowance = (allowanceData as bigint) ?? 0n;

  const { writeContract: approve, data: approveHash, isPending: isApprovingAction } = useWriteContract();

  const { isLoading: isWaitingForApproval } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  useEffect(() => {
    if (approveHash && !isWaitingForApproval) {
      refetchAllowance();
    }
  }, [approveHash, isWaitingForApproval, refetchAllowance]);

  const isApproving = isApprovingAction || isWaitingForApproval;

  const handleApprove = async (amount: bigint) => {
    try {
      approve({
        address: USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, amount],
      });
    } catch (err) {
      console.error('Approval failed', err);
      toast.error('Approval Failed', { description: getErrorMessage(err) });
    }
  };

  const stakeBigInt = useMemo(() => {
    try {
      return parseUnits(stake || '0', 6);
    } catch {
      return 0n;
    }
  }, [stake]);

  const handleStartPvP = (mode: GameMode) => {
    if (mode === 'cash' && !PROFESSIONAL_MODE_ENABLED) {
      toast.info('Professional mode coming soon', {
        description: 'Free friendly matches and Cipher AI are live now.',
      });
      return;
    }
    setSelectedMode(mode);
    if (mode === 'cash') {
      setPvpStep('config');
    } else {
      setPvpStep('visibility');
    }
  };

  const handleFinalizeChallenge = async (isPublic: boolean) => {
    setIsCreating(true);
    try {
      const stakeAmount = selectedMode === 'cash' ? parseFloat(stake) || 0 : 0;
      const currentBalance = parseFloat(usdtData?.formatted || '0');
      await onFindMatch(selectedMode, stakeAmount, isPublic, currentBalance);
      setShowPvPModal(false);
      setPvpStep('selection'); // Reset for next time
    } catch (err) {
      console.error('Failed to create challenge', err);
      // getErrorMessage is already imported and will handle the message
      toast.error('Challenge Error', { description: getErrorMessage(err) });
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartAI = async () => {
    setIsCreating(true);
    setSelectedMode('ai');
    try {
      await onFindMatch('ai', 0);
    } finally {
      setIsCreating(false);
    }
  };

  const openPvPModal = () => {
    setPvpStep('selection');
    setShowPvPModal(true);
  };

  return (
    <div className="relative flex h-dvh flex-col items-center justify-between px-4 pt-6 pb-[calc(var(--nav-clearance)+env(safe-area-inset-bottom,0px))] text-[var(--text)] overflow-hidden">

      {/* ── Top row with Sign Up ── */}
      {/* ── Top Header Row ── */}
      {/* ── Top Header Section ── */}
      <div className="flex w-full flex-col">
        <div className="mb-5 flex w-full justify-center">
          <ThemeLogo />
        </div>

        {isConnected ? (
          <ThemePlayfulHeader
            points={points}
            pointsLoading={pointsLoading}
            usdtFormatted={usdtData?.formatted}
          />
        ) : (
          <div className="mt-1 flex w-full justify-center">
            <button
              onClick={() => login()}
              className="theme-card flex items-center gap-2 px-6 py-2 transition-transform hover:scale-105"
              type="button"
            >
              <span className="font-ui text-[10px] uppercase tracking-widest text-[var(--text)]">Sign In</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Center: Play actions ── */}
      <div className="relative flex w-full flex-1 flex-col items-center justify-center py-2">
        <div className="z-10 flex w-full flex-col">
          {isMatchmaking ? (
            <div className="w-full">
              {opponentName === 'WAITING' ? (
                shareableJoinCode ? (
                  <InviteWaiting
                    searchTime={searchTime}
                    onCancel={onCancelMatchmaking}
                    joinCode={shareableJoinCode}
                    isCreating={isCreating}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-[var(--accent)]" />
                    <span className="text-[10px] font-black tracking-widest text-[var(--accent)]">GENERATING...</span>
                  </div>
                )
              ) : (
                <MatchmakingPulse
                  opponentName={opponentName}
                  mode={selectedMode}
                  searchTime={searchTime}
                  onCancel={onCancelMatchmaking}
                />
              )}
            </div>
          ) : (
            <div className="theme-play-zone">
              <div className="flex flex-col gap-[1.25rem]">
                <button
                  onClick={handleStartAI}
                  disabled={isCreating}
                  className="theme-game-btn theme-game-btn--ai group"
                >
                  <div className="theme-game-btn__inner">
                    <span className="theme-game-btn__emoji" aria-hidden>🤖</span>
                    <div className="theme-game-btn__content flex-1">
                      <span className="theme-game-btn__title">Play Against Cipher AI</span>
                      <span className="theme-game-btn__subtitle">Computer Match</span>
                    </div>
                    <ChevronRight
                      size={20}
                      className="theme-game-btn__chevron flex-shrink-0 text-[var(--text-dim)]"
                      aria-hidden
                    />
                  </div>
                </button>

                <button
                  onClick={isConnected ? openPvPModal : () => login()}
                  disabled={!isConnected}
                  className="theme-game-btn theme-game-btn--pvp group"
                >
                  <div className="theme-game-btn__inner">
                    <span className="theme-game-btn__emoji" aria-hidden>👥</span>
                    <div className="theme-game-btn__content flex-1">
                      <span className="theme-game-btn__title">Play Against Opponent</span>
                      <span className="theme-game-btn__subtitle">Human Opponent</span>
                    </div>
                    <ChevronRight
                      size={20}
                      className="theme-game-btn__chevron theme-game-btn__chevron--light flex-shrink-0"
                      aria-hidden
                    />
                  </div>
                </button>
              </div>

              {onJoinByGameId && onJoinGameIdInputChange && (
                <>
                  <div className="border-t border-[var(--border-mid)]" aria-hidden />
                  <JoinChallenge
                    value={joinGameIdInput}
                    onChange={onJoinGameIdInputChange}
                    onJoin={onJoinByGameId}
                    isJoining={isJoining}
                    disabled={!isConnected}
                    collapsible
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── PvP Mode Selection Bottom Sheet ── */}
      <AnimatePresence>
        {showPvPModal && (
          <div className="fixed inset-x-0 inset-y-0 z-[120] flex items-end justify-center pointer-events-none">
            {/* Backdrop (Full screen) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
              onClick={() => setShowPvPModal(false)}
            />

            {/* Sheet (Caged) */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative w-full max-w-[440px] rounded-t-[2.5rem] border-t border-x border-black/10 bg-[#FDFCFB] p-8 shadow-[0_-12px_40px_rgba(0,0,0,0.25)] pb-12 pointer-events-auto"
            >
              {/* Handle */}
              <div className="absolute top-3 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/10" />

              <AnimatePresence mode="wait">
                {isCreating ? (
                  <motion.div
                    key="creating-loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-12 gap-6"
                  >
                    <div className="relative h-20 w-20">
                      <div className="absolute inset-0 rounded-full border-2 border-[var(--accent)]/20" />
                      <div className="absolute inset-0 rounded-full border-t-2 border-[var(--accent)] animate-spin" />
                      <div className="absolute inset-4 rounded-full border-2 border-[var(--orange)]/20" />
                      <div className="absolute inset-4 rounded-full border-b-2 border-[var(--orange)] animate-spin-slow" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="font-orbitron text-xs font-black tracking-[0.3em] text-white">INITIALIZING ON-CHAIN</span>
                      <span className="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-widest animate-pulse">Waiting for network confirmation...</span>
                    </div>
                  </motion.div>
                ) : pvpStep === 'selection' ? (
                  <motion.div
                    key="step-selection"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex flex-col gap-6"
                  >
                    <div className="text-center">
                      <h2 className="font-orbitron text-lg font-black tracking-[0.2em]">INITIATE CHALLENGE</h2>
                      <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest pt-1">Select your engagement parameters</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {/* Friendly Option */}
                      <button
                        onClick={() => handleStartPvP('fun')}
                        className="group flex flex-col gap-2 rounded-2xl border border-black/5 bg-black/5 p-5 text-left transition-all hover:bg-black/[0.08] hover:translate-y-[-2px] active:translate-y-[1px] shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-orbitron text-sm font-black tracking-wider text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">FRIENDLY</span>
                          <span className="text-xl transition-transform group-hover:scale-125">⚔️</span>
                        </div>
                        <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Free Match • Play for Global Ranking</p>
                      </button>

                      {/* Professional (coming soon) */}
                      <div className="relative flex flex-col gap-2 rounded-2xl border border-black/10 bg-black/[0.03] p-5 opacity-70">
                        <div className="absolute top-3 right-3 rounded-full bg-[var(--orange)]/15 px-2.5 py-1">
                          <span className="text-[8px] font-black uppercase tracking-widest text-[var(--orange)]">
                            Coming Soon
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-orbitron text-sm font-black tracking-wider text-black/50">PROFESSIONAL</span>
                          <span className="text-xl grayscale">💰</span>
                        </div>
                        <p className="text-[10px] font-bold text-black/35 uppercase tracking-widest pr-16">
                          USDT stakes • Winner takes 99%
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : pvpStep === 'config' ? (
                  <motion.div
                    key="step-config"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex flex-col gap-8"
                  >
                    <div className="text-center">
                      <h2 className="font-orbitron text-lg font-black tracking-[0.2em] text-[var(--orange)]">STAKE CONFIGURATION</h2>
                      <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest pt-1">Define the reward parameters</p>
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-dim)]">Enter USDT Stake</label>
                        <div className="relative flex flex-col gap-2">
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              value={stake}
                              onChange={(e) => setStake(e.target.value)}
                              className="w-full flex-1 rounded-2xl border border-black/10 bg-black/5 p-5 text-2xl font-black text-[var(--orange)] outline-none ring-[var(--orange)] focus:ring-1"
                              autoFocus
                              placeholder="0.00"
                            />
                            <span className="absolute right-5 text-lg font-black text-[var(--text-dim)] mr-6">USDT</span>
                          </div>
                          <div className="flex items-center justify-between px-2">
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${(parseFloat(stake) || 0) < 0.1 ? 'text-red-500 animate-pulse' : 'text-[var(--text-dim)]'}`}>
                              Min: 0.1 USDT
                            </span>
                            <span className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                              Available: <span className="text-[var(--text)]">{usdtData ? `${parseFloat(usdtData.formatted).toFixed(2)} USDT` : '...'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 rounded-2xl bg-[var(--clue-green)]/5 p-4 border border-[var(--clue-green)]/10">
                          <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-dim)]">Winner&apos;s Reward</span>
                          <span className="text-xl font-black text-[var(--clue-green)] tracking-tight">
                            {((parseFloat(stake) || 0) * 2 * 0.99).toFixed(3)} <span className="text-[10px]">USDT</span>
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 rounded-2xl bg-white/5 p-4 border border-white/10">
                          <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-dim)]">Platform Fee</span>
                          <span className="text-xl font-black text-[var(--text)] tracking-tight">
                            1.0 <span className="text-[10px]">%</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => allowance < stakeBigInt ? handleApprove(stakeBigInt) : setPvpStep('visibility')}
                          disabled={isApproving || isCreating || (parseFloat(stake) || 0) < 0.1}
                          className="w-full rounded-2xl bg-[var(--orange)] py-4 text-[10px] font-black uppercase tracking-widest text-[var(--bg-base)] shadow-[0_0_20px_rgba(220,38,38,0.2)] disabled:opacity-50"
                        >
                          {isApproving ? 'APPROVING...' : (allowance < stakeBigInt ? 'APPROVE USDT' : 'SET VISIBILITY')}
                        </button>
                        <button
                          onClick={() => setPvpStep('selection')}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10"
                        >
                          GO BACK
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step-visibility"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col gap-8"
                  >
                    <div className="text-center">
                      <h2 className="font-orbitron text-lg font-black tracking-[0.2em] text-[var(--accent)]">CHALLENGE VISIBILITY</h2>
                      <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest pt-1">Who can accept this duel?</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <button
                        onClick={() => handleFinalizeChallenge(true)}
                        disabled={isCreating}
                        className="group flex flex-col gap-2 rounded-2xl border border-black/10 bg-black/5 p-5 text-left transition-all hover:bg-black/[0.08] disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-orbitron text-sm font-black tracking-wider text-black">ANYONE CAN JOIN</span>
                          <span className="text-xl">🌍</span>
                        </div>
                        <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Live matchmaking • Pairs when another player is searching</p>
                      </button>

                      <button
                        onClick={() => handleFinalizeChallenge(false)}
                        disabled={isCreating}
                        className="group flex flex-col gap-2 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-5 text-left transition-all hover:bg-[var(--accent)]/10 disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-orbitron text-sm font-black tracking-wider text-[var(--accent)]">INVITE ONLY</span>
                          <span className="text-xl">🔐</span>
                        </div>
                        <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Private challenge • Share Game ID</p>
                      </button>

                      <button
                        onClick={() => selectedMode === 'cash' ? setPvpStep('config') : setPvpStep('selection')}
                        className="mt-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] hover:text-white transition-colors"
                      >
                        GO BACK
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Close Spacer */}
              <div className="h-12" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Radar matchmaking animation ────────────────────────────────────────────

function MatchmakingPulse({
  opponentName,
  mode,
  searchTime = 0,
  onCancel
}: {
  opponentName: string,
  mode: GameMode,
  searchTime?: number,
  onCancel?: () => void
}) {
  const isAI = mode === 'ai';

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Radar rings */}
      <div className="relative flex h-28 w-28 items-center justify-center">
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border"
            style={{ borderColor: isAI ? 'var(--clue-yellow)' : 'var(--accent)' }}
            initial={{ width: 24, height: 24, opacity: 0.8 }}
            animate={{ width: 112, height: 112, opacity: 0 }}
            transition={{ duration: 1.8, delay: ring * 0.5, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
        {/* Center dot */}
        <div
          className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: isAI ? 'rgba(245,158,11,0.1)' : 'var(--accent-dim)', border: `2px solid ${isAI ? 'var(--clue-yellow)' : 'var(--accent)'}`, boxShadow: `0 0 16px ${isAI ? 'rgba(245,158,11,0.3)' : 'var(--accent-glow)'}` }}
        >
          <motion.div
            className="h-3 w-3 rounded-full"
            style={{ background: isAI ? 'var(--clue-yellow)' : 'var(--accent)' }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-orbitron text-sm font-semibold tracking-widest" style={{ color: isAI ? 'var(--clue-yellow)' : 'var(--accent)' }}>
          {isAI ? 'INITIALIZING AI' : 'FINDING OPPONENT'}
        </p>
        <motion.p
          className="text-xs"
          style={{ color: 'var(--text-2)' }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          {isAI ? 'Booting logical engine' : 'Scanning for challengers'}
          <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}>.</motion.span>
          <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.6 }}>.</motion.span>
          <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.8 }}>.</motion.span>
        </motion.p>

        {/* Live Timer */}
        {!isAI && (
          <div className="mt-4 flex flex-col items-center gap-4">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1">
              <span className="font-code text-sm font-black text-[var(--accent)]">
                {Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <button
              onClick={onCancel}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/20 active:scale-95"
            >
              CANCEL SEARCH
            </button>
          </div>
        )}
      </div>

      {/* Found opponent indicator */}
      {!isAI && (
        <motion.div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-mid)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          <motion.div
            className="h-2 w-2 rounded-full"
            style={{ background: 'var(--orange)' }}
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
          <span className="font-code text-sm font-bold" style={{ color: 'var(--orange)' }}>
            {opponentName}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-2)' }}>found</span>
        </motion.div>
      )}
    </div>
  );
}

function InviteWaiting({
  searchTime,
  onCancel,
  joinCode,
  isCreating
}: {
  searchTime: number,
  onCancel?: () => void,
  joinCode: string,
  isCreating?: boolean
}) {
  const [copied, setCopied] = useState(false);
  const timeLeft = Math.max(0, 300 - searchTime); // 5 minutes

  const handleCopy = () => {
    navigator.clipboard.writeText(joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Game ID Copied!");
  };

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent)]/10">
        <span className="text-4xl animate-bounce">⏳</span>
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h3 className="font-orbitron text-base font-black tracking-widest text-[var(--accent)] uppercase">Waiting for Friend</h3>
        <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest max-w-[240px]">
          Share this Game ID. Friends paste it under Join Challenge on Home or Open. Expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}.
        </p>
      </div>

      <div className="flex w-full max-w-[300px] flex-col gap-3">
        <div
          onClick={handleCopy}
          className="relative flex cursor-pointer flex-col gap-2 overflow-hidden rounded-2xl border border-black/10 bg-black/5 p-4 transition-all hover:bg-black/10"
        >
          <span className="text-[8px] font-black uppercase tracking-widest text-black/40">Game ID</span>
          <div className="flex items-center justify-between gap-2">
            <span className="font-code text-lg font-black tracking-[0.25em] text-[var(--accent)]">{joinCode}</span>
            <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">
              {copied ? 'COPIED' : 'COPY'}
            </span>
          </div>
        </div>

        <button
          onClick={onCancel}
          disabled={isCreating}
          className="rounded-2xl border border-red-500/30 bg-red-500/10 py-4 text-[10px] font-black uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
        >
          {isCreating ? 'CANCELLING...' : 'CANCEL INVITE'}
        </button>
      </div>
    </div>
  );
}
