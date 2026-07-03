'use client';

interface HistoryGame {
  id: string;
  mode: string;
  stake: number;
  winnerAddress?: string | null;
  player1Address: string;
  player2Address?: string | null;
  cipherRewardPaid?: boolean;
  cipherRewardAmount?: number | null;
  cipherRewardTxHash?: string | null;
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
  if (!opponent) return 'Unknown';
  return `${opponent.slice(0, 6)}…${opponent.slice(-4)}`;
}

function modeLabel(mode: string) {
  if (mode === 'ai') return 'Cipher';
  if (mode === 'cash') return 'Staked';
  return 'Friendly';
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
    <div className="flex flex-col gap-3">
      {games.map((game) => {
        const normalizedAliases = aliases.map((a) => a.toLowerCase());
        const playerAlias = normalizedAliases.find(
          (alias) =>
            alias === game.player1Address.toLowerCase() ||
            alias === game.player2Address?.toLowerCase(),
        ) || address?.toLowerCase() || '';

        const isWinner = game.winnerAddress?.toLowerCase() === playerAlias;
        const isDraw = !game.winnerAddress;
        const isCipher = game.mode === 'ai';
        const earnedReward = isCipher && isWinner && game.cipherRewardPaid;

        return (
          <div key={game.id} className="history-game-card">
            <div className="history-game-card__main">
              <div className="flex items-center gap-2">
                <span
                  className={`history-game-card__result ${
                    isWinner
                      ? 'history-game-card__result--win'
                      : isDraw
                        ? 'history-game-card__result--draw'
                        : 'history-game-card__result--loss'
                  }`}
                >
                  {isWinner ? 'Victory' : isDraw ? 'Draw' : 'Defeat'}
                </span>
                <span className="history-game-card__mode">{modeLabel(game.mode)}</span>
              </div>
              <span className="history-game-card__opponent">
                vs {opponentLabel(game, aliases)}
              </span>
              <span className="history-game-card__when">{formatWhen(game.updatedAt || game.createdAt)}</span>
            </div>

            <div className="history-game-card__reward">
              {game.mode === 'cash' ? (
                <span className="history-game-card__amount">
                  {isWinner
                    ? `+${(game.stake * 2 * 0.99).toFixed(2)} USDT`
                    : `-${game.stake.toFixed(2)} USDT`}
                </span>
              ) : earnedReward ? (
                <span className="history-game-card__amount history-game-card__amount--reward">
                  +{(game.cipherRewardAmount ?? 0.1).toFixed(1)} USDT
                </span>
              ) : isCipher && isWinner ? (
                <span className="history-game-card__amount history-game-card__amount--muted">
                  Win · no reward
                </span>
              ) : (
                <span className="history-game-card__amount history-game-card__amount--free">Free</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
