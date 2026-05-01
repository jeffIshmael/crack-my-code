'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { ConnectButton } from "@/components/connect-button";
import type { GameMode } from '@/lib/game';
import { pusherClient } from '@/lib/pusher-client';
import { parseUnits } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI, USDT_ADDRESS, ERC20_ABI } from '../../blockchain/constants';
import Image from 'next/image';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { ShieldCheck } from 'lucide-react';

interface LobbyProps {
  rating: number;
  points: number;
  isMatchmaking: boolean;
  opponentName: string;
  onFindMatch: (mode: GameMode, stake: number, isPublic?: boolean) => Promise<void>;
  onMatchFound: (gameId: string, opponentAddress: string) => void;
  onWalletClick?: () => void;
  searchTime?: number;
  onCancelMatchmaking?: () => void;
  gameId?: string;
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
  isMatchmaking, 
  opponentName, 
  onFindMatch, 
  onMatchFound, 
  onWalletClick, 
  searchTime = 0, 
  onCancelMatchmaking,
  gameId
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

  // 3. Subscribe to User-specific Match Found events
  useEffect(() => {
    if (!address) return;
    const channel = pusherClient.subscribe(`private-user-${address}`);

    channel.bind('match-found', (data: any) => {
      onMatchFound(data.gameId, data.opponentAddress);
    });

    return () => {
      pusherClient.unsubscribe(`private-user-${address}`);
    };
  }, [address, onMatchFound]);

