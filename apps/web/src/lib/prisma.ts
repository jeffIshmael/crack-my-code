import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

const createClient = () => {
  console.log("Prisma: Initializing with connection string:", !!connectionString);
  // If we have a connection string, use the adapter
  if (connectionString) {
    const pool = new Pool({ 
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  // Fallback for build time - provides a dummy client to satisfy the constructor requirements
  // but won't be used for actual queries.
  return new PrismaClient();
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
