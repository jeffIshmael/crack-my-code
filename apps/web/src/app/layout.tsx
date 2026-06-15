import type { Metadata } from 'next';
import './globals.css';

import { WalletProvider } from '@/components/wallet-provider';
import { FarcasterProvider } from '@/components/farcaster-provider';
import { ThemeBackground } from '@/components/ThemeBackground';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Crack-My-Code',
  description: 'Crack the code first to win.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="talentapp:project_verification" content="9af4936c363200c2c29e3c154ef6fcb3e0f0cc120f9ebe5f2972226558494b0063366b4864d11d567957a6127b28ccc2f3def949a27b20a84ef62becd4d884ba" />
        <meta name="fc:miniapp" content='{"version":"1","imageUrl":"https://crack-my-code.vercel.app/logo.png","button":{"title":"Play Now","action":{"type":"launch_miniapp","name":"Crack-My-Code","url":"https://crack-my-code.vercel.app","splashImageUrl":"https://crack-my-code.vercel.app/logo.png","splashBackgroundColor":"#E3F2FA"}}}' />
      </head>
      <body className="h-dvh antialiased flex flex-col items-center justify-start overflow-hidden">
        <div className="theme-shell relative w-full max-w-[440px] shadow-[var(--shell-shadow)]">
          <div className="theme-shell__effects">
            <ThemeBackground />
          </div>
          <div className="theme-shell__content">
            <FarcasterProvider>
              <WalletProvider>
                <main className="flex flex-1 flex-col min-h-0 overflow-hidden">
                  {children}
                </main>
                <Toaster position="top-center" expand={false} richColors />
              </WalletProvider>
            </FarcasterProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
