'use client';

interface HistoryGame {
  id: string;
  mode: string;
  stake: number;
  winnerAddress?: string | null;
  player1Address: string;
  player2Address?: string | null;
}

interface MatchHistoryListProps {
  games: HistoryGame[];
  address?: string;
}

export default function MatchHistoryList({ games, address }: MatchHistoryListProps) {
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

  const normalizedAddress = address?.toLowerCase() || '';

  return (
    <div className="flex flex-col gap-3">
      {games.map((game) => {
        const isWinner = game.winnerAddress?.toLowerCase() === normalizedAddress;
        const isDraw = !game.winnerAddress;
        const opponentAddr =
          game.player1Address.toLowerCase() === normalizedAddress
            ? game.player2Address
            : game.player1Address;

        return (
          <div key={game.id} className="theme-card flex items-center justify-between p-4">
            <div className="flex flex-col gap-1">
              <span
                className={`font-ui text-[10px] font-bold uppercase tracking-wider ${
                  isWinner ? 'text-[var(--clue-green)]' : isDraw ? 'text-[var(--accent)]' : 'text-red-500'
                }`}
              >
                {isWinner ? 'Victory' : isDraw ? 'Draw' : 'Defeat'}
              </span>
              <span className="font-body text-xs text-[var(--text-dim)]">
                vs {opponentAddr ? `${opponentAddr.slice(0, 6)}…${opponentAddr.slice(-4)}` : 'AI'}
              </span>
            </div>
            <div className="font-ui text-xs font-bold text-[var(--text)]">
              {game.mode === 'cash'
                ? isWinner
                  ? `+${(game.stake * 2 * 0.99).toFixed(2)}`
                  : `-${game.stake}`
                : 'FREE'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
