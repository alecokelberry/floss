import { describe, expect, it } from "vitest"

import { clinicDate, minuteOfDay } from "@/lib/dates"

import { chairsThatRan, delta, heatStep, openSlots, percent } from "./day-sheet"

const at = (h: number, m = 0) => clinicDate(2026, 8, 28, h, m)

describe("openSlots", () => {
  it("keeps gaps of 30 minutes or more, counting a cancellation as open", () => {
    const slots = openSlots(
      [{ id: "a", name: "A", specialty: "", chairGroup: "daily" }],
      [
        {
          id: 1,
          practitionerId: "a",
          procedureId: "x",
          roomId: null,
          startsAt: at(8, 15),
          endsAt: at(9),
          status: "booked",
          patient: "P",
        },
        {
          id: 2,
          practitionerId: "a",
          procedureId: "x",
          roomId: null,
          startsAt: at(10),
          endsAt: at(10, 30),
          status: "cancelled",
          patient: "Q",
        },
      ],
      [{ practitionerId: "a", startsAt: at(12), endsAt: at(13) }],
      { open: at(8), close: at(14) }
    )
    expect(
      slots.map((s) => [minuteOfDay(s.start) / 60, s.minutes, s.freed])
    ).toEqual([
      [9, 180, true],
      [13, 60, false],
    ])
  })
})

describe("delta", () => {
  it("counts points from the day's average; fewer cancellations are good", () => {
    expect(delta("booked", 0.4, 0.41)).toEqual({ points: -1, good: false })
    expect(delta("cancelled", 0, 0.06)).toEqual({ points: -6, good: true })
  })
})

describe("percent", () => {
  it("rounds a share", () => {
    expect(percent(1, 3)).toBe("33%")
    expect(percent(0, 0)).toBe("0%")
  })
})

describe("heatStep", () => {
  it("steps a share as the heat cells do", () => {
    expect(
      [
        [0, 5],
        [1, 5],
        [1, 3],
        [2, 5],
        [1, 2],
        [2, 3],
        [2, 2],
      ].map(([n, of]) => heatStep("booked", n!, of!))
    ).toEqual([0, 1, 1, 2, 2, 3, 3])
  })

  it("marks any cancellation", () => {
    expect([heatStep("cancelled", 0, 4), heatStep("cancelled", 1, 4)]).toEqual([
      "none",
      "some",
    ])
  })
})

describe("chairsThatRan", () => {
  it("counts the daily chairs, and a relief chair only when someone is booked in it", () => {
    const chairs = [
      { id: "a", name: "A", specialty: "", chairGroup: "daily" as const },
      { id: "b", name: "B", specialty: "", chairGroup: "relief" as const },
      { id: "c", name: "C", specialty: "", chairGroup: "relief" as const },
    ]
    expect(
      chairsThatRan(chairs, [{ practitionerId: "c" }]).map((c) => c.id)
    ).toEqual(["a", "c"])
  })
})
