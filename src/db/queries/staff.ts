// The Staff page's reads: today's visits with who and what, tomorrow's (the Load panel counts them), and how many
// bookings each clinician holds in the diary.
import "server-only"
import { and, asc, count, gte, lt } from "drizzle-orm"
import { cache } from "react"

import { db } from "@/db"
import { clinicNow } from "@/db/clock"
import { bookings } from "@/db/schema"
import { addDays, startOfDay } from "@/lib/dates"
import { requireUser } from "@/lib/session"

export const getStaffDay = cache(async () => {
  await requireUser()
  const today = startOfDay(new Date(await clinicNow()))
  const tomorrow = addDays(today, 1)
  const [visits, next, diary] = await Promise.all([
    db.query.bookings.findMany({
      where: and(
        gte(bookings.startsAt, today),
        lt(bookings.startsAt, tomorrow)
      ),
      orderBy: (b) => [asc(b.startsAt), asc(b.seq)],
      with: {
        patient: {
          columns: { id: true, chart: true, firstName: true, lastName: true },
        },
        procedure: { columns: { id: true, name: true } },
        room: { columns: { name: true } },
      },
    }),
    db
      .select({
        practitionerId: bookings.practitionerId,
        startsAt: bookings.startsAt,
        endsAt: bookings.endsAt,
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.startsAt, tomorrow),
          lt(bookings.startsAt, addDays(tomorrow, 1))
        )
      ),
    db
      .select({ practitionerId: bookings.practitionerId, n: count() })
      .from(bookings)
      .groupBy(bookings.practitionerId),
  ])
  return {
    today,
    visits,
    tomorrow: next,
    diary: Object.fromEntries(diary.map((d) => [d.practitionerId, d.n])),
  }
})
export type StaffDay = Awaited<ReturnType<typeof getStaffDay>>
export type Visit = StaffDay["visits"][number]
