"use server"

import { eq } from "drizzle-orm"
import { z } from "zod"

import { getTask } from "@/db/queries/tasks"
import { tasks } from "@/db/schema"
import { atTime } from "@/lib/bookings"
import { addDays } from "@/lib/dates"
import { authActionClient } from "@/lib/safe-action"
import { taskInput } from "@/lib/tasks"

import { Refused, writeAndRefresh } from "./shared"

const byId = z.number().int()

/** A planner entry for its sheet, opened from a chip, an Agenda card or row */
export const loadTask = authActionClient
  .inputSchema(byId)
  .action(async ({ parsedInput: id }) => getTask(id))

/** New or Edit Appointment's save. A new entry starts To Do with no attendees, checks or notes. */
export const saveTask = authActionClient
  .inputSchema(z.object({ id: z.number().int().nullable(), input: taskInput }))
  .action(async ({ parsedInput: { id, input: t } }) => {
    const fields = {
      title: t.title,
      category: t.category,
      clinician: t.clinician,
      patient: t.patient,
      allDay: t.allDay,
      startsAt: atTime(t.startDate, t.allDay ? "00:00" : t.from),
      endsAt: t.allDay
        ? addDays(atTime(t.endDate, "00:00"), 1)
        : atTime(t.endDate, t.to),
      reference: t.reference || null,
      stage: t.stage || null,
      status: t.status || null,
      priority: t.priority,
      requirement: t.requirement || "Unassigned",
      dueOn: t.dueOn,
      workstream: t.workstream,
      room: t.room || null,
      note: t.note || null,
    }
    return writeAndRefresh(async (tx) => {
      if (id === null) {
        await tx.insert(tasks).values({
          ...fields,
          attendees: [],
          attendeeCount: 0,
          state: "To Do",
        })
        return "Booking created"
      }
      const [done] = await tx
        .update(tasks)
        .set(fields)
        .where(eq(tasks.id, id))
        .returning({ id: tasks.id })
      if (!done) throw new Refused("That appointment is gone.")
      return "Booking updated"
    })
  })

/** A chip dragged to another time or day, resized, or dropped into (or out of) the all-day row */
export const moveTask = authActionClient
  .inputSchema(
    z.object({
      id: z.number().int(),
      move: z.object({
        startsAt: z.date(),
        endsAt: z.date(),
        allDay: z.boolean(),
      }),
    })
  )
  .action(async ({ parsedInput: { id, move } }) =>
    writeAndRefresh(async (tx) => {
      const [done] = await tx
        .update(tasks)
        .set(move)
        .where(eq(tasks.id, id))
        .returning({ id: tasks.id })
      if (!done) throw new Refused("That appointment is gone.")
      return "Moved"
    })
  )

/** The sheet's Delete */
export const deleteTask = authActionClient
  .inputSchema(byId)
  .action(async ({ parsedInput: id }) =>
    writeAndRefresh(async (tx) => {
      const [gone] = await tx
        .delete(tasks)
        .where(eq(tasks.id, id))
        .returning({ id: tasks.id })
      if (!gone) throw new Refused("That appointment is gone.")
      return "Booking deleted"
    })
  )
