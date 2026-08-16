import { sql } from "drizzle-orm"

/**
 * One writer at a time, as SQLite had it: each transaction that writes clinic data takes this lock first and holds it
 * to COMMIT, so a check inside one (is the room free? is this still the next step?) sees every earlier write.
 */
export const takeWriteLock = sql`select pg_advisory_xact_lock(4217)`
