'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@/components/connect-button";
import type { GameMode } from '@/lib/game';
import { pusherClient } from '@/lib/pusher-client';
import { parseUnits } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI, USDT_ADDRESS, ERC20_ABI } from '../../blockchain/constants';

interface LobbyProps {
  rating: number;
  isMatchmaking: boolean;
  opponentName: string;
  onFindMatch: (mode: GameMode, stake: number) => void;
  onMatchFound: (gameId: string, opponentAddress: string) => void;
}

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function Lobby({ rating, isMatchmaking, opponentName, onFindMatch, onMatchFound }: LobbyProps) {
  const { isConnected, address } = useAccount();
  const { data: usdtData } = useBalance({
    address,
    token: USDT_ADDRESS as `0x${string}`,
  });

  const [showPvPModal, setShowPvPModal] = useState(false);
  const [pvpStep, setPvpStep] = useState<'selection' | 'config'>('selection');
  const [selectedMode, setSelectedMode] = useState<GameMode>('fun');
  const [stake, setStake] = useState<string>('5');

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
    approve({
      address: USDT_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESS, amount],
    });
  };

  const stakeBigInt = useMemo(() => {
    try {
      return parseUnits(stake || '0', 6);
    } catch {
      return BigInt(0);
    }
  }, [stake]);

  const needsApproval = useMemo(() => {
    if (selectedMode !== 'cash') return false;
    return allowance < stakeBigInt;
  }, [selectedMode, allowance, stakeBigInt]);
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
    setShowPvPModal(false);
    setPvpStep('selection'); // Reset for next time
    onFindMatch(mode, mode === 'cash' ? parseFloat(stake) || 0 : 0);
  };

  const handleStartAI = () => {
    setSelectedMode('ai');
    onFindMatch('ai', 0);
  };

  const openPvPModal = () => {
    setPvpStep('selection');
    setShowPvPModal(true);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-between px-5 pt-16 pb-24 text-[var(--text)]">

      {/* ── Top status bar ── */}
      <motion.div
        className="flex w-full max-w-sm items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-full border border-[var(--clue-yellow)]/20 bg-[var(--clue-yellow)]/5 px-3 py-1.5">
            <span className="font-orbitron text-xs font-black tracking-widest text-[var(--clue-yellow)]">
              {rating} <span className="text-[10px] opacity-70">CMC</span>
            </span>
          </div>
        </div>
        {isConnected ? (
          <div className="flex items-center gap-2">
            {/* <div className="flex items-center gap-1.5 mr-2">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: 'var(--clue-green)', boxShadow: '0 0 6px var(--clue-green)' }}
                />
                <span className="text-[8px] font-black uppercase tracking-tighter text-[var(--text-dim)]">Celo Mainnet</span>
             </div> */}
            <div
              className="rounded-full px-3 py-1.5 text-[10px] font-black tracking-widest border border-white/10 bg-white/5"
              style={{ color: 'var(--accent)' }}
            >
              {usdtData ? `${parseFloat(usdtData.formatted).toFixed(2)} USDT` : '...'}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* <div className="flex flex-col items-end gap-0.5 mr-1">
               <span className="text-[8px] font-black uppercase tracking-wider text-[var(--accent)]">Training Mode</span>
               <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-dim)]">0 CMC</span>
             </div> */}
            <ConnectButton />
          </div>
        )}
      </motion.div>

      {/* ── Hero / Logo ── */}
      <motion.div className="flex flex-col items-center gap-8 text-center" variants={stagger} initial="initial" animate="animate">
        {/* Glyph icon */}
        <motion.div variants={fadeUp} className="relative">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-[2.5rem]"
            style={{
              background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-card) 100%)',
              border: '2px solid var(--border-bright)',
              boxShadow: '0 0 40px rgba(0,207,255,0.2)',
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              {['var(--clue-green)', 'var(--clue-yellow)', 'var(--clue-yellow)', 'var(--clue-gray)'].map((dot, i) => (
                <motion.div
                  key={i}
                  className="h-4 w-4 rounded-full shadow-lg"
                  style={{ background: dot, boxShadow: `0 0 8px ${dot}` }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div variants={fadeUp} className="flex flex-col items-center gap-2">
          <h1 className="font-orbitron logo-shimmer text-4xl font-black tracking-tight">Crack-my-code</h1>
          {/* <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent)] drop-shadow-[0_0_8px_rgba(0,207,255,0.4)]">
            Decentralized Logic Duels
          </p> */}
        </motion.div>

        {/* Primary CTA Buttons */}
        <motion.div variants={fadeUp} className="flex w-full max-w-xs flex-col gap-5 pt-8">
          {isMatchmaking ? (
            <MatchmakingPulse opponentName={opponentName} mode={selectedMode} />
          ) : (
            <>
              <button
                onClick={handleStartAI}
                className="group relative flex items-center justify-between rounded-[1.75rem] bg-[var(--bg-elevated)] p-6 transition-all hover:scale-[1.02] border border-white/5 active:scale-[0.98]"
              >
                <div className="flex flex-col gap-1 text-left">
                  <span className="font-orbitron text-xs font-black tracking-[0.2em] text-[var(--text)]">TRAIN WITH AI</span>
                  <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Master your logic</span>
                </div>
                <div className="text-3xl opacity-40 group-hover:opacity-100 transition-opacity">🤖</div>
              </button>

              <button
                onClick={openPvPModal}
                className="group relative flex items-center justify-between rounded-[1.75rem] border border-[var(--accent)] bg-[var(--accent)]/5 p-6 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ boxShadow: '0 0 30px rgba(0,207,255,0.1)' }}
              >
                <div className="flex flex-col gap-1 text-left">
                  <span className="font-orbitron text-xs font-black tracking-[0.2em] text-[var(--accent)]">PVP DUEL</span>
                  <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Challenge players</span>
                </div>
                <div className="text-3xl filter saturate-0 group-hover:saturate-100 transition-all">⚔️</div>

                {/* Subtle scanline animation */}
                <motion.div
                  className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-[var(--accent)]/5 to-transparent shadow-inner"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                />
              </button>
            </>
          )}
        </motion.div>
      </motion.div>

      <div className="h-2" />

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
                {pvpStep === 'selection' ? (
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
                        onClick={() => { setSelectedMode('cash'); setPvpStep('config'); }}
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
                ) : (
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
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            value={stake}
                            onChange={(e) => setStake(e.target.value)}
                            className="w-full flex-1 rounded-2xl border border-white/10 bg-white/5 p-5 text-2xl font-black text-[var(--orange)] outline-none ring-[var(--orange)] focus:ring-1"
                            autoFocus
                          />
                          <span className="absolute right-5 text-lg font-black text-[var(--text-dim)]">USDT</span>
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

                      <div className="flex gap-3">
                        <button
                          onClick={() => setPvpStep('selection')}
                          className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-5 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-colors"
                        >
                          Back
                        </button>
                        {needsApproval ? (
                          <button
                            onClick={async () => {
                              await handleApprove(stakeBigInt);
                            }}
                            disabled={isApproving}
                            className="flex-[2] rounded-2xl bg-gradient-to-r from-[var(--orange)] to-[#FF8A00] py-5 font-orbitron font-black text-xs tracking-widest text-[#030C15] disabled:opacity-50"
                            style={{ boxShadow: '0 8px 25px rgba(255,138,0,0.3)' }}
                          >
                            {isApproving ? 'APPROVING...' : 'APPROVE USDT'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartPvP('cash')}
                            className="flex-[2] rounded-2xl bg-gradient-to-r from-[var(--orange)] to-[#FF8A00] py-5 font-orbitron font-black text-xs tracking-widest text-[#030C15]"
                            style={{ boxShadow: '0 8px 25px rgba(255,138,0,0.3)' }}
                          >
                            SEARCH OPPONENT
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Close Spacer */}
              <div className="h-6" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Radar matchmaking animation ────────────────────────────────────────────

function MatchmakingPulse({ opponentName, mode }: { opponentName: string, mode: GameMode }) {
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
