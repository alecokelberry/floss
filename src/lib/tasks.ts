// The practice's work beyond the chairs, as the Appointments page shows it:
// the New/Edit Appointment form, the Agenda panel's day groups, the reminder count and the attendee overflow.
import { z } from "zod"

import { TASK_CATEGORIES } from "@/db/schema"
import { minutesOf } from "@/lib/bookings"
import { addDays, daysBetween, startOfDay, weekdayMonthDay } from "@/lib/dates"

export const CATEGORIES = [...TASK_CATEGORIES]

/** Who owns the planner's work, in the Clinician menu's order: the practice's clinicians, then the desk */
export const CLINICIANS = [
  "Dr. Amara Chen",
  "Dr. Ravi Menon",
  "Dr. Elena Novak",
  "Dr. Tomas Reyes",
  "Hana Sato",
  "Dr. Noah Weber",
  "Dr. Priya Raman",
  "Dr. Jonas Falk",
  "Dr. Ines Duarte",
  "Dana Whitaker",
]

/** An entry that isn't for a patient: a meeting, an audit */
export const INTERNAL = "Internal"

export const WORKSTREAMS = ["Tasks", "Treatment Plan", "Paperwork"] as const
export const PRIORITIES = ["Low", "Medium", "High"] as const

/** The form's fields: dates as "yyyy-MM-dd", times "HH:mm"; blank optional text is none */
export const taskInput = z
  .object({
    title: z.string().trim().min(1, "Give the event a title."),
    category: z.enum(TASK_CATEGORIES),
    clinician: z.string().min(1),
    patient: z.string().min(1),
    allDay: z.boolean(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    from: z.string().regex(/^\d{2}:\d{2}$/),
    to: z.string().regex(/^\d{2}:\d{2}$/),
    reference: z.string().trim(),
    stage: z.string().trim(),
    status: z.string().trim(),
    priority: z.enum(PRIORITIES).nullable(),
    requirement: z.string().trim(),
    dueOn: z.iso.date(),
    workstream: z.enum(WORKSTREAMS).nullable(),
    room: z.string().trim(),
    note: z.string().trim(),
  })
  .superRefine((t, ctx) => {
    if (t.allDay && t.endDate < t.startDate)
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "The last day cannot precede the first.",
      })
    if (
      !t.allDay &&
      (t.endDate < t.startDate ||
        (t.endDate === t.startDate && minutesOf(t.to) <= minutesOf(t.from)))
    )
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "End must be after start.",
      })
  })
export type TaskInput = z.infer<typeof taskInput>

type Dated = { startsAt: Date; allDay: boolean }

/**
 * The Agenda panel: the entries from today on, by day ("Today", "Tomorrow", then "Wednesday, Sep 30"), all-day first,
 * then by start. Days with nothing are left out.
 */
export function agendaGroups<T extends Dated>(list: T[], today: Date) {
  const from = startOfDay(today)
  const days = new Map<number, T[]>()
  for (const t of list) {
    const day = startOfDay(t.startsAt)
    if (day < from) continue
    days.set(day.getTime(), [...(days.get(day.getTime()) ?? []), t])
  }
  return [...days.entries()]
    .toSorted(([a], [b]) => a - b)
    .map(([at, items]) => {
      const day = new Date(at)
      const ahead = daysBetween(day, from)
      return {
        day,
        label:
          ahead === 0
            ? "Today"
            : ahead === 1
              ? "Tomorrow"
              : weekdayMonthDay(day),
        items: items.toSorted(
          (a, b) =>
            Number(b.allDay) - Number(a.allDay) ||
            a.startsAt.getTime() - b.startsAt.getTime()
        ),
      }
    })
}

/** Send reminders' count: the entries in view that have a patient (Internal ones don't) */
export const remindable = (list: { patient: string }[]) =>
  list.filter((t) => t.patient !== INTERNAL).length

/** An all-day entry's last day (its end is the next midnight) */
export const lastDay = (t: { endsAt: Date; allDay: boolean }) =>
  t.allDay ? addDays(t.endsAt, -1) : t.endsAt

/** The "+ N" after the three avatars a card shows; 0 when everyone is shown */
export const moreAttendees = (count: number, shown = 3) =>
  Math.max(0, count - shown)
