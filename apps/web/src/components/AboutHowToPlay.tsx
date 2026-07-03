'use client';

type TileVariant = 'green' | 'yellow' | 'gray';

function DemoTile({ digit, variant }: { digit: string; variant: TileVariant }) {
  const className =
    variant === 'green'
      ? 'number-pad-key--hint-green'
      : variant === 'yellow'
        ? 'number-pad-key--hint-yellow'
        : 'number-pad-key--hint-absent';

  return (
    <span
      className={`scoreboard-tile number-pad-key ${className}`}
      style={{ width: '2.125rem', height: '2.125rem', fontSize: '0.9375rem' }}
    >
      {digit}
    </span>
  );
}

function WordRow({ tiles }: { tiles: { digit: string; variant: TileVariant }[] }) {
  return (
    <div className="about-scoreboard-row">
      {tiles.map((tile, i) => (
        <div key={i} className="scoreboard-slot" style={{ width: '2.125rem', height: '2.125rem' }}>
          <DemoTile digit={tile.digit} variant={tile.variant} />
        </div>
      ))}
    </div>
  );
}

function ExampleBlock({
  description,
  tiles,
}: {
  description: string;
  tiles: { digit: string; variant: TileVariant }[];
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="font-body text-sm leading-relaxed">{description}</p>
      <div className="about-scoreboard-frame">
        <WordRow tiles={tiles} />
      </div>
    </div>
  );
}

export function AboutHowToPlay() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="theme-sky-readout flex flex-col gap-3">
        <h2 className="font-ui text-xl font-bold">How to play Crack My Code?</h2>
        <p className="font-body text-sm leading-relaxed">
          Each player sets a secret 4-digit code. Take turns guessing your opponent&apos;s code —
          keep playing until someone cracks it. After each guess, colored tiles on the wooden board
          show how close you are — check the scoreboard to track your hints.
        </p>
      </div>

      <div className="theme-sky-readout flex flex-col gap-4">
        <h3 className="font-ui text-xs font-bold uppercase tracking-[0.2em] opacity-80">
          Tile colors
        </h3>

        <ExampleBlock
          description="Green — the digit is in the code and in the right spot."
          tiles={[
            { digit: '5', variant: 'green' },
            { digit: '1', variant: 'gray' },
            { digit: '2', variant: 'gray' },
            { digit: '3', variant: 'gray' },
          ]}
        />

        <ExampleBlock
          description="Yellow — the digit is in the code, but in the wrong spot."
          tiles={[
            { digit: '9', variant: 'yellow' },
            { digit: '1', variant: 'gray' },
            { digit: '2', variant: 'gray' },
            { digit: '3', variant: 'gray' },
          ]}
        />

        <ExampleBlock
          description="Dark gray — the digit is not in the code at all."
          tiles={[
            { digit: '0', variant: 'gray' },
            { digit: '1', variant: 'gray' },
            { digit: '2', variant: 'gray' },
            { digit: '3', variant: 'gray' },
          ]}
        />
      </div>

      <div className="theme-sky-readout flex flex-col gap-3">
        <h3 className="font-ui text-xs font-bold uppercase tracking-[0.2em] opacity-80">
          Ways to play
        </h3>

        <p className="font-body text-sm leading-relaxed">
          <strong>🤖 Cipher AI</strong> — Play instantly against the computer. Free, no setup required.
        </p>
        <p className="font-body text-sm leading-relaxed">
          <strong>👥 Player vs Player</strong> — Challenge another human. Choose a friendly free match, then pick who can join:
        </p>
        <ul className="flex flex-col gap-2 pl-1 font-body text-sm">
          <li>
            <strong>Open match</strong> — anyone can find and join your game.
          </li>
          <li>
            <strong>Invite only</strong> — share a Game ID so only your friend can join.
          </li>
        </ul>
        <p className="font-body text-sm opacity-80">
          USDT staking matches are coming soon.
        </p>
      </div>

      <div className="theme-sky-readout flex flex-col gap-3">
        <h3 className="font-ui text-xs font-bold uppercase tracking-[0.2em] opacity-80">
          Earning CMC Points
        </h3>
        <p className="font-body text-sm leading-relaxed">
          <strong>🤖 Cipher AI</strong> — Play without signing in. Sign in to earn{' '}
          <strong>+10 CMC</strong> when you win; losses do not reduce your points.
        </p>
        <p className="font-body text-sm leading-relaxed">
          <strong>👥 Player vs Player</strong> — The winner gains <strong>+15 CMC</strong> and the loser loses{' '}
          <strong>15 CMC</strong> (points move from loser to winner).
        </p>
      </div>

      <p className="theme-sky-footnote">
        🏆 Stack CMC points to climb the leaderboard!
      </p>
    </div>
  );
}
