'use client';

type TileVariant = 'green' | 'yellow' | 'gray';

function DemoTile({ digit, variant }: { digit: string; variant: TileVariant }) {
  const className =
    variant === 'green'
      ? 'theme-playful-mini-tile--green'
      : variant === 'yellow'
        ? 'theme-playful-mini-tile--orange'
        : 'theme-playful-mini-tile--gray';

  return (
    <span
      className={`theme-playful-mini-tile ${className}`}
      style={{ width: '2.125rem', height: '2.125rem', fontSize: '0.9375rem' }}
    >
      {digit}
    </span>
  );
}

function WordRow({ tiles }: { tiles: { digit: string; variant: TileVariant }[] }) {
  return (
    <div className="flex gap-1.5">
      {tiles.map((tile, i) => (
        <DemoTile key={i} digit={tile.digit} variant={tile.variant} />
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
    <div className="flex flex-col gap-3">
      <p className="font-body text-sm leading-relaxed text-[var(--text-2)]">{description}</p>
      <WordRow tiles={tiles} />
    </div>
  );
}

export function AboutHowToPlay() {
  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h2 className="font-ui text-xl font-bold text-[var(--text)]">
          How to play Crack My Code?
        </h2>
        <p className="font-body text-sm leading-relaxed text-[var(--text-2)]">
          Each player sets a secret 4-digit code. Take turns guessing your opponent&apos;s code —
          keep playing until someone cracks it. After each guess, colored tiles show how close you
          are. Codes can repeat digits (like 1122).
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <h3 className="font-ui text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-dim)]">
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

      <div className="flex flex-col gap-4">
        <h3 className="font-ui text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-dim)]">
          Ways to play
        </h3>

        <div className="flex flex-col gap-3">
          <p className="font-body text-sm leading-relaxed text-[var(--text-2)]">
            <strong className="text-[var(--text)]">🤖 Cipher AI</strong> — Play instantly against
            the computer. Free, no setup required.
          </p>
          <p className="font-body text-sm leading-relaxed text-[var(--text-2)]">
            <strong className="text-[var(--text)]">👥 Player vs Player</strong> — Challenge another
            human. Choose a friendly free match, then pick who can join:
          </p>
          <ul className="flex flex-col gap-2 pl-1 font-body text-sm text-[var(--text-2)]">
            <li>
              <strong className="text-[var(--text)]">Open match</strong> — anyone can find and join
              your game.
            </li>
            <li>
              <strong className="text-[var(--text)]">Invite only</strong> — share a Game ID so only
              your friend can join.
            </li>
          </ul>
          <p className="font-body text-sm leading-relaxed text-[var(--text-dim)]">
            USDT staking matches are coming soon.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="font-ui text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-dim)]">
          Earning CMC Points
        </h3>
        <div className="flex flex-col gap-3 font-body text-sm leading-relaxed text-[var(--text-2)]">
          <p>
            <strong className="text-[var(--text)]">🤖 Cipher AI</strong> — Beat Cipher to earn{' '}
            <strong className="text-[var(--text)]">+10 CMC</strong>. Losing to Cipher does not
            reduce your points.
          </p>
          <p>
            <strong className="text-[var(--text)]">👥 Player vs Player</strong> — The winner gains{' '}
            <strong className="text-[var(--text)]">+15 CMC</strong> and the loser loses{' '}
            <strong className="text-[var(--text)]">15 CMC</strong> (points move from loser to winner).
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-[#D6EEF9]/80 px-4 py-4">
        <p className="font-body text-sm leading-relaxed text-[var(--text-2)]">
          🏆 Stack CMC points to climb the leaderboard!
        </p>
      </div>
    </div>
  );
}
