// A day's sheet: its bookings with who and what, the held blocks, and the catalog the Dashboard groups by.
import "server-only"
import { and, asc, gte, lt } from "drizzle-orm"
import { cache } from "react"

import { db } from "@/db"
import { clinicNow } from "@/db/clock"
import {
  getBookingsOn,
  getPractitioners,
  getSettings,
} from "@/db/queries/shell"
import { blocks, procedures, rooms } from "@/db/schema"
import { addDays, atMinute, startOfDay } from "@/lib/dates"
import { dayNumbers, openSlots } from "@/lib/day-sheet"
import { requireUser } from "@/lib/session"

/** The procedures and rooms a booking picks from, in their order */
export const getCatalog = cache(async () => {
  await requireUser()
  const [procedureList, roomList] = await Promise.all([
    db.select().from(procedures).orderBy(asc(procedures.sortOrder)),
    db.select().from(rooms).orderBy(asc(rooms.sortOrder)),
  ])
  return { procedures: procedureList, rooms: roomList }
})

export const getDaySheet = cache(async (dayStart: number) => {
  await requireUser()
  const [dayBookings, dayBlocks, catalog] = await Promise.all([
    getBookingsOn(dayStart),
    db
      .select()
      .from(blocks)
      .where(
        and(
          gte(blocks.startsAt, new Date(dayStart)),
          lt(blocks.startsAt, addDays(dayStart, 1))
        )
      ),
    getCatalog(),
  ])
  return { bookings: dayBookings, blocks: dayBlocks, ...catalog }
})
export type DaySheet = Awaited<ReturnType<typeof getDaySheet>>

/**
 * Today's sheet as the Dashboard and its Open Time panel read it: the chairs, the bookings in the sheet's shape, the
 * open slots between opening and closing, and the KPI numbers. Both render from this, so they always agree.
 */
export const getDayBoard = cache(async () => {
  const now = await clinicNow()
  const day = startOfDay(now)
  const [sheet, chairs, settings] = await Promise.all([
    getDaySheet(day.getTime()),
    getPractitioners(),
    getSettings(),
  ])
  const open = atMinute(day, settings.hours.open * 60)
  const close = atMinute(day, settings.hours.close * 60)
  const bookings = sheet.bookings.map((b) => ({
    id: b.id,
    practitionerId: b.practitionerId,
    procedureId: b.procedureId,
    roomId: b.roomId,
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    status: b.status,
    patient: `${b.patient.firstName} ${b.patient.lastName}`,
  }))
  const slots = openSlots(chairs, bookings, sheet.blocks, { open, close })
  return {
    day,
    chairs,
    bookings,
    slots,
    numbers: dayNumbers(
      chairs,
      bookings,
      sheet.blocks,
      slots,
      settings.hours.close - settings.hours.open
    ),
    procedures: sheet.procedures,
    rooms: sheet.rooms,
  }
})
export type DayBoard = Awaited<ReturnType<typeof getDayBoard>>
