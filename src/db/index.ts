import "server-only"
import { attachDatabasePool } from "@vercel/functions"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { env } from "@/lib/env"

import * as schema from "./schema"

// One pool per server process, kept across dev hot reloads. On Vercel, attachDatabasePool closes idle
// connections before a function instance suspends; point DATABASE_URL at Neon's pooled (-pooler) host there.
declare global {
  var pool: Pool | undefined
}
const pool =
  globalThis.pool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 5_000,
  })
if (process.env.NODE_ENV !== "production") globalThis.pool = pool
attachDatabasePool(pool)

export const db = drizzle({ client: pool, schema })