  const handleStartPvP = (mode: GameMode) => {
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
      await onFindMatch(selectedMode, stakeAmount, isPublic);
      setShowPvPModal(false);
      setPvpStep('selection'); // Reset for next time
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
    <div className="flex min-h-dvh flex-col items-center justify-start gap-12 px-5 pt-20 pb-40 text-[var(--text)]">

      {/* ── Top status bar ── */}
      <motion.div
        className="absolute top-8 left-0 right-0 px-8 flex items-center z-20"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <ConnectButton onWalletClick={onWalletClick} />
      </motion.div>

      {/* ── Hero / Logo ── */}
      <motion.div className="flex flex-col items-center gap-10 text-center" variants={stagger} initial="initial" animate="animate">
        {/* Glyph icon */}
        <div className="relative group">
          <div className="absolute inset-0 bg-[var(--accent)]/20 blur-3xl rounded-full scale-150 opacity-40 group-hover:opacity-70 transition-opacity" />
          <Image 
            src='/logo.png' 
            alt='logo' 
            width={180} 
            height={180} 
            className='rounded-full relative z-10 border-4 border-white/5 shadow-2xl transition-transform group-hover:scale-105' 
          />
        </div>
        {/* Primary CTA Buttons */}
        <motion.div variants={fadeUp} className="flex w-full max-w-sm flex-col gap-10 pt-16">
          {isMatchmaking ? (
            opponentName === 'WAITING' ? (
              gameId ? (
                <InviteWaiting 
                  searchTime={searchTime}
                  onCancel={onCancelMatchmaking}
                  gameId={gameId} 
                  isCreating={isCreating}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full border-2 border-[var(--accent)]/20" />
                    <div className="absolute inset-0 rounded-full border-t-2 border-[var(--accent)] animate-spin" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-orbitron text-[10px] font-black tracking-[0.2em] text-[var(--accent)]">GENERATING LINK</span>
                    <span className="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Encrypting match parameters...</span>
                  </div>
                </div>
              )
            ) : (
              <MatchmakingPulse 
                opponentName={opponentName} 
                mode={selectedMode} 
                searchTime={searchTime}
                onCancel={onCancelMatchmaking}
              />
            )
          ) : (
            <>
              <button
                onClick={handleStartAI}
                disabled={isCreating}
                className="group relative flex items-center justify-between rounded-[2.5rem] bg-[var(--bg-elevated)] p-10 transition-all hover:scale-[1.02] border border-white/10 active:scale-[0.98] shadow-2xl disabled:opacity-50"
              >
                <div className="flex flex-col gap-2 text-left">
                  <span className="font-orbitron text-base font-black tracking-[0.25em] text-[var(--text)]">
                    {isCreating && selectedMode === 'ai' ? 'STARTING...' : 'PLAY WITH AI'}
                  </span>
                  <span className="text-xs font-bold text-white/50 uppercase tracking-[0.15em]">Sharpen your strategy</span>
                </div>
                <div className="text-5xl opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">🤖</div>
              </button>

              <button
                onClick={isConnected ? openPvPModal : undefined}
                className={`group relative flex items-center justify-between rounded-[2.5rem] border p-10 transition-all ${
                  isConnected 
                    ? "border-[var(--accent)] bg-[var(--accent)]/5 hover:scale-[1.02] active:scale-[0.98]" 
                    : "border-white/10 bg-white/5 opacity-80 cursor-not-allowed"
                }`}
                style={isConnected ? { boxShadow: '0 0 40px rgba(0,207,255,0.15)' } : {}}
              >
                <div className="flex flex-col gap-2 text-left">
                  <span className={`font-orbitron text-base font-black tracking-[0.25em] ${isConnected ? "text-[var(--accent)]" : "text-[var(--text-dim)]"}`}>
                    {isConnected ? "PVP DUEL" : "CONNECT WALLET"}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-[0.15em]">
                    {isConnected ? "Challenge players" : "Required for PVP"}
                  </span>
                </div>
                <div className={`text-5xl transition-all duration-300 ${isConnected ? "filter saturate-0 group-hover:saturate-100 group-hover:scale-110" : "opacity-20"}`}>
                  ⚔️
                </div>

                {/* Subtle scanline animation */}
                {isConnected && (
                  <motion.div
                    className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-[var(--accent)]/10 to-transparent shadow-inner opacity-30"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </button>
            </>
          )}

        </motion.div>
      </motion.div>

      <div className="h-2" />

      {/* ── Incoming Invite Modal ── */}
      <AnimatePresence>
        {!isMatchmaking && gameId && !isCreating && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#030C15]/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm rounded-[2.5rem] border border-[var(--accent)]/30 bg-[#0A121A] p-8 shadow-[0_0_50px_rgba(0,207,255,0.2)]"
            >
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="relative">
                  <div className="absolute inset-0 animate-pulse bg-[var(--accent)]/20 blur-2xl rounded-full" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
                    <ShieldCheck size={32} />
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <h2 className="font-orbitron text-xl font-black tracking-widest text-white uppercase">Duel Invitation</h2>
                  <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">
                    You have been summoned to a private codebreaking match.
                  </p>
                </div>

                {!isConnected ? (
                  <button
                    onClick={() => login()}
                    className="w-full rounded-2xl bg-[var(--accent)] py-4 text-[10px] font-black uppercase tracking-widest text-[#030C15] transition-transform active:scale-95 shadow-[0_0_20px_rgba(0,207,255,0.3)]"
                  >
                    SIGN IN TO ACCEPT
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-ping" />
                      <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.2em]">Authenticating...</span>
                    </div>
                    <span className="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Initializing secure connection</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PvP Mode Selection Bottom Sheet ── */}
      <AnimatePresence>
        {showPvPModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#030C15]/80 backdrop-blur-md"
              onClick={() => setShowPvPModal(false)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative w-full max-w-sm rounded-t-[2.5rem] border-t border-x border-white/10 bg-[#03111C] p-8 shadow-[0_-12px_40px_rgba(0,0,0,0.5)]"
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
                        className="group flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/5 p-5 text-left transition-all hover:bg-white/[0.08]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-orbitron text-sm font-black tracking-wider text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">FRIENDLY</span>
                          <span className="text-xl">⚔️</span>
                        </div>
                        <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Free Match • Play for Global Ranking</p>
                      </button>

                      {/* Paid Option */}
                      <button
                        onClick={() => handleStartPvP('cash')}
                        className="group flex flex-col gap-2 rounded-2xl border border-[var(--orange)]/30 bg-[var(--orange)]/5 p-5 text-left transition-all hover:bg-[var(--orange)]/10"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-orbitron text-sm font-black tracking-wider text-[var(--orange)]">PROFESSIONAL</span>
                          <span className="text-xl">💰</span>
                        </div>
                        <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Stake USDT • Winner Takes 99%</p>
                      </button>
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
                              className="w-full flex-1 rounded-2xl border border-white/10 bg-white/5 p-5 text-2xl font-black text-[var(--orange)] outline-none ring-[var(--orange)] focus:ring-1"
                              autoFocus
                              placeholder="0.00"
                            />
                            <span className="absolute right-5 text-lg font-black text-[var(--text-dim)] mr-6">USDT</span>
                          </div>
                          <div className="flex items-center justify-between px-2">
                            <span className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">Min: 0.1 USDT</span>
                            <span className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                              Available: <span className="text-[var(--text)]">{usdtData ? `${parseFloat(usdtData.formatted).toFixed(2)} USDT` : '...'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 rounded-2xl bg-[var(--clue-green)]/5 p-4 border border-[var(--clue-green)]/10">
                          <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-dim)]">Net Reward</span>
                          <span className="text-xl font-black text-[var(--clue-green)] tracking-tight">
                            {(parseFloat(stake) * 2 * 0.99).toFixed(1)} <span className="text-[10px]">USDT</span>
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
                          disabled={isApproving || isCreating}
                          className="w-full rounded-2xl bg-[var(--orange)] py-4 text-[10px] font-black uppercase tracking-widest text-[#030C15] shadow-[0_0_20px_rgba(255,107,43,0.2)] disabled:opacity-50"
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
                        className="group flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/5 p-5 text-left transition-all hover:bg-white/[0.08] disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-orbitron text-sm font-black tracking-wider text-white">ANYONE CAN JOIN</span>
                          <span className="text-xl">🌍</span>
                        </div>
                        <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Public challenge • Visible on Global Board</p>
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
                        <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Private challenge • Generate secret link</p>
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
  gameId,
  isCreating
}: { 
  searchTime: number, 
  onCancel?: () => void,
  gameId: string,
  isCreating?: boolean
}) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/?invite=${gameId}` : '';
  const timeLeft = Math.max(0, 300 - searchTime); // 5 minutes

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link Copied!");
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
        <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest max-w-[200px]">
          Share the link below. The match will expire in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}.
        </p>
      </div>

      <div className="flex w-full max-w-[300px] flex-col gap-3">
        <div 
          onClick={handleCopy}
          className="relative flex cursor-pointer items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10"
        >
          <span className="truncate pr-4 text-[10px] font-bold text-[var(--text-dim)]">{inviteUrl}</span>
          <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">
            {copied ? 'COPIED' : 'COPY'}
          </span>
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
