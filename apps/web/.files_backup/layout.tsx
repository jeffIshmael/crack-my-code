import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Codebreaker — PvP Logic Duel',
  description: 'Real-time 1v1 code-cracking duel on Celo MiniPay',
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#030C15',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="grid-bg noise-overlay min-h-dvh antialiased">
        {children}
      </body>
    </html>
  );
}
