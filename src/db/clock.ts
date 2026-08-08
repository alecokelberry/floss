// The clinic's clock on the server (src/lib/clock.ts): read once per request from its row, then run to now.
import "server-only"
import { eq } from "drizzle-orm"
import { cache } from "react"

import { db } from "@/db"
import { demoDay } from "@/db/schema"
import {
  type ClockState,
  clinicMoment,
  clockTime,
  DAY_MOMENT_MIN,
} from "@/lib/clock"

/** The clock's state; before any day is seeded, today held at 11:24 */
export const readClock = cache(async (): Promise<ClockState> => {
  const [day] = await db.select().from(demoDay).where(eq(demoDay.id, 1))
  const real = Date.now()
  if (!day)
    return {
      seededAt: real,
      clinicStart: clinicMoment(real, DAY_MOMENT_MIN),
      pausedAt: real,
    }
  return {
    seededAt: day.seededAt.getTime(),
    clinicStart: day.clinicStart.getTime(),
    pausedAt: day.pausedAt?.getTime() ?? null,
  }
})

/** The clinic's time in ms, now */
export async function clinicNow() {
  return clockTime(await readClock())
}
