import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  (connectionString
    ? new PrismaClient({
        adapter: new PrismaPg({ connectionString }),
      })
    : new Proxy({}, { 
        get: () => {
          if (process.env.NEXT_PHASE === 'phase-production-build') return () => Promise.resolve();
          throw new Error("Prisma accessed without DATABASE_URL");
        }
      }) as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
