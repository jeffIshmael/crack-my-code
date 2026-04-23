import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  (connectionString
    ? (() => {
        const pool = new Pool({ 
          connectionString,
          ssl: {
            rejectUnauthorized: false
          }
        });
        const adapter = new PrismaPg(pool);
        return new PrismaClient({ adapter });
      })()
    : new Proxy({}, { 
        get: () => {
          if (process.env.NEXT_PHASE === 'phase-production-build') return () => Promise.resolve();
          throw new Error("Prisma accessed without DATABASE_URL");
        }
      }) as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
