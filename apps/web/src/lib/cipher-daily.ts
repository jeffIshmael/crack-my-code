import { prisma } from '@/lib/prisma';
import { CIPHER_DAILY_WIN_CAP } from '@/lib/game';

/** UTC midnight for the current day. */
export function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Count Cipher games started today for a registered player. */
export async function countCipherGamesToday(playerAddress: string): Promise<number> {
  const normalized = playerAddress.toLowerCase();
  const todayStart = startOfUtcDay();

  return prisma.game.count({
    where: {
      player1Address: normalized,
      mode: 'ai',
      createdAt: { gte: todayStart },
    },
  });
}

export async function getCipherDailyStatus(playerAddress: string) {
  const gamesPlayedToday = await countCipherGamesToday(playerAddress);
  const gamesRemaining = Math.max(0, CIPHER_DAILY_WIN_CAP - gamesPlayedToday);

  return {
    gamesPlayedToday,
    gamesRemaining,
    dailyCap: CIPHER_DAILY_WIN_CAP,
    atDailyCap: gamesPlayedToday >= CIPHER_DAILY_WIN_CAP,
  };
}
