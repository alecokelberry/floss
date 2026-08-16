// Not "use server": helpers shared by src/app/actions/*.ts. A "use server" file may only export async functions, so the
// transaction plumbing lives here (the result types are in src/lib/action-result.ts).
import "server-only"
import { and, eq, gte, isNull, lt, max, or } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/db"
import { bookings, patients } from "@/db/schema"
import { takeWriteLock } from "@/db/write-lock"
import type { ActionResult } from "@/lib/action-result"
import { endOfDay, isoDay, startOfDay } from "@/lib/dates"
import { isHygiene } from "@/lib/recall"

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/** A check that failed inside a transaction: thrown to roll it back, returned to the caller as its error */
export class Refused extends Error {}

/**
 * Run writes that belong together all or nothing, one writer at a time (src/db/write-lock.ts), and refresh the page
 * once they land. `work` returns the toast line; a `Refused` inside comes back as `{ ok: false }`. `revalidatePath`
 * rather than `refresh()`: it also drops the pages the rail prefetched (kept for `staleTimes.dynamic`), so the next
 * click never shows a page from before the write.
 */
export async function writeAndRefresh(
  work: (tx: Tx) => Promise<string>
): Promise<ActionResult> {
  try {
    const message = await db.transaction(async (tx) => {
      await tx.execute(takeWriteLock)
      return work(tx)
    })
    revalidatePath("/", "layout")
    return { ok: true, message }
  } catch (e) {
    if (e instanceof Refused) return { ok: false, error: e.message }
    throw e
  }
}

/** The next place in a day's list: a booking made in the app goes after the day's last */
export async function nextSeq(tx: Tx, day: Date) {
  const [row] = await tx
    .select({ seq: max(bookings.seq) })
    .from(bookings)
    .where(
      and(
        gte(bookings.startsAt, startOfDay(day)),
        lt(bookings.startsAt, endOfDay(day))
      )
    )
  return (row?.seq ?? 0) + 1
}

/** A finished cleaning resets its patient's recall: their last hygiene visit moves up to that day */
export async function recordHygiene(
  tx: Tx,
  b: { patientId: number; procedureId: string; startsAt: Date; status: string }
) {
  if (!isHygiene(b.procedureId)) return
  if (b.status !== "completed" && b.status !== "unpaid") return
  const day = isoDay(b.startsAt)
  await tx
    .update(patients)
    .set({ lastHygieneOn: day })
    .where(
      and(
        eq(patients.id, b.patientId),
        or(isNull(patients.lastHygieneOn), lt(patients.lastHygieneOn, day))
      )
    )
}
