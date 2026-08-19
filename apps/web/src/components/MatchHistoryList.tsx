'use client';

interface HistoryGame {
  id: string;
  mode: string;
  status?: string;
  stake: number;
  winnerAddress?: string | null;
  player1Address: string;
  player2Address?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface MatchHistoryListProps {
  games: HistoryGame[];
  address?: string;
  walletAliases?: string[];
}

function formatWhen(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function opponentLabel(game: HistoryGame, aliases: string[]) {
  if (game.mode === 'ai' || game.player2Address === 'AI') return 'Cipher AI';
  const normalized = aliases.map((a) => a.toLowerCase());
  const opponent =
    normalized.includes(game.player1Address.toLowerCase())
      ? game.player2Address
      : game.player1Address;
  if (!opponent) return game.status === 'EXPIRED' ? 'No one joined' : '—';
  return `${opponent.slice(0, 6)}…${opponent.slice(-4)}`;
}

function modeIcon(mode: string) {
  if (mode === 'ai') return '🤖';
  if (mode === 'cash') return '💰';
  return '⚔️';
}

export default function MatchHistoryList({ games, address, walletAliases = [] }: MatchHistoryListProps) {
  const aliases = walletAliases.length > 0
    ? walletAliases
    : address
      ? [address]
      : [];

  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="text-4xl" aria-hidden>📜</span>
        <p className="font-ui text-sm font-bold text-[var(--text)]">No match history yet</p>
        <p className="font-body text-sm text-[var(--text-dim)] max-w-[260px]">
          Completed games will show up here after you play.
        </p>
      </div>
    );
  }

  return (
    <div className="theme-sky-readout flex flex-col rounded-2xl px-4 py-2">
      {games.map((game, i) => {
        const normalizedAliases = aliases.map((a) => a.toLowerCase());
        const playerAlias = normalizedAliases.find(
          (alias) =>
            alias === game.player1Address.toLowerCase() ||
            alias === game.player2Address?.toLowerCase(),
        ) || address?.toLowerCase() || '';

        const isExpired = game.status === 'EXPIRED';
        const isDraw = !isExpired && game.winnerAddress === 'DRAW';
        const isWinner = !isExpired && !isDraw && game.winnerAddress?.toLowerCase() === playerAlias;

        const resultColor = isExpired
          ? 'text-[var(--text-dim)]'
          : isWinner
            ? 'text-[var(--clue-green)]'
            : isDraw
              ? 'text-amber-500'
              : 'text-red-400';

        const resultDot = isExpired
          ? 'bg-[var(--text-dim)]'
          : isWinner
            ? 'bg-[var(--clue-green)]'
            : isDraw
              ? 'bg-amber-500'
              : 'bg-red-400';

        const reward = isExpired
          ? null
          : game.mode === 'cash'
            ? (isWinner ? `+${(game.stake * 2 * 0.99).toFixed(2)}` : isDraw ? `±${game.stake.toFixed(2)}` : `-${game.stake.toFixed(2)}`)
            : null;

        return (
          <div
            key={game.id}
            className={`flex items-center gap-3 px-1 py-2.5 ${
              i < games.length - 1 ? 'border-b border-[var(--border-mid)]/40' : ''
            }`}
          >
            {/* Result dot */}
            <div className={`h-2 w-2 flex-shrink-0 rounded-full ${resultDot}`} />

            {/* Mode icon + opponent */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="text-sm flex-shrink-0" aria-hidden>{modeIcon(game.mode)}</span>
              <span className="truncate font-ui text-xs font-bold text-[var(--text)]">
                {opponentLabel(game, aliases)}
              </span>
            </div>

            {/* Result label */}
            <span className={`flex-shrink-0 font-ui text-[10px] font-black uppercase tracking-wider ${resultColor}`}>
              {isExpired ? 'EXP' : isWinner ? 'W' : isDraw ? 'D' : 'L'}
            </span>

            {/* Reward or free */}
            <span className={`flex-shrink-0 min-w-[60px] text-right font-code text-[11px] font-bold ${
              isExpired ? 'text-[var(--text-dim)]' : isDraw ? 'text-amber-500' : reward && isWinner ? 'text-[var(--clue-green)]' : reward ? 'text-red-400' : 'text-[var(--text-dim)]'
            }`}>
              {isExpired ? 'Expired' : reward ? `${reward}` : 'Free'}
            </span>

            {/* Date */}
            <span className="flex-shrink-0 w-[52px] text-right font-body text-[10px] text-[var(--text-dim)]">
              {formatWhen(game.updatedAt || game.createdAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
