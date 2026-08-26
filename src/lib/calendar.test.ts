import { describe, expect, it } from "vitest"

import { clinicDate } from "@/lib/dates"

import {
  bookedInView,
  calendarHref,
  calendarTitle,
  clickedFraction,
  plannerHref,
  plannerTitle,
  quarterAt,
  readCalendarParams,
  readPlannerParams,
  weekOf,
} from "./calendar"

const today = clinicDate(2026, 8, 28, 11, 24)

describe("calendar", () => {
  it("reads its place from the URL, today's Day view by default", () => {
    expect(readCalendarParams({}, today)).toEqual({
      date: clinicDate(2026, 8, 28),
      view: "day",
    })
    expect(
      readCalendarParams({ date: "2026-10-02", view: "week" }, today)
    ).toEqual({ date: clinicDate(2026, 9, 2), view: "week" })
    expect(readCalendarParams({ date: "soon" }, today).date).toEqual(
      clinicDate(2026, 8, 28)
    )
  })

  it("writes the URL back, bare for today's day", () => {
    expect(calendarHref(clinicDate(2026, 8, 28), "day", today)).toBe(
      "/calendar"
    )
    expect(calendarHref(clinicDate(2026, 8, 29), "week", today)).toBe(
      "/calendar?date=2026-09-29&view=week"
    )
  })

  it("titles the month or the week as the desk expects", () => {
    expect(calendarTitle(today, "day")).toBe("September 2026")
    expect(calendarTitle(today, "week")).toBe("Sep 27 - Oct 3, 2026")
    expect(calendarTitle(clinicDate(2026, 8, 22), "week")).toBe(
      "September 20 - 26, 2026"
    )
    expect(weekOf(today)).toEqual(clinicDate(2026, 8, 27))
  })

  it("counts what still holds a slot", () => {
    expect(
      bookedInView([
        { status: "booked" },
        { status: "cancelled" },
        { status: "completed" },
      ])
    ).toBe(2)
  })
})

describe("the Appointments planner's place", () => {
  it("reads and writes its view, Week by default", () => {
    expect(readPlannerParams({ view: "agenda" }, today).view).toBe("agenda")
    expect(readPlannerParams({ view: "resource" }, today).view).toBe("week")
    expect(plannerHref(clinicDate(2026, 8, 28), "week", today)).toBe(
      "/appointments"
    )
    expect(plannerHref(clinicDate(2026, 9, 2), "month", today)).toBe(
      "/appointments?date=2026-10-02&view=month"
    )
  })

  it("titles the week from Monday without the year", () => {
    expect(plannerTitle(today, "week")).toBe("Sep 28 - Oct 4")
    expect(plannerTitle(clinicDate(2026, 8, 23), "week")).toBe(
      "September 21 - 27"
    )
    expect(plannerTitle(today, "month")).toBe("September 2026")
    expect(plannerTitle(today, "agenda")).toBe("September 28")
  })
})

describe("a click in a day column", () => {
  const hours = { open: 8, close: 19 }
  it("books the quarter hour under the pointer", () => {
    const day = clinicDate(2026, 8, 28)
    expect(quarterAt(day, 0, hours)).toEqual(clinicDate(2026, 8, 28, 8))
    // 11 hours tall: 0.3 of the way down is 11:18, in the 11:15 quarter
    expect(quarterAt(day, 0.3, hours)).toEqual(clinicDate(2026, 8, 28, 11, 15))
    expect(
      clickedFraction({
        clientY: 150,
        currentTarget: {
          getBoundingClientRect: () => ({ top: 100, height: 200 }),
        },
      })
    ).toBe(0.25)
  })
})
