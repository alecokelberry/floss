// The Calendar's reads: a week of the sheet (bookings and held blocks), a day's log, the days of a month that have
// bookings (the mini calendar's dots), today's Up Next, and one booking's sheet. Every query checks the session first.
import "server-only"
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  max,
} from "drizzle-orm"
import { cache } from "react"

import { db } from "@/db"
import { clinicNow } from "@/db/clock"
import { blocks, bookingEvents, bookings, patients } from "@/db/schema"
import { addDays, isoDay } from "@/lib/dates"
import { requireUser } from "@/lib/session"

const WITH = {
  patient: {
    columns: { id: true, chart: true, firstName: true, lastName: true },
  },
  procedure: { columns: { id: true, code: true, name: true, minutes: true } },
  room: { columns: { id: true, name: true } },
} as const

/** Seven days of bookings and blocks from `from` (a midnight) */
export const getWeekSheet = cache(async (from: number) => {
  await requireUser()
  const start = new Date(from)
  const end = addDays(start, 7)
  const [list, held] = await Promise.all([
    db.query.bookings.findMany({
      where: and(gte(bookings.startsAt, start), lt(bookings.startsAt, end)),
      orderBy: (b) => [asc(b.startsAt), asc(b.seq)],
      with: WITH,
    }),
    db
      .select()
      .from(blocks)
      .where(and(gte(blocks.startsAt, start), lt(blocks.startsAt, end)))
      .orderBy(asc(blocks.startsAt)),
  ])
  return { bookings: list, blocks: held }
})
export type WeekSheet = Awaited<ReturnType<typeof getWeekSheet>>
export type SheetEntry = WeekSheet["bookings"][number]

/** A day's log, newest first: the Calendar's Log History */
export const getDayLog = cache(async (dayStart: number) => {
  await requireUser()
  const start = new Date(dayStart)
  return db.query.bookingEvents.findMany({
    where: and(
      gte(bookingEvents.at, start),
      lt(bookingEvents.at, addDays(start, 1))
    ),
    orderBy: (e) => [desc(e.at), desc(e.id)],
    with: {
      patient: {
        columns: { id: true, chart: true, firstName: true, lastName: true },
      },
      practitioner: { columns: { id: true, name: true } },
      procedure: { columns: { name: true } },
    },
  })
})
export type LogEntry = Awaited<ReturnType<typeof getDayLog>>[number]

/** Every day that holds a booking, as "yyyy-MM-dd" in the clinic's time: the mini calendar's dots */
export const getBookedDays = cache(async () => {
  await requireUser()
  const rows = await db.select({ at: bookings.startsAt }).from(bookings)
  return [...new Set(rows.map((r) => isoDay(r.at)))]
})

/** Today's patients still to be seen or in the chair, by start */
export const getUpNext = cache(async (dayStart: number) => {
  await requireUser()
  const start = new Date(dayStart)
  return db.query.bookings.findMany({
    where: and(
      gte(bookings.startsAt, start),
      lt(bookings.startsAt, addDays(start, 1)),
      inArray(bookings.status, ["booked", "arrived", "in_chair"])
    ),
    orderBy: (b) => [asc(b.startsAt), asc(b.seq)],
    with: {
      ...WITH,
      practitioner: { columns: { id: true, name: true } },
    },
  })
})
export type UpNextEntry = Awaited<ReturnType<typeof getUpNext>>[number]

/**
 * One booking as its appointment sheet shows it: who, what, when and where, the patient's contacts, how many
 * bookings they still have and have ever had (cancellations included; Patients leaves them out),
 * and when they were last treated.
 */
export async function getBookingSheet(id: number) {
  await requireUser()
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, id),
    with: {
      patient: true,
      practitioner: true,
      procedure: true,
      room: true,
    },
  })
  if (!booking) return null
  const now = new Date(await clinicNow())
  const [[upcoming], [total], [seen]] = await Promise.all([
    db
      .select({ n: count() })
      .from(bookings)
      .where(
        and(
          eq(bookings.patientId, booking.patientId),
          eq(bookings.status, "booked")
        )
      ),
    db
      .select({ n: count() })
      .from(bookings)
      .where(eq(bookings.patientId, booking.patientId)),
    db
      .select({ at: max(bookings.startsAt) })
      .from(bookings)
      .where(
        and(
          eq(bookings.patientId, booking.patientId),
          inArray(bookings.status, ["completed", "unpaid"]),
          lt(bookings.startsAt, now)
        )
      ),
  ])
  return {
    ...booking,
    upcoming: upcoming?.n ?? 0,
    total: total?.n ?? 0,
    lastSeen: seen?.at ?? null,
  }
}
export type BookingSheet = NonNullable<
  Awaited<ReturnType<typeof getBookingSheet>>
>

/** Everyone who can be booked, for the booking form's patient list */
export const getPatientList = cache(async () => {
  await requireUser()
  return db
    .select({
      id: patients.id,
      chart: patients.chart,
      firstName: patients.firstName,
      lastName: patients.lastName,
      stage: patients.stage,
      practitionerId: patients.practitionerId,
      phone: patients.phone,
      email: patients.email,
    })
    .from(patients)
    .where(isNull(patients.removedAt))
    .orderBy(asc(patients.firstName), asc(patients.lastName))
})
export type PatientOption = Awaited<ReturnType<typeof getPatientList>>[number]
