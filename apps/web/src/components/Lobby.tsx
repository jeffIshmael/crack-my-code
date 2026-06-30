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
import { ChevronRight, X } from 'lucide-react';
import { ThemeLogo } from '@/components/ThemeLogo';
import { ThemePlayfulHeader } from '@/components/ThemePlayfulHeader';
import JoinChallenge from '@/components/JoinChallenge';
import { FarcasterShareGameButton } from '@/components/FarcasterShareGameButton';
import { buildGameShareUrl } from '@/lib/farcaster-embed';

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
  isCancellingMatchmaking?: boolean;
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
  isCancellingMatchmaking = false,
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
    <div className="relative flex min-h-[calc(100dvh-var(--nav-clearance-with-safe))] flex-col items-center justify-between px-4 pt-6 text-[var(--text)] overflow-hidden">

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
                  <div className="theme-card mx-auto flex max-w-[320px] flex-col items-center gap-5 px-6 py-8">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--border-mid)] border-t-[var(--accent)]" />
                    <div className="flex flex-col items-center gap-1 text-center">
                      <span className="font-ui text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Setting up challenge</span>
                      <span className="font-body text-[10px] text-[var(--text-dim)]">Confirming on-chain transaction…</span>
                    </div>
                    {onCancelMatchmaking && (
                      <button
                        type="button"
                        onClick={onCancelMatchmaking}
                        className="w-full rounded-2xl border-2 border-[var(--border-mid)] bg-white py-3 font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)] transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-500 active:scale-[0.98]"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )
              ) : (
                <MatchmakingPulse
                  opponentName={opponentName}
                  mode={selectedMode}
                  searchTime={searchTime}
                  onCancel={onCancelMatchmaking}
                  isCancelling={isCancellingMatchmaking}
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
                  type="button"
                  onClick={isConnected ? openPvPModal : () => login()}
                  className={`theme-game-btn theme-game-btn--pvp group ${!isConnected ? 'opacity-60' : ''}`}
                  aria-disabled={!isConnected}
                >
                  <div className="theme-game-btn__inner">
                    <span className="theme-game-btn__emoji" aria-hidden>👥</span>
                    <div className="theme-game-btn__content flex-1">
                      <span className="theme-game-btn__title">Play Against Opponent</span>
                      <span
                        className={`theme-game-btn__subtitle ${
                          !isConnected ? '!text-[var(--orange)] font-bold' : ''
                        }`}
                      >
                        {!isConnected ? 'Sign in required' : 'Human Opponent'}
                      </span>
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
                    onSignInRequired={() => login()}
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[var(--text)]/20 backdrop-blur-sm pointer-events-auto"
              onClick={() => !isCreating && setShowPvPModal(false)}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative w-full max-w-[440px] overflow-hidden rounded-t-[2.5rem] pointer-events-auto"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-mid)',
                borderBottom: 'none',
                boxShadow: '0 -12px 40px rgba(47, 111, 214, 0.12)',
              }}
            >
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-60" />

              <button
                type="button"
                onClick={() => !isCreating && setShowPvPModal(false)}
                disabled={isCreating}
                className="absolute right-4 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--border-mid)] bg-white text-[var(--text-dim)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] hover:scale-105 active:scale-95 disabled:opacity-40"
                aria-label="Close"
              >
                <X size={20} />
              </button>

              <div className="px-6 pb-10 pt-6">
              <AnimatePresence mode="wait">
                {isCreating ? (
                  <motion.div
                    key="creating-loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center gap-6 py-10"
                  >
                    <div className="relative h-20 w-20">
                      <div className="absolute inset-0 rounded-full border-2 border-[var(--accent)]/15" />
                      <div className="absolute inset-0 rounded-full border-t-2 border-[var(--accent)] animate-spin" />
                      <div className="absolute inset-4 rounded-full border-2 border-[var(--orange)]/15" />
                      <div className="absolute inset-4 rounded-full border-b-2 border-[var(--orange)] animate-spin-slow" />
                    </div>
                    <div className="flex flex-col items-center gap-2 text-center">
                      <span className="font-ui text-xs font-bold uppercase tracking-[0.2em] text-[var(--text)]">Initializing challenge</span>
                      <span className="font-body text-[10px] text-[var(--text-dim)]">Waiting for network confirmation…</span>
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
                    <div className="text-center pt-2">
                      <h2 className="font-ui text-lg font-bold text-[var(--text)]">Start a challenge</h2>
                      <p className="font-body pt-1 text-xs text-[var(--text-dim)]">Pick how you want to play</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <button
                        type="button"
                        onClick={() => handleStartPvP('fun')}
                        className="theme-card group flex flex-col gap-2 p-5 text-left transition-all hover:translate-y-[-2px] active:translate-y-[1px]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-ui text-sm font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">Friendly match</span>
                          <span className="text-xl transition-transform group-hover:scale-110" aria-hidden>⚔️</span>
                        </div>
                        <p className="font-body text-[11px] text-[var(--text-dim)]">Free match · climb the global ranking</p>
                      </button>

                      <div className="theme-card relative flex flex-col gap-2 p-5 opacity-60">
                        <div className="absolute top-3 right-3 rounded-full bg-[var(--orange-dim)] px-2.5 py-1">
                          <span className="font-ui text-[8px] font-bold uppercase tracking-widest text-[var(--orange)]">
                            Coming soon
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-ui text-sm font-bold text-[var(--text-dim)]">Professional</span>
                          <span className="text-xl grayscale" aria-hidden>💰</span>
                        </div>
                        <p className="font-body pr-16 text-[11px] text-[var(--text-dim)]">
                          USDT stakes · winner takes 99%
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
                    className="flex flex-col gap-6"
                  >
                    <div className="text-center pt-2">
                      <h2 className="font-ui text-lg font-bold text-[var(--orange)]">Set your stake</h2>
                      <p className="font-body pt-1 text-xs text-[var(--text-dim)]">Define the reward for this duel</p>
                    </div>

                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-2">
                        <label className="font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">USDT amount</label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            value={stake}
                            onChange={(e) => setStake(e.target.value)}
                            className="w-full rounded-2xl border-2 border-[var(--border-mid)] bg-white p-4 pr-16 font-ui text-2xl font-bold text-[var(--orange)] outline-none focus:border-[var(--orange)]"
                            autoFocus
                            placeholder="0.00"
                          />
                          <span className="absolute right-4 font-ui text-sm font-bold text-[var(--text-dim)]">USDT</span>
                        </div>
                        <div className="flex items-center justify-between px-1">
                          <span className={`font-body text-[10px] ${(parseFloat(stake) || 0) < 0.1 ? 'font-bold text-red-500' : 'text-[var(--text-dim)]'}`}>
                            Minimum 0.1 USDT
                          </span>
                          <span className="font-body text-[10px] text-[var(--text-dim)]">
                            Available: <span className="font-bold text-[var(--text)]">{usdtData ? `${parseFloat(usdtData.formatted).toFixed(2)} USDT` : '…'}</span>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1 rounded-2xl border-2 border-[var(--clue-green)]/20 bg-[var(--clue-green-bg)] p-4">
                          <span className="font-ui text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Winner reward</span>
                          <span className="font-ui text-xl font-bold text-[var(--clue-green)]">
                            {((parseFloat(stake) || 0) * 2 * 0.99).toFixed(3)} <span className="text-[10px]">USDT</span>
                          </span>
                        </div>
                        <div className="theme-card flex flex-col gap-1 p-4 !shadow-none">
                          <span className="font-ui text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Platform fee</span>
                          <span className="font-ui text-xl font-bold text-[var(--text)]">
                            1.0 <span className="text-[10px]">%</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => allowance < stakeBigInt ? handleApprove(stakeBigInt) : setPvpStep('visibility')}
                          disabled={isApproving || isCreating || (parseFloat(stake) || 0) < 0.1}
                          className="theme-game-btn theme-game-btn--pvp w-full min-h-0 py-4 disabled:opacity-50"
                        >
                          <span className="theme-game-btn__title text-sm">
                            {isApproving ? 'Approving…' : allowance < stakeBigInt ? 'Approve USDT' : 'Choose visibility'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPvpStep('selection')}
                          className="w-full rounded-2xl border-2 border-[var(--border-mid)] bg-white py-3 font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        >
                          Go back
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
                    className="flex flex-col gap-6"
                  >
                    <div className="text-center pt-2">
                      <h2 className="font-ui text-lg font-bold text-[var(--accent)]">Who can join?</h2>
                      <p className="font-body pt-1 text-xs text-[var(--text-dim)]">Choose how others find your challenge</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <button
                        type="button"
                        onClick={() => handleFinalizeChallenge(true)}
                        disabled={isCreating}
                        className="theme-card group flex flex-col gap-2 p-5 text-left transition-all hover:translate-y-[-2px] disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-ui text-sm font-bold text-[var(--text)]">Anyone can join</span>
                          <span className="text-xl" aria-hidden>🌍</span>
                        </div>
                        <p className="font-body text-[11px] text-[var(--text-dim)]">Live matchmaking · pairs when another player is searching</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFinalizeChallenge(false)}
                        disabled={isCreating}
                        className="theme-card flex flex-col gap-2 border-[var(--accent)]/30 bg-[var(--accent-dim)] p-5 text-left transition-all hover:translate-y-[-2px] disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-ui text-sm font-bold text-[var(--accent)]">Invite only</span>
                          <span className="text-xl" aria-hidden>🔐</span>
                        </div>
                        <p className="font-body text-[11px] text-[var(--text-dim)]">Private challenge · share a Game ID with a friend</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => selectedMode === 'cash' ? setPvpStep('config') : setPvpStep('selection')}
                        className="mt-1 font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)] transition-colors hover:text-[var(--accent)]"
                      >
                        Go back
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
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
  onCancel,
  isCancelling = false,
}: {
  opponentName: string,
  mode: GameMode,
  searchTime?: number,
  onCancel?: () => void,
  isCancelling?: boolean,
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
            <div className="rounded-full border-2 border-[var(--border-mid)] bg-white px-4 py-1 shadow-[var(--pop-shadow)]">
              <span className="font-code text-sm font-bold text-[var(--accent)]">
                {Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <button
              type="button"
              onClick={onCancel}
              disabled={isCancelling || !onCancel}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
            >
              {isCancelling ? 'CANCELLING...' : 'CANCEL SEARCH'}
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

        <FarcasterShareGameButton joinCode={joinCode} />

        <button
          type="button"
          onClick={() => {
            const url = buildGameShareUrl(joinCode);
            void navigator.clipboard.writeText(url);
            toast.success('Share link copied!');
          }}
          className="w-full rounded-2xl border border-[var(--border-mid)] bg-white py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] transition-all hover:bg-[var(--bg-elevated)]"
        >
          Copy share link
        </button>

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
