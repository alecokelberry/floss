// The Staff page's rules: today's visits as the board's four states and their
// time chips, the Load panel's rows, a lane's next free start, and the New Clinician form.
import { z } from "zod"

import type { BookingStatus } from "@/db/schema"
import { clinicDate } from "@/lib/dates"
import { emailOk, phoneOk } from "@/lib/patients"

/** The board's four states: Completed and Cancelled read Done, Arrived and In Chair read In Chair */
export type BoardState = "done" | "in_chair" | "booked" | "unpaid"

export const BOARD_STATE: Record<BookingStatus, BoardState> = {
  completed: "done",
  cancelled: "done",
  arrived: "in_chair",
  in_chair: "in_chair",
  booked: "booked",
  unpaid: "unpaid",
}

/** The Filters menu, in order; "everything" is the trigger's own "Filters" */
export const STAFF_FILTERS: {
  value: BoardState | "everything"
  label: string
}[] = [
  { value: "everything", label: "Everything" },
  { value: "unpaid", label: "Unpaid" },
  { value: "in_chair", label: "In Chair" },
  { value: "booked", label: "Booked" },
  { value: "done", label: "Done" },
]

/** The time chip's phrase before the time, as the desk words it ("Due in 2:15 PM") */
export const CHIP_PHRASE: Record<BookingStatus, string> = {
  completed: "Seen in",
  arrived: "In chair in",
  in_chair: "In chair in",
  booked: "Due in",
  unpaid: "Owes in",
  cancelled: "Cancelled in",
}

type Visit = {
  practitionerId: string
  startsAt: Date
  endsAt: Date
}

const minutes = (v: Visit) =>
  (v.endsAt.getTime() - v.startsAt.getTime()) / 60_000

/** Where Add visit starts: when the lane's latest visit ends (the day's opening when it has none) */
export function nextStart(lane: Visit[], opening: Date) {
  return lane.reduce(
    (latest, v) => (v.endsAt > latest ? v.endsAt : latest),
    opening
  )
}

type Chair = { id: string; name: string; specialty: string }

/**
 * The Load panel: who's on the floor today (by booked minutes, busiest first, ties in roster order) with their bar's
 * share of the busiest, and everyone else by first name. Cancelled visits count.
 */
export function loadRows<C extends Chair>(
  roster: C[],
  today: Visit[],
  tomorrow: Visit[]
) {
  const rows = roster.map((c, order) => {
    const mine = today.filter((v) => v.practitionerId === c.id)
    return {
      chair: c,
      order,
      minutes: mine.reduce((t, v) => t + minutes(v), 0),
      today: mine.length,
      tomorrow: tomorrow.filter((v) => v.practitionerId === c.id).length,
    }
  })
  const floor = rows
    .filter((r) => r.today > 0)
    .toSorted((a, b) => b.minutes - a.minutes || a.order - b.order)
  const busiest = floor[0]?.minutes ?? 0
  const firstName = (name: string) => name.replace(/^Dr\.\s+/, "")
  return {
    floor: floor.map((r) => ({
      ...r,
      share: busiest ? r.minutes / busiest : 0,
    })),
    off: rows
      .filter((r) => r.today === 0)
      .toSorted((a, b) =>
        firstName(a.chair.name).localeCompare(firstName(b.chair.name))
      ),
    booked: today.reduce((t, v) => t + minutes(v), 0),
  }
}

/** New and Edit Clinician, checked on Save */
export const clinicianInput = z.object({
  name: z.string().trim().min(1, "Give the clinician a name."),
  specialty: z.string().trim().min(1, "Say what they practise."),
  qualification: z.string().trim(),
  phone: z
    .string()
    .trim()
    .refine((v) => !v || phoneOk(v), "Enter a reachable number."),
  joinedOn: z
    .string()
    .trim()
    .superRefine((v, ctx) => {
      if (!v) return
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        ctx.addIssue({ code: "custom", message: "Use the YYYY-MM-DD format." })
        return
      }
      const [y = 0, m = 0, d = 0] = v.split("-").map(Number)
      // Feb 30 rolls over into March and passes; a 13th month doesn't
      if (m < 1 || m > 12 || d < 1 || d > 31)
        ctx.addIssue({ code: "custom", message: "That is not a real date." })
      else if (clinicDate(y, m - 1, d).getTime() > Date.now())
        ctx.addIssue({ code: "custom", message: "Nobody joins in the future." })
    }),
  email: z
    .string()
    .trim()
    .refine((v) => !v || emailOk(v), "Enter a valid email address."),
  photoUrl: z
    .string()
    .trim()
    .refine(
      (v) => !v || /^https?:\/\/\S+$/.test(v),
      "Enter a full image URL, or leave it empty for initials."
    ),
})
export type ClinicianInput = z.infer<typeof clinicianInput>

/** A new clinician's id from their name: "Dr. Iris Bellweather" → "bellweather", numbered when taken */
export function clinicianId(name: string, taken: string[]) {
  const base =
    name
      .replace(/^Dr\.\s+/, "")
      .split(/\s+/)
      .at(-1)
      ?.toLowerCase()
      .replace(/[^a-z]/g, "") || "clinician"
  let id = base
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`
  return id
}
