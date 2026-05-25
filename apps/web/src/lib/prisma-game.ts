import { prisma } from '@/lib/prisma';
import { normalizeJoinCodeInput } from '@/lib/join-code';
import type { Prisma } from '@prisma/client';

function isJoinCodeUnavailable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code;
  return (
    code === 'P2022' ||
    code === 'P2021' ||
    msg.includes('joinCode') ||
    msg.includes('column') && msg.includes('does not exist')
  );
}

type GameCreateData = Prisma.GameUncheckedCreateInput;

/** Create a game; omits joinCode if the column is not migrated yet. */
export async function createGameRecord(data: GameCreateData) {
  try {
    return await prisma.game.create({ data });
  } catch (error) {
    if (isJoinCodeUnavailable(error) && data && 'joinCode' in data) {
      console.warn(
        '[prisma-game] joinCode column missing — run prisma migrate. Private invites will use internal game id until migrated.'
      );
      const { joinCode: _removed, ...rest } = data;
      return await prisma.game.create({ data: rest });
    }
    throw error;
  }
}

/** Resolve pasted Game ID (short join code or internal id). */
export async function findGameByJoinInput(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const normalized = normalizeJoinCodeInput(trimmed);

  if (normalized.length >= 6 && normalized.length <= 12) {
    try {
      const byJoinCode = await prisma.game.findFirst({
        where: { joinCode: normalized },
      });
      if (byJoinCode) return byJoinCode;
    } catch (error) {
      if (!isJoinCodeUnavailable(error)) throw error;
    }
  }

  return prisma.game.findUnique({ where: { id: trimmed } });
}
