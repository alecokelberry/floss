import { describe, expect, it } from "vitest"

import { clinicDate, isoDay } from "@/lib/dates"

import { isHygiene, recallDue, recallStatus } from "./recall"

const today = clinicDate(2026, 8, 30)

describe("recall", () => {
  it("is due the interval after the last hygiene visit", () => {
    const due = recallDue({ lastHygieneOn: "2026-03-15", recallMonths: 6 })
    expect(due && isoDay(due)).toBe("2026-09-15")
    const perio = recallDue({ lastHygieneOn: "2026-07-01", recallMonths: 3 })
    expect(perio && isoDay(perio)).toBe("2026-10-01")
    expect(recallDue({ lastHygieneOn: null, recallMonths: 6 })).toBeNull()
  })

  it("stands overdue, due within 30 days, current, or booked", () => {
    const at = (d: number, m = 8) => clinicDate(2026, m, d)
    expect(recallStatus(at(15), null, today)).toBe("overdue")
    expect(recallStatus(at(30), null, today)).toBe("due")
    expect(recallStatus(at(30, 9), null, today)).toBe("due")
    expect(recallStatus(at(31, 9), null, today)).toBe("current")
    expect(recallStatus(at(15), at(8, 9), today)).toBe("scheduled")
  })

  it("resets on a cleaning or perio maintenance", () => {
    expect(isHygiene("scaling")).toBe(true)
    expect(isHygiene("perio-maint")).toBe(true)
    expect(isHygiene("checkup")).toBe(false)
  })
})
