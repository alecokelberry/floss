"use server"

import { count, eq, max } from "drizzle-orm"
import { z } from "zod"

import { getPractitioners } from "@/db/queries/shell"
import { getStaffDay } from "@/db/queries/staff"
import {
  blocks,
  bookingEvents,
  bookings,
  patients,
  practitioners,
} from "@/db/schema"
import { authActionClient } from "@/lib/safe-action"
import { clinicianId, clinicianInput, loadRows } from "@/lib/staff"

import { Refused, writeAndRefresh } from "./shared"

const byId = z.string()

/** New or Edit Clinician's Save. A new one joins the relief chairs, off the board until a booking is theirs. */
export const saveClinician = authActionClient
  .inputSchema(z.object({ id: z.string().nullable(), input: clinicianInput }))
  .action(async ({ parsedInput: { id, input: c } }) => {
    const fields = {
      name: c.name,
      specialty: c.specialty,
      qualification: c.qualification,
      phone: c.phone,
      email: c.email,
      joinedOn: c.joinedOn,
      photoUrl: c.photoUrl || null,
    }
    return writeAndRefresh(async (tx) => {
      if (id === null) {
        const all = await tx
          .select({ id: practitioners.id })
          .from(practitioners)
        const [last] = await tx
          .select({ top: max(practitioners.sortOrder) })
          .from(practitioners)
        await tx.insert(practitioners).values({
          ...fields,
          id: clinicianId(
            c.name,
            all.map((p) => p.id)
          ),
          color: "graphite",
          chairGroup: "relief",
          onBoard: false,
          sortOrder: (last?.top ?? 0) + 1,
        })
        return `${c.name} is on the roster. They stay under Not scheduled until a booking is moved to them.`
      }
      const [done] = await tx
        .update(practitioners)
        .set(fields)
        .where(eq(practitioners.id, id))
        .returning({ id: practitioners.id })
      if (!done) throw new Refused("That clinician is gone.")
      return `${c.name} saved.`
    })
  })

/** Off the roster, only when they hold nothing in the diary; their patients become unassigned */
export const removeClinician = authActionClient
  .inputSchema(byId)
  .action(async ({ parsedInput: id }) =>
    writeAndRefresh(async (tx) => {
      const [held] = await tx
        .select({ n: count() })
        .from(bookings)
        .where(eq(bookings.practitionerId, id))
      if ((held?.n ?? 0) > 0) throw new Refused("Move their bookings first.")
      await tx
        .update(patients)
        .set({ practitionerId: null })
        .where(eq(patients.practitionerId, id))
      await tx.delete(blocks).where(eq(blocks.practitionerId, id))
      // Log lines about bookings long gone would hold them in place
      await tx.delete(bookingEvents).where(eq(bookingEvents.practitionerId, id))
      const [gone] = await tx
        .delete(practitioners)
        .where(eq(practitioners.id, id))
        .returning({ name: practitioners.name })
      if (!gone) throw new Refused("That clinician is gone.")
      return `${gone.name} is off the roster.`
    })
  )

/** A clinician as their sheet shows them: the roster row, today's chair time and visits, tomorrow's, the diary */
export const loadClinician = authActionClient
  .inputSchema(byId)
  .action(async ({ parsedInput: id }) => {
    const [roster, day] = await Promise.all([getPractitioners(), getStaffDay()])
    const chair = roster.find((p) => p.id === id)
    if (!chair) return null
    const load = loadRows(roster, day.visits, day.tomorrow)
    const row = [...load.floor, ...load.off].find((r) => r.chair.id === id)
    return {
      ...chair,
      minutes: row?.minutes ?? 0,
      today: row?.today ?? 0,
      tomorrow: row?.tomorrow ?? 0,
      diary: day.diary[id] ?? 0,
    }
  })
