# Prisma migrations on Supabase

## Error: `prepared statement "s1" already exists`

This happens when `prisma migrate dev` uses the **connection pooler** (host ends with `pooler.supabase.com`, port **6543**). PgBouncer in transaction mode does not support Prisma Migrate.

## Fix

1. In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Connect** → **ORMs** or **Connection string**.
2. Copy the **Session pooler** string (port **5432**, host like `aws-0-....pooler.supabase.com`) — **recommended for migrations** on most networks.

   The `db.[PROJECT-REF].supabase.co` direct host is often **IPv6-only**. If `prisma migrate` fails with P1001, use the session pooler URL instead of the direct host.

3. Add to `apps/web/.env`:

```env
# App (transaction mode)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"

# Migrations (session mode — same pooler host, port 5432, no pgbouncer=true)
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"
```

Keep `DATABASE_URL` on the **transaction pooler** (6543) for the Next.js app.

4. Run migrations from `apps/web`:

```bash
cd apps/web
npx prisma migrate dev --name added_joincode
```

`prisma.config.ts` uses `DIRECT_URL` for migrations, but if that points at `db.*.supabase.co` (IPv6-only) it automatically uses a **session pooler** URL derived from `DATABASE_URL` instead. The Next.js app still uses `DATABASE_URL` (transaction pooler :6543) in `src/lib/prisma.ts`.

## If migrate still fails

Apply the SQL manually in Supabase **SQL Editor**:

```sql
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "joinCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Game_joinCode_key" ON "Game"("joinCode");
```

Then mark the migration as applied:

```bash
npx prisma migrate resolve --applied 20260525120000_add_join_code
```

## Quick check

| URL | Port | Use for |
|-----|------|---------|
| `...pooler.supabase.com` | 6543 | App (`DATABASE_URL`, transaction mode) |
| `...pooler.supabase.com` | 5432 | Migrations (`DIRECT_URL`, session mode) |
| `db....supabase.co` | 5432 | Direct (IPv6-only on many projects — use pooler :5432 if P1001) |
