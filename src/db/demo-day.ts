// The practice's freshness. A page load reseeds the practice around today, its clock running from 11:24
// (src/lib/clock.ts), when the stored one is from another date (`ensureFreshDay`).
import "server-only"
import { eq } from "drizzle-orm"
import { cache } from "react"

import { db } from "@/db"
import { demoDay, settings } from "@/db/schema"
import { SEED_VERSION, seedClinic } from "@/db/seed"
import { staleReason } from "@/lib/clock"

const readDay = async () =>
  (await db.select().from(demoDay).where(eq(demoDay.id, 1)))[0]

/** Whether the stored practice came from an older seed than this deploy's */
const olderSeed = async () => {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "seed_version"))
  return row?.value !== SEED_VERSION
}

/** The reseed under way, if any: a second one waits for it rather than interleaving with it */
let reseeding: Promise<unknown> = Promise.resolve()

/**
 * Wipe and reseed today's clinic in one transaction, after any reseed already under way. Nobody reads a half-seeded
 * day (readers see the old one until it commits), and two resets can't interleave.
 */
function reseed({ empty = false }: { empty?: boolean } = {}) {
  const run = reseeding.then(() =>
    db.transaction((tx) => seedClinic(tx, Date.now(), { empty }))
  )
  reseeding = run.catch(() => {})
  return run
}

let checking: Promise<string | null> | null = null

/**
 * Starts a fresh demo day when the stored one is from another date, and says why (null when the day is fine). One check at a time, however many requests ask.
 */
function ensureFreshDemoDay(): Promise<string | null> {
  checking ??= (async () => {
    await reseeding
    const day = await readDay()
    const reason = !day
      ? "no demo day yet"
      : (staleReason(day.clinicStart, Date.now()) ??
        ((await olderSeed()) ? "a newer practice" : null))
    if (reason) await reseed()
    return reason
  })().finally(() => {
    checking = null
  })
  return checking
}

/** Once per request (the clinic layout and today's visits share it); the layout toasts the reason */
export const ensureFreshDay = cache(ensureFreshDemoDay)
