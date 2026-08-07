import { hashPassword, verifyPassword } from "better-auth/crypto"
import { eq } from "drizzle-orm"
import { beforeAll, describe, expect, it } from "vitest"

import type { db as Db } from "@/db"
import { DEMO_PASSWORD, DEMO_STAFF } from "@/lib/demo-account"

import { authAccounts, authUsers } from "./schema"
import { seedStaff } from "./seed-staff"

describe("seedStaff", () => {
  let db: typeof Db
  beforeAll(async () => {
    ;({ db } = await import("@/db"))
  })

  it("creates every demo account once, and leaves them on a second run", async () => {
    expect(await seedStaff(db)).toBe(DEMO_STAFF.length)
    expect(await seedStaff(db)).toBe(0)
    expect(await db.select().from(authUsers)).toHaveLength(DEMO_STAFF.length)
  })

  it("stores a salted hash per account that the demo password matches", async () => {
    const accounts = await db.select().from(authAccounts)
    expect(new Set(accounts.map((a) => a.password)).size).toBe(accounts.length)
    for (const a of accounts) {
      expect(a.password).not.toContain(DEMO_PASSWORD)
      expect(
        await verifyPassword({ hash: a.password!, password: DEMO_PASSWORD })
      ).toBe(true)
      expect(
        await verifyPassword({
          hash: a.password!,
          password: "wrong-password-1",
        })
      ).toBe(false)
    }
  })

  it("lets only the practice manager sign in", async () => {
    const accounts = await db.select().from(authAccounts)
    expect(
      accounts.map((a) => a.userId).toSorted((a, b) => a.localeCompare(b))
    ).toEqual(
      DEMO_STAFF.map((a) => a.id).toSorted((a, b) => a.localeCompare(b))
    )
  })

  it("brings an account seeded before a change up to date: its email, name and password", async () => {
    const [first] = DEMO_STAFF
    await db
      .update(authUsers)
      .set({ email: "old@clinic.test", name: "Old Name" })
      .where(eq(authUsers.id, first.id))
    await db
      .update(authAccounts)
      .set({ password: await hashPassword("an-old-password-1") })
      .where(eq(authAccounts.userId, first.id))
    expect(await seedStaff(db)).toBe(2)
    const [user] = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.id, first.id))
    expect(user).toMatchObject({
      email: first.email,
      name: first.name,
    })
    const [account] = await db
      .select()
      .from(authAccounts)
      .where(eq(authAccounts.userId, first.id))
    expect(
      await verifyPassword({
        hash: account!.password!,
        password: DEMO_PASSWORD,
      })
    ).toBe(true)
    expect(await seedStaff(db)).toBe(0)
  })
})
