"use server"

import { and, eq, gt, ilike, inArray, lt, not } from "drizzle-orm"
import { z } from "zod"

import { clinicNow } from "@/db/clock"
import { getBookingSheet } from "@/db/queries/calendar"
import {
  blocks,
  bookingEvents,
  bookings,
  CHAIR_COLORS,
  practitioners,
  rooms,
} from "@/db/schema"
import { atTime, bookingInput, changeLine } from "@/lib/bookings"
import { clock } from "@/lib/dates"
import { authActionClient } from "@/lib/safe-action"

import {
  nextSeq,
  recordHygiene,
  Refused,
  type Tx,
  writeAndRefresh,
} from "./shared"

const byId = z.number().int()

/** The appointment sheet's data, for a sheet opened anywhere (a chip, the bell, Search) */
export const loadBookingSheet = authActionClient
  .inputSchema(byId)
  .action(async ({ parsedInput: id }) => getBookingSheet(id))

/** The typed room ("op 1") as a room; blank is none */
async function roomFor(tx: Tx, typed: string) {
  if (!typed) return null
  const [room] = await tx
    .select({ id: rooms.id })
    .from(rooms)
    .where(ilike(rooms.name, typed))
  if (!room) throw new Refused(`There's no room called ${typed}.`)
  return room.id
}

/** New Booking or Edit Booking's Save: the booking, and a line in the board's log */
export const saveBooking = authActionClient
  .inputSchema(
    z.object({ id: z.number().int().nullable(), input: bookingInput })
  )
  .action(async ({ parsedInput: { id, input: b } }) => {
    const startsAt = atTime(b.date, b.start)
    const endsAt = atTime(b.date, b.end)
    const now = new Date(await clinicNow())
    return writeAndRefresh(async (tx) => {
      const [held] = await tx
        .select({ title: blocks.title })
        .from(blocks)
        .where(
          and(
            eq(blocks.practitionerId, b.practitionerId),
            lt(blocks.startsAt, endsAt),
            gt(blocks.endsAt, startsAt)
          )
        )
      if (held) throw new Refused(`Overlaps ${held.title} in that chair.`)
      const roomId = await roomFor(tx, b.room)
      const fields = {
        patientId: b.patientId,
        procedureId: b.procedureId,
        practitionerId: b.practitionerId,
        startsAt,
        endsAt,
        status: b.status,
        roomId,
        note: b.note || null,
      }
      const log = {
        patientId: b.patientId,
        practitionerId: b.practitionerId,
        procedureId: b.procedureId,
        at: now,
      }
      if (id === null) {
        const [made] = await tx
          .insert(bookings)
          .values({ ...fields, seq: await nextSeq(tx, startsAt) })
          .returning({ id: bookings.id })
        if (!made) throw new Refused("That booking couldn't be saved.")
        await tx.insert(bookingEvents).values({
          ...log,
          bookingId: made.id,
          kind: "booked",
          detail: `Scheduled for ${clock(startsAt)}`,
        })
        await recordHygiene(tx, fields)
        return "Booking saved"
      }
      const [before] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, id))
      if (!before) throw new Refused("That booking is gone.")
      await tx.update(bookings).set(fields).where(eq(bookings.id, id))
      const line = changeLine(before, fields) ?? {
        kind: "updated" as const,
        detail: "Details updated",
      }
      await tx.insert(bookingEvents).values({ ...log, bookingId: id, ...line })
      await recordHygiene(tx, fields)
      return "Booking saved"
    })
  })

/** A chip dragged to another time or chair, or resized */
export const moveBooking = authActionClient
  .inputSchema(
    z.object({
      id: z.number().int(),
      move: z.object({
        startsAt: z.date(),
        endsAt: z.date(),
        practitionerId: z.string().optional(),
        /** Dropped in another operatory's column */
        roomId: z.string().optional(),
      }),
    })
  )
  .action(async ({ parsedInput: { id, move } }) => {
    const now = new Date(await clinicNow())
    return writeAndRefresh(async (tx) => {
      const [before] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, id))
      if (!before) throw new Refused("That booking is gone.")
      const after = {
        startsAt: move.startsAt,
        endsAt: move.endsAt,
        practitionerId: move.practitionerId ?? before.practitionerId,
        roomId: move.roomId ?? before.roomId,
      }
      const [room] =
        after.roomId === before.roomId || !after.roomId
          ? []
          : await tx
              .select({ name: rooms.name })
              .from(rooms)
              .where(eq(rooms.id, after.roomId))
      if (after.roomId !== before.roomId && !room)
        throw new Refused("There's no such operatory.")
      await tx.update(bookings).set(after).where(eq(bookings.id, id))
      const line =
        changeLine(before, { ...before, ...after }) ??
        (room
          ? { kind: "rescheduled" as const, detail: `Moved to ${room.name}` }
          : null)
      if (line)
        await tx.insert(bookingEvents).values({
          bookingId: id,
          patientId: before.patientId,
          practitionerId: after.practitionerId,
          procedureId: before.procedureId,
          at: now,
          ...line,
        })
      return "Booking moved"
    })
  })

/** The Delete dialog's "Cancel Appointment": the slot goes back to the board, the log keeps the line */
export const deleteBooking = authActionClient
  .inputSchema(byId)
  .action(async ({ parsedInput: id }) => {
    const now = new Date(await clinicNow())
    return writeAndRefresh(async (tx) => {
      const [gone] = await tx
        .delete(bookings)
        .where(eq(bookings.id, id))
        .returning()
      if (!gone) throw new Refused("That booking is gone.")
      await tx.insert(bookingEvents).values({
        bookingId: null,
        patientId: gone.patientId,
        practitionerId: gone.practitionerId,
        procedureId: gone.procedureId,
        kind: "cancelled",
        detail: "Removed from the board",
        at: now,
      })
      return "Appointment cancelled."
    })
  })

/** Which chairs the board shows (My Chairs' checkboxes, the toolbar's chair menu) */
export const showChairs = authActionClient
  .inputSchema(z.array(z.string()))
  .action(async ({ parsedInput: ids }) =>
    writeAndRefresh(async (tx) => {
      await tx
        .update(practitioners)
        .set({ onBoard: true })
        .where(inArray(practitioners.id, ids))
      await tx
        .update(practitioners)
        .set({ onBoard: false })
        .where(not(inArray(practitioners.id, ids)))
      return "Chairs updated"
    })
  )

/** A chair's color, from its ⋯ menu */
export const setChairColor = authActionClient
  .inputSchema(
    z.object({
      id: z.string(),
      color: z.enum(CHAIR_COLORS, { error: "That's not one of the colors." }),
    })
  )
  .action(async ({ parsedInput: { id, color } }) =>
    writeAndRefresh(async (tx) => {
      await tx
        .update(practitioners)
        .set({ color })
        .where(eq(practitioners.id, id))
      return "Color changed"
    })
  )
