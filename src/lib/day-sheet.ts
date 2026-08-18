// The day's sheet as the Dashboard reads it: open time on each chair, the four
// KPI numbers and the Day Breakdown's buckets. Pure, so the page, the panel and the tests agree.
import type { BookingStatus } from "@/db/schema"
import { initialsOf } from "@/lib/portraits"

export type SheetBooking = {
  id: number
  practitionerId: string
  procedureId: string
  roomId: string | null
  startsAt: Date
  endsAt: Date
  status: BookingStatus
  patient: string
}
export type SheetBlock = {
  practitionerId: string
  startsAt: Date
  endsAt: Date
}
export type SheetChair = {
  id: string
  name: string
  specialty: string
  chairGroup: "daily" | "relief"
}

const MIN = 60_000

/** A stretch of open time on a chair, 30 minutes or longer */
export type OpenSlot = {
  practitionerId: string
  start: Date
  end: Date
  minutes: number
  /** A cancelled booking sits inside it: the time was given back */
  freed: boolean
}

/**
 * Open time on each chair between opening and closing: gaps of 30 minutes or more between bookings and held blocks
 * (a cancelled booking's time counts as open), by start, ties in chair order.
 */
export function openSlots(
  chairs: SheetChair[],
  bookings: SheetBooking[],
  blocks: SheetBlock[],
  day: { open: Date; close: Date }
): OpenSlot[] {
  const out: OpenSlot[] = []
  for (const chair of chairs) {
    const busy = [
      ...bookings.filter(
        (b) => b.practitionerId === chair.id && b.status !== "cancelled"
      ),
      ...blocks.filter((b) => b.practitionerId === chair.id),
    ]
      .map((b) => [b.startsAt.getTime(), b.endsAt.getTime()] as const)
      .toSorted((a, b) => a[0] - b[0])
    const cancelled = bookings.filter(
      (b) => b.practitionerId === chair.id && b.status === "cancelled"
    )
    let from = day.open.getTime()
    const gap = (to: number) => {
      const minutes = (to - from) / MIN
      if (minutes >= 30)
        out.push({
          practitionerId: chair.id,
          start: new Date(from),
          end: new Date(to),
          minutes,
          freed: cancelled.some(
            (c) => c.startsAt.getTime() >= from && c.endsAt.getTime() <= to
          ),
        })
    }
    for (const [s, e] of busy) {
      if (s > from) gap(Math.min(s, day.close.getTime()))
      from = Math.max(from, e)
    }
    if (from < day.close.getTime()) gap(day.close.getTime())
  }
  const order = chairs.map((c) => c.id)
  return out.toSorted(
    (a, b) =>
      a.start.getTime() - b.start.getTime() ||
      order.indexOf(a.practitionerId) - order.indexOf(b.practitionerId)
  )
}

/** The chairs that ran today: the daily chairs, and a relief chair with anyone booked in it */
export function chairsThatRan<C extends SheetChair>(
  chairs: C[],
  bookings: Pick<SheetBooking, "practitionerId">[]
) {
  return chairs.filter(
    (c) =>
      c.chairGroup === "daily" ||
      bookings.some((b) => b.practitionerId === c.id)
  )
}

/** The four KPI cards' numbers, and the Open Time bar's four parts (booked, held, gaps too short to sell, open) */
export function dayNumbers(
  chairs: SheetChair[],
  bookings: SheetBooking[],
  blocks: SheetBlock[],
  slots: OpenSlot[],
  hoursOpen: number
) {
  const ran = chairsThatRan(chairs, bookings)
  const kept = bookings.filter((b) => b.status !== "cancelled")
  const capacity = ran.length * hoursOpen * 60
  const bookedMinutes = kept
    .filter((b) => ran.some((c) => c.id === b.practitionerId))
    .reduce((t, b) => t + (b.endsAt.getTime() - b.startsAt.getTime()) / MIN, 0)
  const openMinutes = slots
    .filter((s) => ran.some((c) => c.id === s.practitionerId))
    .reduce((t, s) => t + s.minutes, 0)
  const heldMinutes = blocks
    .filter((b) => ran.some((c) => c.id === b.practitionerId))
    .reduce((t, b) => t + (b.endsAt.getTime() - b.startsAt.getTime()) / MIN, 0)
  const unpaid = bookings.filter((b) => b.status === "unpaid").length
  const cancelled = bookings.length - kept.length
  return {
    booked: kept.length,
    keptShare: bookings.length ? kept.length / bookings.length : 1,
    capacity,
    bookedMinutes,
    utilisation: capacity ? bookedMinutes / capacity : 0,
    heldMinutes,
    shortMinutes: Math.max(
      0,
      capacity - bookedMinutes - heldMinutes - openMinutes
    ),
    openMinutes,
    openShare: capacity ? openMinutes / capacity : 0,
    openSlots: slots.filter((s) => ran.some((c) => c.id === s.practitionerId))
      .length,
    needsDesk: unpaid + cancelled,
    unpaid,
    chairsRan: ran.length,
  }
}

/** The Day Breakdown's columns: the states a booking can be in, Unpaid counted in Bookings only */
export const BREAKDOWN_STATES = [
  "booked",
  "arrived",
  "in_chair",
  "completed",
  "cancelled",
] as const
export type BreakdownState = (typeof BREAKDOWN_STATES)[number]

export type Counts = { total: number } & Record<BreakdownState, number>

