// Staff accounts for sign-in, kept across "Reset demo day" (which only replaces the clinic's data), so resetting the
// day never signs anyone out. Passwords are hashed with Better Auth's own scrypt. Users that already exist are brought
// up to date (name, email, the demo password), so a change to the demo staff reaches a database seeded before it on
// the next reset. Only the practice manager signs in (`DEMO_STAFF`); the rest of the staff are users without a password,
// so the seeded history can name them, and any sign-in they had from before is removed.
import { hashPassword, verifyPassword } from "better-auth/crypto"
import { and, eq, inArray, like, notInArray } from "drizzle-orm"
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core"

import { DEMO_PASSWORD, DEMO_STAFF } from "../lib/demo-account"
import { authAccounts, authUsers } from "./schema"

/** Creates the missing demo accounts and updates the rest; returns how many were created or changed */
export async function seedStaff<S extends Record<string, unknown>>(
  database: PgDatabase<PgQueryResultHKT, S>
) {
  const db = database as unknown as PgDatabase<PgQueryResultHKT>
  const ids = DEMO_STAFF.map((s) => s.id)
  const users = await db
    .select()
    .from(authUsers)
    .where(inArray(authUsers.id, ids))
  const accounts = await db
    .select()
    .from(authAccounts)
    .where(
      and(
        inArray(authAccounts.userId, ids),
        eq(authAccounts.providerId, "credential")
      )
    )
  const now = new Date()
  let changed = 0

  const missing = DEMO_STAFF.filter((s) => !users.some((u) => u.id === s.id))
  if (missing.length) {
    await db.insert(authUsers).values(
      missing.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      }))
    )
    changed += missing.length
  }
  for (const s of DEMO_STAFF) {
    const user = users.find((u) => u.id === s.id)
    if (user && (user.name !== s.name || user.email !== s.email)) {
      await db
        .update(authUsers)
        .set({ name: s.name, email: s.email, updatedAt: now })
        .where(eq(authUsers.id, s.id))
      changed++
    }
    // One hash each, so each gets its own salt; an old password (before a rename) is replaced
    const account = accounts.find((a) => a.userId === s.id)
    if (!account) {
      await db.insert(authAccounts).values({
        id: `${s.id}-credential`,
        accountId: s.id,
        providerId: "credential",
        userId: s.id,
        password: await hashPassword(DEMO_PASSWORD),
        createdAt: now,
        updatedAt: now,
      })
      if (user) changed++
    } else if (
      !account.password ||
      !(await verifyPassword({
        hash: account.password,
        password: DEMO_PASSWORD,
      }))
    ) {
      await db
        .update(authAccounts)
        .set({ password: await hashPassword(DEMO_PASSWORD), updatedAt: now })
        .where(eq(authAccounts.id, account.id))
      changed++
    }
  }
  return changed
}

/**
 * Staff who left the demo: their users, sessions and sign-ins go. Run once the clinic's data is wiped, since that data
 * may still name them.
 */
export async function removeRetiredStaff<S extends Record<string, unknown>>(
  database: PgDatabase<PgQueryResultHKT, S>
) {
  const db = database as unknown as PgDatabase<PgQueryResultHKT>
  await db.delete(authUsers).where(
    and(
      like(authUsers.id, "staff-%"),
      notInArray(
        authUsers.id,
        DEMO_STAFF.map((s) => s.id)
      )
    )
  )
}
