import { beforeAll, describe, expect, it } from "vitest"

import { clinicDate, startOfDay } from "@/lib/dates"
import {
  breakdown,
  breakdownTotals,
  chairsThatRan,
  dayNumbers,
  filterBreakdown,
  openSlots,
  type SheetBooking,
} from "@/lib/day-sheet"

import { NOW, seedPractice } from "../../../tests/clinic"
import type { getDaySheet } from "./day"
import type { getPractitioners } from "./shell"

describe("the seeded day, as the Dashboard reads it", () => {
  let sheet: Awaited<ReturnType<typeof getDaySheet>>
  let chairs: Awaited<ReturnType<typeof getPractitioners>>
  beforeAll(async () => {
    await seedPractice()
    const day = startOfDay(NOW)
    sheet = await (await import("./day")).getDaySheet(day.getTime())
    chairs = await (await import("./shell")).getPractitioners()
  })

  const bookings = (): SheetBooking[] =>
    sheet.bookings.map((b) => ({
      ...b,
      patient: `${b.patient.firstName} ${b.patient.lastName}`,
    }))
  const window = () => ({
    open: clinicDate(2026, 8, 28, 8),
    close: clinicDate(2026, 8, 28, 19),
  })

  it("finds the day's open slots, with the one a cancellation freed", () => {
    const slots = openSlots(chairs, bookings(), sheet.blocks, window())
    const open = chairsThatRan(chairs, bookings())
    const ran = slots.filter((s) => open.some((c) => c.id === s.practitionerId))
    expect(ran.length).toMatchInlineSnapshot(`24`)
    expect(ran.reduce((t, s) => t + s.minutes, 0) / 60).toMatchInlineSnapshot(
      `32.5`
    )
    expect(ran.filter((s) => s.freed).map((s) => s.practitionerId))
      .toMatchInlineSnapshot(`
      [
        "chen",
      ]
    `)
  })

  it("gives the KPI cards their numbers", () => {
    const slots = openSlots(chairs, bookings(), sheet.blocks, window())
    const n = dayNumbers(chairs, bookings(), sheet.blocks, slots, 11)
    expect({
      booked: n.booked,
      kept: Math.round(n.keptShare * 100),
      utilisation: Math.round(n.utilisation * 100),
      openSlots: n.openSlots,
      needsDesk: n.needsDesk,
      unpaid: n.unpaid,
      bar: [n.bookedMinutes, n.heldMinutes, n.shortMinutes, n.openMinutes],
    }).toMatchInlineSnapshot(`
      {
        "bar": [
          1365,
          450,
          195,
          1950,
        ],
        "booked": 26,
        "kept": 96,
        "needsDesk": 2,
        "openSlots": 24,
        "unpaid": 1,
        "utilisation": 34,
      }
    `)
    expect(
      n.bookedMinutes + n.heldMinutes + n.shortMinutes + n.openMinutes
    ).toBe(n.capacity)
  })

  it("groups the Day Breakdown by chair, procedure and room", () => {
    const catalog = {
      chairs,
      procedures: sheet.procedures,
      rooms: sheet.rooms,
    }
    const byChair = breakdown(bookings(), "chair", catalog)
    expect(byChair.map((g) => [g.label, g.counts.total]))
      .toMatchInlineSnapshot(`
      [
        [
          "Dr. Amara Chen",
          8,
        ],
        [
          "Hana Sato",
          6,
        ],
        [
          "Dr. Elena Novak",
          4,
        ],
        [
          "Dr. Ines Duarte",
          3,
        ],
        [
          "Dr. Ravi Menon",
          3,
        ],
        [
          "Dr. Tomas Reyes",
          3,
        ],
      ]
    `)
    expect(byChair[0]!.children.map((c) => c.label)).toMatchInlineSnapshot(`
      [
        "Exam & X-rays",
        "Composite Filling",
        "Crown",
      ]
    `)
    const t = breakdownTotals(byChair)
    expect([
      t.total,
      t.booked,
      t.arrived,
      t.in_chair,
      t.completed,
      t.cancelled,
    ]).toEqual([27, 8, 2, 3, 12, 1])
    const byRoom = breakdown(bookings(), "room", catalog)
    expect(byRoom.map((g) => g.label)).toMatchInlineSnapshot(`
      [
        "Op 1",
        "Op 2",
        "Op 4",
        "Op 3",
        "Op 5",
        "Surgery Suite",
      ]
    `)
    expect(filterBreakdown(byChair, "unpaid", "").map((g) => g.label)).toEqual([
      "Dr. Tomas Reyes",
    ])
    expect(
      filterBreakdown(byChair, "everything", "cleaning").map((g) => g.label)
    ).toEqual(["Hana Sato"])
  })
})
