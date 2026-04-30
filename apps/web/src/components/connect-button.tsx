"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useBalance } from "wagmi";
import { useEffect, useState, useCallback } from "react";
import { Wallet } from "lucide-react";
import { USDT_ADDRESS } from "../../blockchain/constants";

interface ConnectButtonProps {
  onWalletClick?: () => void;
}

export function ConnectButton({ onWalletClick }: ConnectButtonProps) {
  const { login, authenticated, user } = usePrivy();
  const { isConnected, address: wagmiAddress } = useAccount();
  const address = wagmiAddress || user?.wallet?.address;
  const [points, setPoints] = useState<number | null>(null);

  const { data: usdtData } = useBalance({
    address: address as `0x${string}` | undefined,
    token: USDT_ADDRESS as `0x${string}`,
  });

  const fetchPoints = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      const data = await res.json();
      if (data.points !== undefined) {
        setPoints(data.points);
      }
    } catch (err) {
      console.error('Points fetch failed', err);
    }
  }, [address]);

  useEffect(() => {
    if (authenticated && address) {
      fetchPoints();
    }
  }, [authenticated, address, fetchPoints]);

  if (!authenticated && !isConnected) {
    return (
      <div className="flex w-full justify-end">
        <button
          onClick={() => login()}
          className="rounded-full bg-gradient-to-r from-[var(--accent)] to-[#00A3FF] px-6 py-2.5 text-[10px] font-black tracking-widest text-[#030C15] hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,207,255,0.2)]"
        >
          SIGN IN
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-between">
      {/* CMC Points (Left Side) */}
      <div className="flex items-center gap-1.5 rounded-full border border-[var(--clue-yellow)]/20 bg-[var(--clue-yellow)]/5 px-4 py-2 transition-colors">
        <span className="font-orbitron text-[10px] font-black tracking-widest text-[var(--clue-yellow)]">
          {points !== null ? points : '...'} <span className="text-[8px] opacity-70">CMC</span>
        </span>
      </div>

      {/* USDT Balance (Right Side) */}
      <div 
        onClick={onWalletClick}
        className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 cursor-pointer transition-colors hover:bg-white/10 group"
      >
         <span className="text-[10px] font-black tracking-widest text-[var(--accent)]">
            {usdtData ? `${parseFloat(usdtData.formatted).toFixed(2)}` : '...'} <span className="text-[8px] opacity-70 text-white">USDT</span>
         </span>
         {/* Wallet Icon */}
         <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] transition-transform group-hover:scale-110">
           <Wallet size={12} />
         </div>
      </div>
    </div>
  );
}
