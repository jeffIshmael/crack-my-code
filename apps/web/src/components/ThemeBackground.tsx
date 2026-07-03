'use client';

const BOKEH = [
  { w: 140, t: '6%', l: '-25px', c: 'rgba(255, 255, 255, 0.5)', d: '0s' },
  { w: 110, t: '25%', r: '-15px', c: 'rgba(255, 255, 255, 0.32)', d: '1.2s' },
  { w: 160, b: '14%', l: '10%', c: 'rgba(232, 197, 139, 0.35)', d: '0.6s' },
  { w: 90, t: '50%', l: '62%', c: 'rgba(255, 255, 255, 0.22)', d: '2s' },
];

const PARTICLES = [
  { char: '🎲', top: '8%', left: '5%', size: '1.45rem', delay: '0s', dur: '5.5s', emoji: true },
  { char: '♟️', top: '28%', right: '4%', size: '1.3rem', delay: '0.8s', dur: '5s', emoji: true },
  { char: '🎯', top: '52%', left: '7%', size: '1.4rem', delay: '1.4s', dur: '5.8s', emoji: true },
  { char: '🎮', bottom: '20%', right: '7%', size: '1.35rem', delay: '0.3s', dur: '4.5s', emoji: true },
  { char: '🃏', bottom: '34%', left: '4%', size: '1.2rem', delay: '2s', dur: '6s', emoji: true },
  { char: '7', top: '42%', right: '11%', size: '1.25rem', delay: '1.8s', dur: '5.2s', emoji: false },
];

export function ThemeBackground() {
  return (
    <>
      <div className="theme-bg-pop-cloud theme-bg-pop-cloud--1" aria-hidden />
      <div className="theme-bg-pop-cloud theme-bg-pop-cloud--2" aria-hidden />
      <div className="theme-bg-pop-cloud theme-bg-pop-cloud--3" aria-hidden />

      {BOKEH.map((b, i) => (
        <div
          key={`bokeh-${i}`}
          className="theme-bg-bokeh"
          aria-hidden
          style={{
            width: b.w,
            height: b.w,
            top: b.t,
            left: b.l,
            right: b.r,
            bottom: b.b,
            background: b.c,
            animationDelay: b.d,
          }}
        />
      ))}

      {PARTICLES.map((p) => (
        <span
          key={`${p.char}-${p.top}`}
          className={`theme-bg-particle ${p.emoji ? 'theme-bg-particle--emoji' : 'theme-bg-particle--digit'}`}
          aria-hidden
          style={{
            top: p.top,
            left: p.left,
            right: p.right,
            bottom: p.bottom,
            fontSize: p.size,
            animationDelay: p.delay,
            animationDuration: p.dur,
          }}
        >
          {p.char}
        </span>
      ))}
    </>
  );
}
