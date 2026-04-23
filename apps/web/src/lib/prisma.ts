import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const createClient = () => {
  // Use DATABASE_URL first, fallback to Vercel's POSTGRES_PRISMA_URL or POSTGRES_URL if linked
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
  console.log("Prisma: Initializing with connection string:", !!connectionString);
  
  const effectiveConnectionString = connectionString || "postgresql://dummy:dummy@localhost:5432/dummy";
  
  const pool = new Pool({ 
    connectionString: effectiveConnectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
