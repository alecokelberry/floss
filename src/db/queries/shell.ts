// What every page of the app shares: the practitioners, the settings and the board's log for the bell. Every query
// checks the session first (requireUser).
import "server-only"
import { and, asc, desc, gte, lt } from "drizzle-orm"
import { cache } from "react"

import { db } from "@/db"
import { bookings, practitioners, settings } from "@/db/schema"
import { dataVersion } from "@/db/version"
import { addDays } from "@/lib/dates"
import { requireUser } from "@/lib/session"
import { readSettings } from "@/lib/settings"

export const getPractitioners = cache(async () => {
  await requireUser()
  return db.select().from(practitioners).orderBy(asc(practitioners.sortOrder))
})
export type Practitioner = Awaited<ReturnType<typeof getPractitioners>>[number]

export const getSettings = cache(async () => {
  await requireUser()
  return readSettings(await db.select().from(settings))
})

/** The board's log, newest first: the bell's notifications */
export const getNotifications = cache(async () => {
  await requireUser()
  return db.query.bookingEvents.findMany({
    orderBy: (e) => [desc(e.at), desc(e.id)],
    limit: 50,
    with: {
      patient: {
        columns: { id: true, chart: true, firstName: true, lastName: true },
      },
      practitioner: { columns: { id: true, name: true } },
      procedure: { columns: { name: true } },
    },
  })
})
export type Notification = Awaited<ReturnType<typeof getNotifications>>[number]

/** A day's bookings with who and what, by start: Search's default list and anything that lists a day */
export const getBookingsOn = cache(async (dayStart: number) => {
  await requireUser()
  return db.query.bookings.findMany({
    where: and(
      gte(bookings.startsAt, new Date(dayStart)),
      lt(bookings.startsAt, addDays(dayStart, 1))
    ),
    orderBy: (b) => [asc(b.startsAt), asc(b.seq)],
    with: {
      patient: true,
      practitioner: true,
      procedure: true,
      room: true,
    },
  })
})
export type DayBooking = Awaited<ReturnType<typeof getBookingsOn>>[number]

/** A stamp that changes whenever anything is written (src/db/version.ts); staff only */
export async function getClinicVersion() {
  await requireUser()
  return dataVersion()
}
