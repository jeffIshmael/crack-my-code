/**
 * One-off maintenance: merge duplicate User rows that share the same wallet
 * (case-insensitive), keep lowercase address + highest points, reassign games.
 *
 * Usage: npx tsx scripts/merge-duplicate-users.ts
 */
import { prisma } from '../src/lib/prisma';
import { isGuestAddress } from '../src/lib/guest';
import { normalizeWalletAddress } from '../src/lib/user-address';

type UserRow = {
  id: number;
  address: string | null;
  points: number | null;
  _count: { games: number };
};

function pickCanonical(users: UserRow[]): UserRow {
  const lowercaseExact = users.find(
    (u) => u.address === normalizeWalletAddress(u.address ?? ''),
  );
  if (lowercaseExact) return lowercaseExact;

  return users.reduce((best, u) => {
    const bestPoints = best.points ?? 1000;
    const uPoints = u.points ?? 1000;
    if (uPoints > bestPoints) return u;
    if (uPoints < bestPoints) return best;
    return u._count.games > best._count.games ? u : best;
  });
}

async function main() {
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      address: true,
      points: true,
      _count: { select: { games: true } },
    },
    orderBy: { id: 'asc' },
  });

  const groups = new Map<string, UserRow[]>();
  for (const user of allUsers) {
    if (!user.address || isGuestAddress(user.address)) continue;
    const key = normalizeWalletAddress(user.address);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(user);
  }

  let mergedGroups = 0;
  let deletedUsers = 0;
  let normalizedSingles = 0;

  for (const [key, users] of groups) {
    if (users.length === 1) {
      const [user] = users;
      if (user.address !== key) {
        await prisma.user.update({
          where: { id: user.id },
          data: { address: key },
        });
        normalizedSingles += 1;
        console.log(`Normalized id ${user.id} -> ${key}`);
      }
      continue;
    }

    const canonical = pickCanonical(users);
    const duplicates = users.filter((u) => u.id !== canonical.id);
    const mergedPoints = Math.max(...users.map((u) => u.points ?? 1000));

    for (const dup of duplicates) {
      const reassigned = await prisma.game.updateMany({
        where: { userId: dup.id },
        data: { userId: canonical.id },
      });
      console.log(
        `Merge ${dup.address} (id ${dup.id}, ${dup.points} CMC, ${dup._count.games} games) -> id ${canonical.id} [${reassigned.count} games reassigned]`,
      );
      await prisma.user.delete({ where: { id: dup.id } });
      deletedUsers += 1;
    }

    await prisma.user.update({
      where: { id: canonical.id },
      data: {
        address: key,
        points: mergedPoints,
      },
    });

    console.log(`Canonical id ${canonical.id} (${key}) now at ${mergedPoints} CMC`);
    mergedGroups += 1;
  }

  const summary = {
    mergedGroups,
    deletedUsers,
    normalizedSingles,
    totalUsers: await prisma.user.count(),
    registeredUsers: await prisma.user.count({
      where: {
        address: { not: null },
        NOT: { address: { equals: 'GUEST', mode: 'insensitive' } },
      },
    }),
  };

  console.log('\nDone:', JSON.stringify(summary, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
