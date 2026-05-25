import "dotenv/config";
import { defineConfig } from "prisma/config";

/** Supabase session pooler (5432) from transaction pooler URL — works on IPv4 networks. */
function sessionPoolerFromDatabaseUrl(databaseUrl: string): string | null {
  try {
    const parsed = new URL(databaseUrl.replace(/^postgresql:/i, "http:"));
    if (!parsed.hostname.includes("pooler.supabase.com")) return null;

    const params = new URLSearchParams(parsed.search);
    params.delete("pgbouncer");
    if (!params.has("sslmode")) params.set("sslmode", "require");
    if (!params.has("connect_timeout")) params.set("connect_timeout", "30");

    const auth =
      parsed.username !== ""
        ? `${parsed.username}:${parsed.password}@`
        : "";
    const search = params.toString() ? `?${params}` : "";
    return `postgresql://${auth}${parsed.hostname}:5432${parsed.pathname}${search}`;
  } catch {
    return null;
  }
}

function withSslParams(url: string): string {
  if (url.includes("sslmode=")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sslmode=require&connect_timeout=30`;
}

const sessionFromPooler = process.env.DATABASE_URL
  ? sessionPoolerFromDatabaseUrl(process.env.DATABASE_URL)
  : null;

const directUrl = process.env.DIRECT_URL?.trim();
const usesIpv6OnlyDirectHost =
  !!directUrl &&
  /@db\.[a-z0-9]+\.supabase\.co/i.test(directUrl);

/**
 * Prisma CLI (migrate, db push, studio).
 * Prefer session pooler (IPv4) over db.* direct host (often IPv6-only).
 * App runtime still uses DATABASE_URL (transaction pooler :6543) in src/lib/prisma.ts.
 */
const migrationDatabaseUrl =
  (usesIpv6OnlyDirectHost && sessionFromPooler) ||
  (directUrl ? withSslParams(directUrl) : null) ||
  sessionFromPooler ||
  (process.env.DATABASE_URL ? withSslParams(process.env.DATABASE_URL) : null) ||
  "postgresql://postgres:password@localhost:5432/postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationDatabaseUrl,
  },
});