export type Bucket = {
  key: string
  label: string
  /** Chair: specialty; procedure: "30 minutes"; room: its kind */
  meta: string
  /** A child's badge ("30m", or a chair's initials) and second line ("30 minutes in the chair", or its specialty) */
  badge?: string
  note?: string
  counts: Counts
  bookings: SheetBooking[]
}
export type BucketGroup = Bucket & { children: Bucket[] }

export type BreakdownBy = "chair" | "procedure" | "room"

type Catalog = {
  chairs: SheetChair[]
  procedures: { id: string; name: string; minutes: number }[]
  rooms: { id: string; name: string; kind: string }[]
}

function count(list: SheetBooking[]): Counts {
  const c = { total: list.length } as Counts
  for (const s of BREAKDOWN_STATES)
    c[s] = list.filter((b) => b.status === s).length
  return c
}

/**
 * The day's bookings in groups (a chair, a procedure or a room) with children (the procedures on a chair or in a
 * room, the chairs that did a procedure): groups by bookings, most first, ties by name; children in catalog order.
 */
export function breakdown(
  bookings: SheetBooking[],
  by: BreakdownBy,
  catalog: Catalog
): BucketGroup[] {
  const procedureBucket = (
    list: SheetBooking[],
    p: Catalog["procedures"][number]
  ): Bucket => ({
    key: p.id,
    label: p.name,
    meta: `${p.minutes} minutes`,
    badge: `${p.minutes}m`,
    note: `${p.minutes} minutes in the chair`,
    counts: count(list),
    bookings: list,
  })
  const byProcedure = (list: SheetBooking[]) =>
    catalog.procedures
      .map((p) =>
        procedureBucket(
          list.filter((b) => b.procedureId === p.id),
          p
        )
      )
      .filter((c) => c.counts.total > 0)

  const groups: BucketGroup[] =
    by === "chair"
      ? catalog.chairs.map((c) => {
          const list = bookings.filter((b) => b.practitionerId === c.id)
          return {
            key: c.id,
            label: c.name,
            meta: c.specialty,
            counts: count(list),
            bookings: list,
            children: byProcedure(list),
          }
        })
      : by === "room"
        ? catalog.rooms.map((r) => {
            const list = bookings.filter((b) => b.roomId === r.id)
            return {
              key: r.id,
              label: r.name,
              meta: r.kind,
              counts: count(list),
              bookings: list,
              children: byProcedure(list),
            }
          })
        : catalog.procedures.map((p) => {
            const list = bookings.filter((b) => b.procedureId === p.id)
            return {
              ...procedureBucket(list, p),
              children: catalog.chairs
                .map((c) => {
                  const mine = list.filter((b) => b.practitionerId === c.id)
                  return {
                    key: c.id,
                    label: c.name,
                    meta: c.specialty,
                    badge: initialsOf(c.name),
                    note: c.specialty,
                    counts: count(mine),
                    bookings: mine,
                  }
                })
                .filter((c) => c.counts.total > 0),
            }
          })
  return groups
    .filter((g) => g.counts.total > 0)
    .toSorted(
      (a, b) =>
        b.counts.total - a.counts.total || a.label.localeCompare(b.label)
    )
}

/** The Filter select and the search, applied to the children; a group stays while a child does */
export function filterBreakdown(
  groups: BucketGroup[],
  filter: "everything" | "unpaid" | "cancelled",
  query: string
): BucketGroup[] {
  const q = query.trim().toLowerCase()
  return groups
    .map((g) => ({
      ...g,
      children: g.children.filter(
        (c) =>
          (filter === "everything" ||
            c.bookings.some((b) => b.status === filter)) &&
          (!q ||
            `${c.label} ${c.badge ?? ""} ${c.meta}`.toLowerCase().includes(q))
      ),
    }))
    .filter((g) => g.children.length > 0)
}

/** The footer's totals: every remaining child summed */
export function breakdownTotals(groups: BucketGroup[]): Counts {
  return count(groups.flatMap((g) => g.children.flatMap((c) => c.bookings)))
}

/** A share as the grid writes it: "40%" */
export const percent = (part: number, whole: number) =>
  `${whole ? Math.round((part / whole) * 100) : 0}%`

/** What each state means, as the heat cells' hover cards say it */
export const STATE_COPY: Record<
  BreakdownState,
  { label: string; means: string }
> = {
  booked: { label: "Booked", means: "Slot held, patient not in yet" },
  arrived: { label: "Arrived", means: "Checked in and waiting" },
  in_chair: { label: "In Chair", means: "Being treated right now" },
  completed: { label: "Completed", means: "Treatment finished" },
  cancelled: { label: "Cancelled", means: "Slot given back to the day" },
}

/**
 * A heat cell's step: 0 for none, then up to a third, up to half, more than half. Cancelled has its own two: none
 * (amber) or any (red).
 */
export function heatStep(
  state: BreakdownState,
  n: number,
  total: number
): 0 | 1 | 2 | 3 | "none" | "some" {
  if (state === "cancelled") return n ? "some" : "none"
  const share = total ? n / total : 0
  if (!share) return 0
  if (share <= 1 / 3) return 1
  return share <= 0.5 ? 2 : 3
}

/** A heat card's delta against the day's average, and whether it's good (up is good, but down for Cancelled) */
export function delta(state: BreakdownState, share: number, average: number) {
  const points = Math.round((share - average) * 100)
  const good = state === "cancelled" ? points <= 0 : points >= 0
  return { points, good }
}
