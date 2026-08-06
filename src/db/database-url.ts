/** Postgres.app on this Mac: where development looks when no URL is set */
export const LOCAL_DATABASE_URL = "postgresql://localhost:5432/floss"

/**
 * The URL for code that runs outside Next (drizzle-kit, the seed). Migrations take Neon's direct connection when
 * it's set, since a transaction pooler can't run them; the app itself reads `env.DATABASE_URL` (src/lib/env.ts).
 */
export function databaseUrl({ direct = false } = {}) {
  return (
    (direct ? process.env.DATABASE_URL_UNPOOLED : undefined) ??
    process.env.DATABASE_URL ??
    LOCAL_DATABASE_URL
  )
}
