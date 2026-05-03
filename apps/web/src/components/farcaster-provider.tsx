"use client";

import { useEffect, useState } from "react";
import sdk from "@farcaster/miniapp-sdk";

export function FarcasterProvider({ children }: { children: React.ReactNode }) {
  const [isSdkReady, setIsSdkReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        console.log("Initializing Farcaster SDK...");
        await sdk.actions.ready();
        setIsSdkReady(true);
        console.log("Farcaster SDK ready.");
      } catch (error) {
        console.error("Failed to initialize Farcaster SDK:", error);
        // We still set ready true to allow the app to show even if SDK fails 
        // (e.g. when running outside of Farcaster)
        setIsSdkReady(true);
      }
    };

    init();
  }, []);

  return <>{children}</>;
}
