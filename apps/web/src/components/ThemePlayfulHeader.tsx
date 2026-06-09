'use client';

import Image from 'next/image';

interface ThemePlayfulHeaderProps {
  points: number;
  usdtFormatted?: string;
}

export function ThemePlayfulHeader({ points, usdtFormatted }: ThemePlayfulHeaderProps) {
  const usdtValue =
    usdtFormatted && parseFloat(usdtFormatted) > 0
      ? parseFloat(usdtFormatted).toFixed(2)
      : '0.00';

  return (
    <div className="theme-playful-header">
      <div className="theme-playful-header__coins">
        <span className="theme-playful-coin font-ui" aria-hidden>
          CMC
        </span>
        <span className="font-ui theme-playful-header__points">
          {points.toLocaleString()}
        </span>
      </div>
      <div className="theme-playful-header__usdt font-body">
        <Image
          src="/usdt-logo.png"
          alt=""
          width={22}
          height={22}
          className="theme-playful-header__usdt-icon"
          aria-hidden
        />
        <span>{usdtValue} USDT</span>
      </div>
    </div>
  );
}
