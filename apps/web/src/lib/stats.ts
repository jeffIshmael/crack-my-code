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

/** Start of UTC day, N days before the given date (N=14 → 14 days ago at 00:00 UTC). */
export function startOfUtcDayDaysAgo(days: number, date = new Date()) {
  const start = startOfUtcDay(date);
  start.setUTCDate(start.getUTCDate() - days);
  return start;
}

/** Completed games in the window ÷ window days (e.g. 14-day moving average daily games). */
export function movingAverageDaily(count: number, windowDays: number) {
  if (windowDays <= 0) return 0;
  return Math.round((count / windowDays) * 100) / 100;
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
