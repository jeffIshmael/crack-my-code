const OPPONENT_MODES = ['fun', 'cash'] as const;

export function isCipherMode(mode: string) {
  return mode.toLowerCase() === 'ai';
}

export function isOpponentMode(mode: string) {
  return OPPONENT_MODES.includes(mode.toLowerCase() as (typeof OPPONENT_MODES)[number]);
}

export function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function formatLastPlayed(date: Date | string | null | undefined) {
  if (!date) return 'Never';

  const played = new Date(date);
  const now = new Date();
  const sameDay =
    played.getFullYear() === now.getFullYear() &&
    played.getMonth() === now.getMonth() &&
    played.getDate() === now.getDate();

  if (sameDay) {
    return `Today at ${played.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    played.getFullYear() === yesterday.getFullYear() &&
    played.getMonth() === yesterday.getMonth() &&
    played.getDate() === yesterday.getDate();

  if (isYesterday) return 'Yesterday';

  return played.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
