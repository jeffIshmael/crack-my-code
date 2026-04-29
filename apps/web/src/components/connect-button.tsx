"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";

export function ConnectButton() {
  const { login, logout, authenticated } = usePrivy();
  const { isConnected, address } = useAccount();
  const [isMiniApp, setIsMiniApp] = useState(false);

  useEffect(() => {
    const isMiniPay = (window as any).ethereum?.isMiniPay;
    const isFarcaster = (window as any).ethereum?.isFarcaster || (window as any).farcaster;
    if (isMiniPay || isFarcaster) {
      setIsMiniApp(true);
    }
  }, []);

  if (isMiniApp) {
    return null;
  }

  if (authenticated || isConnected) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => logout()}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black tracking-widest text-[var(--accent)] hover:bg-white/10 transition-colors"
        >
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "DISCONNECT"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => login()}
      className="rounded-full bg-gradient-to-r from-[var(--accent)] to-[#00A3FF] px-6 py-2.5 text-[10px] font-black tracking-widest text-[#030C15] hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,207,255,0.2)]"
    >
      SIGN IN
    </button>
  );
}
