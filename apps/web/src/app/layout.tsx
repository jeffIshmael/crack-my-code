import type { Metadata, Viewport } from 'next';
import { Fredoka, Nunito } from 'next/font/google';
import './globals.css';

import { WalletProvider } from '@/components/wallet-provider';
import { FarcasterProvider } from '@/components/farcaster-provider';
import { FarcasterMiniAppProvider } from '@/components/farcaster-miniapp-provider';
import { ThemeBackground } from '@/components/ThemeBackground';
import { Toaster } from '@/components/ui/toaster';
import { buildFcEmbedMetadata } from '@/lib/farcaster-embed';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-fredoka',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
  variable: '--font-nunito',
});

export const metadata: Metadata = {
  title: 'Crack-My-Code',
  description: 'Crack the code first to win.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  other: {
    'talentapp:project_verification':
      '9af4936c363200c2c29e3c154ef6fcb3e0f0cc120f9ebe5f2972226558494b0063366b4864d11d567957a6127b28ccc2f3def949a27b20a84ef62becd4d884ba',
    ...buildFcEmbedMetadata(),
  },
};

/** Keep soft keyboard from resizing the layout (nav floating mid-screen on Android). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'overlays-content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function m(){try{window.__CMC_MINIPAY__=true;}catch(x){}}try{var e=window.ethereum;if(e&&e.isMiniPay){m();return;}}catch(x){}var n=0;var t=setInterval(function(){n++;try{if(window.ethereum&&window.ethereum.isMiniPay){m();clearInterval(t);}}catch(x){}if(n>=80)clearInterval(t);},50);})();`,
          }}
        />
      </head>
      <body className="h-dvh antialiased flex flex-col items-center justify-start overflow-hidden bg-[var(--shell-outer-bg)]">
        <div className="theme-shell relative h-dvh w-full max-w-[440px] shadow-[var(--shell-shadow)]">
          <div className="theme-shell__effects">
            <ThemeBackground />
          </div>
          <div className="theme-shell__content">
            <FarcasterProvider>
              <FarcasterMiniAppProvider>
                <WalletProvider>
                  <main className="flex flex-1 flex-col min-h-0 overflow-hidden">
                    {children}
                  </main>
                  <Toaster position="top-center" expand={false} richColors />
                </WalletProvider>
              </FarcasterMiniAppProvider>
            </FarcasterProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
