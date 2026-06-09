type DemoTileVariant = 'green' | 'gray';

const CODE_DEMO: { char: string; variant: DemoTileVariant }[] = [
  { char: 'C', variant: 'gray' },
  { char: '0', variant: 'green' },
  { char: 'D', variant: 'gray' },
  { char: '3', variant: 'green' },
];

function DemoTile({ char, variant }: { char: string; variant: DemoTileVariant }) {
  return (
    <span
      className={`theme-playful-mini-tile theme-playful-mini-tile--${variant}`}
      aria-hidden
    >
      {char}
    </span>
  );
}

export function ThemeLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`theme-logo theme-logo--playful ${className}`} aria-label="Crack My Code">
      <h1 className="font-display theme-playful-title">Crack My Code</h1>
      <div
        className="theme-playful-demo-row"
        aria-label="Example guess C0D3: digits 0 and 3 are correct, C and D are not in the code"
      >
        {CODE_DEMO.map((tile) => (
          <DemoTile key={tile.char} char={tile.char} variant={tile.variant} />
        ))}
      </div>
    </div>
  );
}
