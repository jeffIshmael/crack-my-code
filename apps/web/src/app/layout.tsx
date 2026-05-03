import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { Navbar } from '@/components/navbar';
import { WalletProvider } from "@/components/wallet-provider"
import { FarcasterProvider } from '@/components/farcaster-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Crack-My-Code',
  description: 'Crack the code first to win.', 
};

import { Toaster } from '@/components/ui/toaster';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="talentapp:project_verification" content="9af4936c363200c2c29e3c154ef6fcb3e0f0cc120f9ebe5f2972226558494b0063366b4864d11d567957a6127b28ccc2f3def949a27b20a84ef62becd4d884ba" />
        <meta name="fc:miniapp" content='{"version":"1","imageUrl":"https://crack-my-code.vercel.app/logo.png","button":{"title":"Play Now","action":{"type":"launch_miniapp","name":"Crack-My-Code","url":"https://crack-my-code.vercel.app","splashImageUrl":"https://crack-my-code.vercel.app/logo.png","splashBackgroundColor":"#03111C"}}}' />
      </head>
      <body className={`${inter.className} grid-bg noise-overlay min-h-dvh antialiased`}>
        {/* Navbar is included on all pages */}
        <div className="relative flex min-h-screen flex-col">
          <FarcasterProvider>
            <WalletProvider>
              {/* <Navbar /> */}
              <main className="flex-1">
                {children}
              </main>
              <Toaster position="top-center" expand={false} richColors />
            </WalletProvider>
          </FarcasterProvider>
        </div>
      </body>
    </html>
  );
}
