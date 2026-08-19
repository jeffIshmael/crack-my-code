'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { ConnectButton } from "@/components/connect-button";
import type { GameMode } from '@/lib/game';
import { PROFESSIONAL_MODE_ENABLED, CIPHER_DAILY_WIN_CAP } from '@/lib/game';
import { parseUnits } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI, USDT_ADDRESS, ERC20_ABI } from '../../blockchain/constants';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { X, Lock, Check, ArrowLeft } from 'lucide-react';
import { ThemeLogo } from '@/components/ThemeLogo';
import { ThemePlayfulHeader } from '@/components/ThemePlayfulHeader';
import JoinChallenge from '@/components/JoinChallenge';
import { FarcasterShareGameButton } from '@/components/FarcasterShareGameButton';
import { buildGameShareUrl } from '@/lib/farcaster-embed';
import type { CipherDailyStatus } from '@/hooks/use-cipher-daily-status';
import { useMiniAppEnvironment } from '@/hooks/use-mini-app-environment';
import type { OpenChallengeSummary } from '@/lib/open-challenges';

const MINIPAY_ADD_USDT_URL = 'https://link.minipay.xyz/add_cash?tokens=USDT';

interface LobbyProps {
  points: number;
  pointsLoading?: boolean;
  isSignedIn?: boolean;
  isWalletConnecting?: boolean;
  payoutAddress?: string;
  cipherStatus?: CipherDailyStatus | null;
  cipherStatusLoaded?: boolean;
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
  onJoinCashChallenge?: (game: {
    id: string;
    player1Address: string;
    stake: number;
  }) => Promise<void>;
  isJoining?: boolean;
  /** Called when user hides the searching screen so they can browse the lobby */
  onHideSearch?: () => void;
  /** True when search is hidden but still active — blocks new game creation */
  hasPendingSearch?: boolean;
  /** Restore the search screen from the banner */
  onShowSearch?: () => void;
  pendingStake?: number;
}

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function Lobby({
  points,
  pointsLoading = false,
  isSignedIn = false,
  isWalletConnecting = false,
  payoutAddress,
  cipherStatus = null,
  cipherStatusLoaded = true,
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
  onJoinCashChallenge,
  isJoining = false,
  onHideSearch,
  hasPendingSearch = false,
  onShowSearch,
  pendingStake = 0,
}: LobbyProps) {
  const { isConnected, address: wagmiAddress } = useAccount();
  const { login } = usePrivy();
  const { isMiniPay } = useMiniAppEnvironment();
  const walletAddress = payoutAddress || wagmiAddress;
  const canUseWallet = isSignedIn || isWalletConnecting;
  const { data: usdtData } = useBalance({
    address: walletAddress as `0x${string}` | undefined,
    token: USDT_ADDRESS as `0x${string}`,
    query: { enabled: !!walletAddress },
  });

  const [showPvPModal, setShowPvPModal] = useState(false);
  // const [showCipherSignInModal, setShowCipherSignInModal] = useState(false);
  const [pvpStep, setPvpStep] = useState<'selection' | 'config' | 'visibility'>('selection');
  const [selectedMode, setSelectedMode] = useState<GameMode>('fun');
  const [stake, setStake] = useState<string>('5');
  const [isCreating, setIsCreating] = useState(false);
  const [cashVisibility, setCashVisibility] = useState<boolean | null>(null);
  const [showCashTxModal, setShowCashTxModal] = useState(false);
  const [showJoinCashModal, setShowJoinCashModal] = useState(false);
  const [pendingCreateAfterApprove, setPendingCreateAfterApprove] = useState(false);
  const [pendingJoinAfterApprove, setPendingJoinAfterApprove] = useState(false);
  const [isJoiningPublic, setIsJoiningPublic] = useState(false);
  const [stakesWithOpen, setStakesWithOpen] = useState<number[]>([]);
  const [openByStake, setOpenByStake] = useState<Record<string, OpenChallengeSummary | null>>({});

  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: walletAddress ? [walletAddress, CONTRACT_ADDRESS] : undefined,
    query: {
      enabled: !!walletAddress,
    }
  });

  const allowance = (allowanceData as bigint) ?? 0n;

  const cipherStatusPending = isSignedIn && !!payoutAddress && !cipherStatusLoaded;
  const cipherGamesToday = cipherStatus?.gamesPlayedToday ?? 0;
  const cipherGamesRemaining = cipherStatus?.gamesRemaining ?? CIPHER_DAILY_WIN_CAP;
  const cipherAtDailyCap = cipherStatusLoaded && Boolean(cipherStatus?.atDailyCap);
  const cipherButtonDisabled = isCreating || cipherAtDailyCap || cipherStatusPending || hasPendingSearch;

  const { writeContractAsync: approve, data: approveHash, isPending: isApprovingAction } = useWriteContract();

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
      await approve({
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

  const selectedStakeAmount = parseFloat(stake) || 0;
  const usdtBalance = parseFloat(usdtData?.formatted || '0');
  const usdtBalanceLoading = !!walletAddress && usdtData === undefined;
  const canAffordStake = !usdtBalanceLoading && usdtBalance >= selectedStakeAmount;

  const joinTarget = openByStake[String(selectedStakeAmount)] ?? null;
  const canJoinExisting = cashVisibility === true && !!joinTarget;

  const handleAddUsdt = () => {
    window.location.href = MINIPAY_ADD_USDT_URL;
  };

  useEffect(() => {
    if (!showPvPModal || pvpStep !== 'config' || selectedMode !== 'cash' || cashVisibility !== true) {
      return;
    }
    if (!walletAddress) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/games/open-challenges?excludeAddress=${encodeURIComponent(walletAddress)}`,
        );
        const data = await res.json();
        if (!res.ok || cancelled) return;
        setStakesWithOpen(data.stakesWithOpen ?? []);
        setOpenByStake(data.byStake ?? {});
      } catch {
        // polling is best-effort
      }
    };

    poll();
    const intervalId = setInterval(poll, 2500);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [showPvPModal, pvpStep, selectedMode, cashVisibility, walletAddress]);

  const handleStartPvP = (mode: GameMode) => {
    if (mode === 'cash' && !PROFESSIONAL_MODE_ENABLED) {
      toast.info('Professional mode coming soon', {
        description: 'Free friendly matches and Cipher AI are live now.',
      });
      return;
    }
    setSelectedMode(mode);
    setCashVisibility(null);
    if (mode === 'cash') {
      setPvpStep('visibility');
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

  useEffect(() => {
    if (!pendingCreateAfterApprove) return;
    if (isApproving) return;
    if (allowance < stakeBigInt) return;
    if (cashVisibility === null) return;
    setPendingCreateAfterApprove(false);
    void handleFinalizeChallenge(cashVisibility);
  }, [pendingCreateAfterApprove, isApproving, allowance, stakeBigInt, cashVisibility]);

  const handleProceedCashChallenge = async () => {
    if (cashVisibility === null) {
      toast.error('Select visibility first', {
        description: 'Choose Invite only or Anyone can join before opening a challenge.',
      });
      return;
    }

    if (!canAffordStake) {
      toast.error('Insufficient USDT balance', {
        description: `You need ${selectedStakeAmount.toFixed(1)} USDT but only have ${usdtBalance.toFixed(2)} USDT available.`,
      });
      if (isMiniPay) {
        handleAddUsdt();
      }
      return;
    }

    setShowCashTxModal(false);

    if (allowance < stakeBigInt) {
      setPendingCreateAfterApprove(true);
      await handleApprove(stakeBigInt);
      return;
    }

    await handleFinalizeChallenge(cashVisibility);
  };

  const handleProceedJoinCash = async () => {
    if (!joinTarget || !onJoinCashChallenge) return;

    if (!canAffordStake) {
      toast.error('Insufficient USDT balance', {
        description: `You need ${selectedStakeAmount.toFixed(1)} USDT but only have ${usdtBalance.toFixed(2)} USDT available.`,
      });
      if (isMiniPay) handleAddUsdt();
      return;
    }

    setShowJoinCashModal(false);

    if (allowance < stakeBigInt) {
      setPendingJoinAfterApprove(true);
      await handleApprove(stakeBigInt);
      return;
    }

    setIsJoiningPublic(true);
    try {
      await onJoinCashChallenge({
        id: joinTarget.gameId,
        player1Address: joinTarget.hostAddress,
        stake: joinTarget.stake,
      });
      setShowPvPModal(false);
      setPvpStep('selection');
    } catch (err) {
      console.error('Public join failed', err);
      const errMsg = getErrorMessage(err);
      if (errMsg.includes('joined first') || errMsg.includes('joining this challenge')) {
        toast.error('Challenge taken', { description: errMsg });
      } else {
        toast.error('Join Error', { description: errMsg });
      }
    } finally {
      setIsJoiningPublic(false);
    }
  };

  useEffect(() => {
    if (!pendingJoinAfterApprove) return;
    if (isApproving) return;
    if (allowance < stakeBigInt) return;
    if (!joinTarget) return;
    setPendingJoinAfterApprove(false);
    void handleProceedJoinCash();
  }, [pendingJoinAfterApprove, isApproving, allowance, stakeBigInt, joinTarget]);

  const proceedStartAI = async () => {
    setIsCreating(true);
    setSelectedMode('ai');
    try {
      await onFindMatch('ai', 0);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartAI = async () => {
    if (cipherStatusPending || cipherAtDailyCap) return;

    // Cipher USDT reward campaign ended — play without sign-in nag
    // if (!isSignedIn) {
    //   if (!isCipherSignInModalDismissed()) {
    //     setShowCipherSignInModal(true);
    //     return;
    //   }
    // }

    await proceedStartAI();
  };

  // Cipher USDT reward campaign ended
  // const handleCipherSignIn = () => {
  //   setShowCipherSignInModal(false);
  //   login();
  // };
  //
  // const handleContinueGuest = () => {
  //   dismissCipherSignInModal();
  //   setShowCipherSignInModal(false);
  //   void proceedStartAI();
  // };

  const openPvPModal = () => {
    setPvpStep('selection');
    setShowPvPModal(true);
  };

  const pendingTimeLeft = Math.max(0, 300 - searchTime); // 5 minutes
  const pendingMinutes = Math.floor(pendingTimeLeft / 60);
  const pendingSeconds = pendingTimeLeft % 60;

  return (
    <motion.div
      className="relative flex min-h-[calc(100dvh-var(--nav-clearance-with-safe))] flex-col items-center justify-between app-page-gutter pt-6 text-[var(--text-on-sky)] overflow-hidden"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      <motion.div className="flex w-full flex-col" variants={fadeUp}>
        <div className="mb-5 flex w-full justify-center">
          <ThemeLogo />
        </div>

        {isWalletConnecting ? (
          <div className="mt-1 flex w-full justify-center">
            <div className="home-sign-in-btn theme-sky-readout flex items-center gap-2 px-6 py-2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
              <span className="font-ui text-[10px] uppercase tracking-widest text-[var(--text)]">
                Connecting wallet…
              </span>
            </div>
          </div>
        ) : isSignedIn && walletAddress ? (
          <ThemePlayfulHeader
            points={points}
            pointsLoading={pointsLoading}
            usdtFormatted={usdtData?.formatted}
          />
        ) : (
          <div className="mt-1 flex w-full justify-center">
            <button
              onClick={() => login()}
              className="home-sign-in-btn theme-sky-readout flex items-center gap-2 px-6 py-2 transition-transform hover:scale-105 active:scale-95"
              type="button"
            >
              <span className="font-ui text-[10px] uppercase tracking-widest text-[var(--text)]">Sign In</span>
            </button>
          </div>
        )}
      </motion.div>

      <div className="relative flex w-full flex-1 flex-col items-center justify-center py-2">
        <div className="z-10 flex w-full flex-col">
          {hasPendingSearch && !isMatchmaking && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 w-full"
            >
              <motion.button
                type="button"
                onClick={onShowSearch}
                animate={{ boxShadow: ['0 0 0px rgba(245,158,11,0.0)', '0 0 16px rgba(245,158,11,0.4)', '0 0 0px rgba(245,158,11,0.0)'] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-full flex items-center justify-between gap-3 rounded-2xl border-2 border-[var(--orange)] bg-[var(--orange)]/15 px-4 py-4 transition-all hover:bg-[var(--orange)]/20 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <motion.span
                    className="text-lg"
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    ⏳
                  </motion.span>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-ui text-xs font-black uppercase tracking-widest text-[var(--orange)]">
                      Game in progress
                    </span>
                    <span className="font-body text-[10px] text-[var(--text-dim)]">
                      Waiting for opponent{pendingStake > 0 ? ` · ${pendingStake} USDT staked` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end leading-none">
                    <span className="font-ui text-[9px] font-bold uppercase tracking-widest text-[var(--orange)]/70">
                      Expires in
                    </span>
                    <span className="font-code text-sm font-black text-[var(--orange)]">
                      {pendingMinutes}:{pendingSeconds.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <span className="rounded-lg bg-[var(--orange)] px-3 py-1.5 font-ui text-[9px] font-black uppercase tracking-widest text-white">
                    View
                  </span>
                </div>
              </motion.button>
            </motion.div>
          )}

          {isMatchmaking ? (
            <div className="w-full">
              {opponentName === 'WAITING' ? (
                shareableJoinCode ? (
                  <InviteWaiting
                    searchTime={searchTime}
                    onCancel={onCancelMatchmaking}
                    joinCode={shareableJoinCode}
                    isCreating={isCreating}
                    onHide={onHideSearch}
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
                        className="w-full rounded-2xl border-2 border-[var(--border-mid)] bg-[var(--bg-elevated)] py-3 font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)] transition-all hover:border-red-400/50 hover:bg-red-500/15 hover:text-red-300 active:scale-[0.98]"
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
                  onHide={onHideSearch}
                />
              )}
            </div>
          ) : (
            <motion.div
              className="theme-play-zone arena-play-panel"
              variants={fadeUp}
              initial="initial"
              animate="animate"
            >
              <p className="arena-section-label">⚔️ Choose your mode</p>
              <motion.div variants={fadeUp} className="flex flex-col gap-4">
                <button
                  onClick={handleStartAI}
                  disabled={cipherButtonDisabled}
                  aria-busy={cipherStatusPending}
                  aria-label={
                    cipherAtDailyCap
                      ? 'Cipher AI daily limit reached. See you tomorrow.'
                      : cipherStatusPending
                        ? 'Checking Cipher daily limit'
                        : 'Play Cipher AI'
                  }
                  className={`theme-game-btn theme-game-btn--ai cipher-mode-btn group ${
                    hasPendingSearch
                      ? 'opacity-50 cursor-not-allowed'
                      : cipherAtDailyCap
                        ? 'cipher-mode-btn--locked'
                        : cipherStatusPending
                          ? 'cipher-mode-btn--pending'
                          : 'theme-game-btn--lively'
                  }`}
                >
                  <div className="theme-game-btn__inner">
                    <div className="cipher-mode-btn__icon-wrap">
                      <span className="theme-game-btn__emoji-badge" aria-hidden>🤖</span>
                      <span
                        className={`cipher-chances-badge${isSignedIn ? ' cipher-chances-badge--live' : ''}`}
                        aria-label={
                          isSignedIn && cipherStatusLoaded
                            ? `${cipherGamesRemaining} Cipher games left today`
                            : `${CIPHER_DAILY_WIN_CAP} Cipher games per day`
                        }
                      >
                        <span className="cipher-chances-badge__num">
                          {isSignedIn && cipherStatusLoaded ? cipherGamesRemaining : CIPHER_DAILY_WIN_CAP}
                        </span>
                        <span className="cipher-chances-badge__tag">
                          {isSignedIn && cipherStatusLoaded ? 'left' : 'games'}
                        </span>
                      </span>
                    </div>
                    <div className="theme-game-btn__content">
                      <div className="cipher-mode-btn__title-row">
                        <span className="theme-game-btn__title">Cipher AI</span>
                        {isSignedIn && cipherStatusLoaded && (
                          <div
                            className="cipher-daily-streak"
                            aria-label={`${cipherGamesToday} of ${CIPHER_DAILY_WIN_CAP} Cipher games today`}
                          >
                            <div className="cipher-daily-streak__slots" aria-hidden>
                              {Array.from({ length: CIPHER_DAILY_WIN_CAP }).map((_, i) => (
                                <span
                                  key={i}
                                  className={`cipher-daily-streak__slot${
                                    i < cipherGamesToday ? ' cipher-daily-streak__slot--filled' : ''
                                  }`}
                                  style={{ animationDelay: `${i * 0.12}s` }}
                                />
                              ))}
                            </div>
                            <span className="cipher-daily-streak__cap">{CIPHER_DAILY_WIN_CAP}/day</span>
                          </div>
                        )}
                        {cipherStatusPending && (
                          <span className="cipher-mode-btn__checking">Checking…</span>
                        )}
                      </div>
                      <span className="theme-game-btn__subtitle">
                        {hasPendingSearch ? '⏳ Finish or cancel current game first' : 'Crack the code to win'}
                      </span>
                      {/* Cipher USDT reward campaign ended
                      <span className="cipher-reward-hint">
                        {isSignedIn ? (
                          <>
                            Earn <span className="cipher-reward-hint__amount">0.1 USDT</span> when you beat Cipher
                          </>
                        ) : (
                          <>Sign in to earn 0.1 USDT on a win</>
                        )}
                      </span>
                      */}
                    </div>
                    <span className="theme-game-btn__go">
                      {cipherStatusPending ? '…' : 'PLAY'}
                    </span>
                  </div>

                  {cipherAtDailyCap && (
                    <div className="cipher-mode-btn__overlay" aria-hidden>
                      <Lock size={26} strokeWidth={2.5} />
                      <span className="cipher-mode-btn__overlay-text">See you tomorrow</span>
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={hasPendingSearch ? undefined : (canUseWallet ? openPvPModal : () => login())}
                  disabled={hasPendingSearch || isWalletConnecting}
                  className={`theme-game-btn theme-game-btn--pvp group ${
                    hasPendingSearch || isWalletConnecting
                      ? 'opacity-50 cursor-not-allowed'
                      : canUseWallet
                        ? 'theme-game-btn--lively'
                        : 'theme-game-btn--signin-required'
                  }`}
                  aria-disabled={!canUseWallet || hasPendingSearch || isWalletConnecting}
                >
                  <div className="theme-game-btn__inner">
                    <span className="theme-game-btn__emoji-badge" aria-hidden>⚔️</span>
                    <div className="theme-game-btn__content">
                      <span className="theme-game-btn__title">Vs Opponent</span>
                      <span className="theme-game-btn__subtitle">
                        {hasPendingSearch
                          ? '⏳ Finish or cancel current game first'
                          : isWalletConnecting
                            ? 'Connecting wallet…'
                            : canUseWallet
                              ? 'Public or invite-only match'
                              : '🔒 Sign in to duel'}
                      </span>
                    </div>
                    <span className="theme-game-btn__go">
                      {hasPendingSearch ? '⏳' : isWalletConnecting ? '…' : canUseWallet ? 'DUEL' : '🔒'}
                    </span>
                  </div>
                </button>
              </motion.div>

              {onJoinByGameId && onJoinGameIdInputChange && (
                <motion.div variants={fadeUp} className="mt-3 border-t border-[var(--border-mid)] pt-4">
                  <JoinChallenge
                    value={joinGameIdInput}
                    onChange={onJoinGameIdInputChange}
                    onJoin={onJoinByGameId}
                    isJoining={isJoining}
                    disabled={!canUseWallet || hasPendingSearch || isWalletConnecting}
                    onSignInRequired={
                      hasPendingSearch || isWalletConnecting ? undefined : () => login()
                    }
                    collapsible
                  />
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Cipher USDT reward campaign ended
      <AnimatePresence>
        {showCipherSignInModal && (
          <CipherSignInModal
            onSignIn={handleCipherSignIn}
            onContinueGuest={handleContinueGuest}
            onClose={handleContinueGuest}
          />
        )}
      </AnimatePresence>
      */}

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
                className="absolute right-4 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--border-mid)] bg-[var(--bg-elevated)] text-[var(--text-dim)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] hover:scale-105 active:scale-95 disabled:opacity-40"
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
                        className="theme-sky-readout group flex flex-col gap-2 p-5 text-left transition-all hover:translate-y-[-2px] active:translate-y-[1px]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-ui text-sm font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">Friendly match</span>
                          <span className="text-xl transition-transform group-hover:scale-110" aria-hidden>⚔️</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-body text-[11px] text-[var(--text-dim)]">Free match · climb the global ranking</p>
                          <span
                            className="shrink-0 text-lg font-black leading-none text-[var(--text-dim)] transition-colors group-hover:text-[var(--accent)]"
                            aria-hidden
                          >
                            &gt;
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartPvP('cash')}
                        className="theme-sky-readout group relative flex flex-col gap-2 p-5 text-left transition-all hover:translate-y-[-2px] active:translate-y-[1px]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-ui text-sm font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                            Professional
                          </span>
                          <span className="text-xl transition-transform group-hover:scale-110" aria-hidden>💰</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-body text-[11px] text-[var(--text-dim)]">
                            USDT stakes · winner takes 99%
                          </p>
                          <span
                            className="shrink-0 text-lg font-black leading-none text-[var(--text-dim)] transition-colors group-hover:text-[var(--accent)]"
                            aria-hidden
                          >
                            &gt;
                          </span>
                        </div>
                      </button>
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
                        <label className="font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Choose stake</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[0.2, 0.5, 1, 2, 5, 10].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setStake(String(amt))}
                              className={`relative rounded-2xl border-2 p-3 font-ui text-base font-bold transition-all ${
                                parseFloat(stake) === amt
                                  ? 'border-[var(--orange)] bg-[var(--orange)]/15 text-[var(--orange)] scale-[1.04]'
                                  : 'border-[var(--border-mid)] bg-[var(--bg-elevated)] text-[var(--text)] hover:border-[var(--orange)]/50'
                              }`}
                            >
                              {cashVisibility === true && stakesWithOpen.includes(amt) && (
                                <span
                                  className="absolute left-2 top-2 h-2 w-2 rounded-full bg-[var(--clue-green)] animate-pulse"
                                  aria-hidden
                                />
                              )}
                              {parseFloat(stake) === amt && (
                                <span className="absolute right-1.5 top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--orange)] text-white">
                                  <Check size={11} />
                                </span>
                              )}
                              {amt} <span className="text-[10px] font-normal text-[var(--text-dim)]">USDT</span>
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center justify-end px-1">
                          <span className={`font-body text-[10px] ${!canAffordStake && !usdtBalanceLoading ? 'text-red-600' : 'text-[var(--text-dim)]'}`}>
                            Available:{' '}
                            <span className={`font-bold ${!canAffordStake && !usdtBalanceLoading ? 'text-red-700' : 'text-[var(--text)]'}`}>
                              {usdtBalanceLoading ? '…' : `${usdtBalance.toFixed(2)} USDT`}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-[var(--clue-green)]/20 bg-[var(--clue-green-bg)] px-2.5 py-2 text-center">
                          <span className="font-ui text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Winner reward</span>
                          <span className="font-ui text-base font-bold leading-tight text-[var(--clue-green)]">
                            {((parseFloat(stake) || 0) * 2 * 0.99).toFixed(3)} <span className="text-[9px]">USDT</span>
                          </span>
                        </div>
                        <div className="theme-sky-readout flex flex-col gap-0.5 px-2.5 py-2 !shadow-none">
                          <span className="font-ui text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Platform fee</span>
                          <span className="font-ui text-base font-bold leading-tight text-[var(--text)]">
                            1.0 <span className="text-[9px]">%</span>
                          </span>
                        </div>
                      </div>

                      {!usdtBalanceLoading && !canAffordStake && selectedStakeAmount >= 0.1 && (
                        <div className="flex flex-col items-center gap-1 px-3 py-1 text-center">
                          <p className="font-body text-sm text-red-700">
                            Insufficient balance.
                          </p>
                          {isMiniPay && (
                            <button
                              type="button"
                              onClick={handleAddUsdt}
                              className="font-ui text-[11px] font-bold uppercase tracking-wide text-[var(--accent)] underline underline-offset-2"
                            >
                              Add USDT
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={() => (canJoinExisting ? setShowJoinCashModal(true) : setShowCashTxModal(true))}
                          disabled={
                            isApproving ||
                            isCreating ||
                            isJoiningPublic ||
                            selectedStakeAmount < 0.1 ||
                            usdtBalanceLoading ||
                            !canAffordStake ||
                            (canJoinExisting && !onJoinCashChallenge)
                          }
                          className="w-full rounded-2xl border-2 border-[var(--sky-shadow)] bg-gradient-to-b from-[var(--sky-top)] to-[var(--sky-deep)] py-4 font-ui text-sm font-bold uppercase tracking-wide text-white shadow-[0_4px_0_#0a5a87] transition-transform active:translate-y-1 active:shadow-[0_1px_0_#0a5a87] disabled:opacity-50"
                        >
                          {isApproving || isJoiningPublic
                            ? 'Processing…'
                            : canJoinExisting
                              ? `Join ${(parseFloat(stake) || 0).toFixed(1)} USDT challenge`
                              : `Open ${(parseFloat(stake) || 0).toFixed(1)} USDT challenge`}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPvpStep('visibility')}
                          className="mx-auto flex items-center justify-center gap-1.5 py-1 font-ui text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)] transition-colors hover:text-[var(--accent)]"
                        >
                          <ArrowLeft size={14} aria-hidden />
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
                        onClick={() => selectedMode === 'cash' ? (setCashVisibility(true), setPvpStep('config')) : handleFinalizeChallenge(true)}
                        disabled={isCreating}
                        className="theme-sky-readout group flex flex-col gap-2 p-5 text-left transition-all hover:translate-y-[-2px] disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-ui text-sm font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">Anyone can join</span>
                          <span className="text-xl transition-transform group-hover:scale-110" aria-hidden>🌍</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-body text-[11px] text-[var(--text-dim)]">Public queue · join an open stake or create your own</p>
                          <span
                            className="shrink-0 text-lg font-black leading-none text-[var(--text-dim)] transition-colors group-hover:text-[var(--accent)]"
                            aria-hidden
                          >
                            &gt;
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => selectedMode === 'cash' ? (setCashVisibility(false), setPvpStep('config')) : handleFinalizeChallenge(false)}
                        disabled={isCreating}
                        className="theme-sky-readout group flex flex-col gap-2 border-[var(--accent)]/30 bg-[var(--accent-dim)] p-5 text-left transition-all hover:translate-y-[-2px] disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-ui text-sm font-bold text-[var(--accent)]">Invite only</span>
                          <span className="text-xl transition-transform group-hover:scale-110" aria-hidden>🔐</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-body text-[11px] text-[var(--text-dim)]">Private challenge · share a Game ID with a friend</p>
                          <span
                            className="shrink-0 text-lg font-black leading-none text-[var(--text-dim)] transition-colors group-hover:text-[var(--accent)]"
                            aria-hidden
                          >
                            &gt;
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPvpStep('selection')}
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
      <AnimatePresence>
        {showJoinCashModal && joinTarget && (
          <motion.div
            className="fixed inset-0 z-[140] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
              onClick={() => !isApproving && !isJoiningPublic && setShowJoinCashModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="relative z-10 w-full max-w-[420px] rounded-3xl border-2 border-[var(--border-mid)] bg-[var(--bg-surface)] p-5 shadow-xl"
            >
              <h3 className="font-ui text-base font-black uppercase tracking-wide text-[var(--accent)]">
                Ready to join?
              </h3>
              <p className="mt-2 font-body text-sm text-[var(--text-dim)]">
                You are joining a <strong>{joinTarget.stake.toFixed(1)} USDT</strong> public challenge.
              </p>
              <p className="mt-2 font-body text-sm text-[var(--text-dim)]">
                When you proceed, you&apos;ll be asked to sign <strong>2 transactions</strong>:
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 font-body text-sm text-[var(--text)]">
                <li>Approve USDT for the match</li>
                <li>Join the challenge on-chain</li>
              </ol>
              <ul className="mt-3 space-y-2.5 font-body text-sm text-[var(--text-dim)]">
                <li>• If you quit during the match, your opponent wins and you lose your stake.</li>
                <li>• In case of a draw, your stake is automatically refunded.</li>
              </ul>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowJoinCashModal(false)}
                  disabled={isApproving || isJoiningPublic}
                  className="flex-1 rounded-xl border-2 border-[var(--border-mid)] bg-[var(--bg-elevated)] py-2.5 font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)] disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedJoinCash}
                  disabled={isApproving || isJoiningPublic || usdtBalanceLoading || !canAffordStake}
                  className="flex-1 rounded-xl border-2 border-[var(--sky-shadow)] bg-gradient-to-b from-[var(--sky-top)] to-[var(--sky-deep)] py-2.5 font-ui text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-60"
                >
                  {isApproving
                    ? 'Waiting for approval…'
                    : isJoiningPublic
                      ? 'Joining…'
                      : 'Proceed'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCashTxModal && (
          <motion.div
            className="fixed inset-0 z-[140] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
              onClick={() => !isApproving && !isCreating && setShowCashTxModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="relative z-10 w-full max-w-[420px] rounded-3xl border-2 border-[var(--border-mid)] bg-[var(--bg-surface)] p-5 shadow-xl"
            >
              <h3 className="font-ui text-base font-black uppercase tracking-wide text-[var(--accent)]">
                Ready to start?
              </h3>
              <p className="mt-2 font-body text-sm text-[var(--text-dim)]">
                When you proceed, you&apos;ll be asked to sign <strong>2 transactions</strong>:
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 font-body text-sm text-[var(--text)]">
                <li>Approve USDT for the match</li>
                <li>Create your challenge on-chain</li>
              </ol>
              <p className="mt-3 font-body text-sm text-[var(--text-dim)]">
                Once created, your challenge will remain open for <strong>5 minutes</strong> for another player to join.
              </p>
              <ul className="mt-3 space-y-2.5 font-body text-sm text-[var(--text-dim)]">
                <li>• If no one joins, your stake is automatically refunded.</li>
                <li>• If you quit during the match, your opponent wins and you lose your stake.</li>
                <li>• In case of a draw, your stake is automatically refunded.</li>
              </ul>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCashTxModal(false)}
                  disabled={isApproving || isCreating}
                  className="flex-1 rounded-xl border-2 border-[var(--border-mid)] bg-[var(--bg-elevated)] py-2.5 font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)] disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedCashChallenge}
                  disabled={isApproving || isCreating || usdtBalanceLoading || !canAffordStake}
                  className="flex-1 rounded-xl border-2 border-[var(--sky-shadow)] bg-gradient-to-b from-[var(--sky-top)] to-[var(--sky-deep)] py-2.5 font-ui text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-60"
                >
                  {isApproving
                    ? 'Waiting for approval…'
                    : isCreating
                      ? 'Creating challenge…'
                      : 'Proceed'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Radar matchmaking animation ────────────────────────────────────────────

function MatchmakingPulse({
  opponentName,
  mode,
  searchTime = 0,
  onCancel,
  isCancelling = false,
  onHide,
}: {
  opponentName: string,
  mode: GameMode,
  searchTime?: number,
  onCancel?: () => void,
  isCancelling?: boolean,
  onHide?: () => void,
}) {
  const isAI = mode === 'ai';
  const timeLeft = Math.max(0, 300 - searchTime);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex flex-col items-center gap-8 py-6">
      {/* Radar animation */}
      <div className="relative flex h-32 w-32 items-center justify-center">
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border-2"
            style={{ borderColor: isAI ? 'var(--clue-yellow)' : 'var(--accent)' }}
            initial={{ width: 28, height: 28, opacity: 0.7 }}
            animate={{ width: 128, height: 128, opacity: 0 }}
            transition={{ duration: 2, delay: ring * 0.6, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
        <div
          className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: isAI ? 'rgba(245,158,11,0.1)' : 'var(--accent-dim)',
            border: `2px solid ${isAI ? 'var(--clue-yellow)' : 'var(--accent)'}`,
            boxShadow: `0 0 24px ${isAI ? 'rgba(245,158,11,0.3)' : 'var(--accent-glow)'}`,
          }}
        >
          <span className="text-2xl">{isAI ? '🤖' : '⚔️'}</span>
        </div>
      </div>

      {/* Status text + countdown */}
      <div className="flex flex-col items-center gap-3 text-center">
        <h3 className="font-orbitron text-base font-black tracking-widest uppercase" style={{ color: isAI ? 'var(--clue-yellow)' : 'var(--accent)' }}>
          {isAI ? 'Initializing AI' : 'Finding Opponent'}
        </h3>

        <motion.p
          className="font-body text-xs text-[var(--text-dim)]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          {isAI ? 'Booting logical engine…' : 'Scanning for challengers…'}
        </motion.p>

        {!isAI && (
          <div className="mt-2 flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 rounded-2xl border-2 border-[var(--orange)]/30 bg-[var(--orange)]/10 px-6 py-3">
              <span className="font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--orange)]/70">Expires in</span>
              <span className="font-code text-xl font-black text-[var(--orange)]">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!isAI && (
        <div className="flex w-full max-w-[280px] flex-col gap-2">
          {onHide && (
            <button
              type="button"
              onClick={onHide}
              className="w-full rounded-2xl border-2 border-[var(--border-mid)] bg-[var(--bg-elevated)] py-3.5 font-ui text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] transition-all hover:bg-[var(--bg-elevated)]/80 active:scale-[0.98]"
            >
              Hide & Browse
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            disabled={isCancelling || !onCancel}
            className="w-full rounded-2xl border-2 border-red-500/20 bg-red-500/5 py-3.5 font-ui text-[10px] font-black uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/15 active:scale-[0.98] disabled:opacity-50"
          >
            {isCancelling ? 'Cancelling…' : 'Cancel Search'}
          </button>
        </div>
      )}
    </div>
  );
}

function InviteWaiting({
  searchTime,
  onCancel,
  joinCode,
  isCreating,
  onHide,
}: {
  searchTime: number,
  onCancel?: () => void,
  joinCode: string,
  isCreating?: boolean,
  onHide?: () => void,
}) {
  const [copied, setCopied] = useState(false);
  const timeLeft = Math.max(0, 300 - searchTime); // 5 minutes
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

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
        <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--orange)]/30 bg-[var(--orange)]/10 px-4 py-2">
          <span className="font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--orange)]/70">
            Expires in
          </span>
          <span className="font-code text-[20px] font-black tracking-[0.01em] text-[var(--orange)]">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        </div>
        <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest max-w-[240px]">
          Share this Game ID. Friends paste it under Join Challenge on Home.
        </p>
      </div>

      <div className="flex w-full max-w-[300px] flex-col gap-3">
        <div
          onClick={handleCopy}
          className="theme-invite-code relative flex cursor-pointer flex-col gap-2 overflow-hidden rounded-2xl p-4 transition-all"
        >
          <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-dim)]">Game ID</span>
          <div className="flex items-center justify-between gap-2">
            <span className="font-code text-lg font-black tracking-[0.25em] text-[var(--accent)]">{joinCode}</span>
            <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">
              {copied ? 'COPIED' : 'COPY'}
            </span>
          </div>
        </div>

        <FarcasterShareGameButton joinCode={joinCode} />

        <div className="flex gap-2">
          {onHide && (
            <button
              type="button"
              onClick={onHide}
              className="flex-1 rounded-2xl border border-[var(--border-mid)] bg-[var(--bg-elevated)] py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] transition-all hover:bg-[var(--bg-elevated)]/80"
            >
              HIDE
            </button>
          )}
          <button
            onClick={onCancel}
            disabled={isCreating}
            className="flex-1 rounded-2xl border border-red-500/30 bg-red-500/10 py-4 text-[10px] font-black uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
          >
            {isCreating ? 'CANCELLING...' : 'CANCEL INVITE'}
          </button>
        </div>
      </div>
    </div>
  );
}
