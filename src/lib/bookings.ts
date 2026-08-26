// A booking as the New and Edit Booking sheets take it, the quarter hours the
// Start and End lists offer, and the line the board's log writes for each change.
import { z } from "zod"

import {
  BOOKING_STATUSES,
  type BookingStatus,
  type EventKind,
} from "@/db/schema"
import {
  atMinute,
  clock,
  clockPadded,
  minuteOfDay,
  parseDay,
} from "@/lib/dates"
import { BOOKING_STATUS } from "@/lib/tones"

/** Every quarter hour of a day, in minutes from midnight: the Start and End lists */
export const QUARTER_HOURS = Array.from({ length: 96 }, (_, i) => i * 15)

/** "HH:mm" for a minute of the day */
export const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`

/** The Start and End lists' options: "08:30" shown as "08:30 AM" */
export const TIME_OPTIONS = QUARTER_HOURS.map((m) => ({
  value: hhmm(m),
  label: clockPadded(atMinute(0, m)),
}))

/** "HH:mm" for a Date's time of day */
export const timeOf = (d: Date) => hhmm(minuteOfDay(d))

/** Minutes from midnight for "HH:mm" */
export const minutesOf = (time: string) => {
  const [h = 0, m = 0] = time.split(":").map(Number)
  return h * 60 + m
}

/** The form's fields; the room is typed, as the desk types it ("Op 1") */
export const bookingInput = z
  .object({
    patientId: z.number({ error: "Choose a patient." }).int().positive(),
    procedureId: z.string().min(1),
    practitionerId: z.string().min(1),
    /** "yyyy-MM-dd" */
    date: z.iso.date(),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    status: z.enum(BOOKING_STATUSES),
    room: z.string().trim(),
    note: z.string().trim(),
  })
  .refine((b) => minutesOf(b.end) > minutesOf(b.start), {
    path: ["end"],
    message: "End must be after start.",
  })

/** A booking's Date from its day and a time of day, on the practice's clock */
export function atTime(date: string, time: string) {
  const day = parseDay(date)
  if (!day) throw new Error(`Not a day: ${date}`)
  return atMinute(day, minutesOf(time))
}

/** Midnight of a "yyyy-MM-dd" day */
export const dayOf = (date: string) => atTime(date, "00:00")

type Snapshot = {
  practitionerId: string
  startsAt: Date
  endsAt: Date
  status: BookingStatus
}

/**
 * The log line for a status or a move: a new status reads "Marked Completed", a new time or chair "Moved to 10:45 AM"
 * (the status wins when both change, as the desk cares most about it); null when neither changed.
 */
export function changeLine(
  before: Snapshot,
  after: Snapshot
): { kind: EventKind; detail: string } | null {
  if (before.status !== after.status)
    return {
      kind: "status",
      detail: `Marked ${BOOKING_STATUS[after.status].label}`,
    }
  if (
    before.startsAt.getTime() !== after.startsAt.getTime() ||
    before.endsAt.getTime() !== after.endsAt.getTime() ||
    before.practitionerId !== after.practitionerId
  )
    return { kind: "rescheduled", detail: `Moved to ${clock(after.startsAt)}` }
  return null
}
