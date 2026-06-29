import type { Metadata } from 'next';
import './globals.css';

import { WalletProvider } from '@/components/wallet-provider';
import { FarcasterProvider } from '@/components/farcaster-provider';
import { FarcasterMiniAppProvider } from '@/components/farcaster-miniapp-provider';
import { ThemeBackground } from '@/components/ThemeBackground';
import { Toaster } from '@/components/ui/toaster';
import { buildFcEmbedMetadata } from '@/lib/farcaster-embed';

export const metadata: Metadata = {
  title: 'Crack-My-Code',
  description: 'Crack the code first to win.',
  other: {
    'talentapp:project_verification':
      '9af4936c363200c2c29e3c154ef6fcb3e0f0cc120f9ebe5f2972226558494b0063366b4864d11d567957a6127b28ccc2f3def949a27b20a84ef62becd4d884ba',
    ...buildFcEmbedMetadata(),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var e=window.ethereum;if(e&&e.isMiniPay)window.__CMC_MINIPAY__=true;}catch(x){}})();`,
          }}
        />
      </head>
      <body className="h-dvh antialiased flex flex-col items-center justify-start overflow-hidden">
        <div className="theme-shell relative w-full max-w-[440px] shadow-[var(--shell-shadow)]">
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
