// The seeded practice as a test fixture: the same deterministic data the app shows, with the clock and `Date` frozen at
// NOW (Mon 28 Sep 2026, 11:24, the captured morning).
import { vi } from "vitest"

import { clinicDate } from "@/lib/dates"
import { DEMO_STAFF } from "@/lib/demo-account"

export const NOW = clinicDate(2026, 8, 28, 11, 24)

/**
 * Seeds the practice into this test file's own database (tests/database.ts) and signs in as the one account. `Date` stays at NOW for
 * the rest of the spec, so "today" never drifts. Returns the app's modules loaded against it.
 */
export async function seedPractice() {
  vi.resetModules()
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  // Queries opt out of prerendering with connection(), which needs a request; tests have none
  vi.doMock("next/server", () => ({ connection: async () => {} }))
  // Server actions refresh the page after writing; there's no page here
  vi.doMock("next/cache", () => ({ refresh: () => {} }))
  vi.doMock("@/lib/session", () => ({
    requireUser: async () => DEMO_STAFF[0],
    getSession: async () => ({ user: DEMO_STAFF[0] }),
  }))
  const { db } = await import("@/db")
  const { seedClinic } = await import("@/db/seed")
  await seedClinic(db, NOW.getTime())
  return { db, now: NOW.getTime() }
}
