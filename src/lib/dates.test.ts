import { describe, expect, it } from "vitest"

import {
  addDays,
  atMinute,
  CLINIC_TZ,
  clinicDate,
  clock,
  clockPadded,
  duration,
  longDate,
  minuteOfDay,
  parseDay,
  searchStamp,
  shortDay,
  startOfDay,
  timeRange,
  weekday,
  weekdayDate,
  weekdayMonthDay,
  weekRange,
} from "./dates"

const at = (d: number, h: number, m = 0, mo = 8) =>
  clinicDate(2026, mo, d, h, m)

describe("the practice's clock", () => {
  // The specs run in UTC (vitest.config.mts), as Vercel's servers do: none of this may lean on the process's zone
  it("keeps the practice's wall clock, whatever zone the process runs in", () => {
    expect(CLINIC_TZ).toBe("America/Denver")
    expect(clinicDate(2026, 8, 28, 8, 30).toISOString()).toBe(
      "2026-09-28T14:30:00.000Z"
    )
    expect(startOfDay(Date.UTC(2026, 8, 29, 3)).toISOString()).toBe(
      "2026-09-28T06:00:00.000Z"
    )
    expect(minuteOfDay(clinicDate(2026, 8, 28, 8, 30))).toBe(510)
    expect(weekday(clinicDate(2026, 8, 28))).toBe(1)
    expect(atMinute(clinicDate(2026, 8, 28, 17), 9 * 60)).toEqual(
      clinicDate(2026, 8, 28, 9)
    )
  })

  it("steps whole days across a change of clocks", () => {
    // Daylight saving ends on Sunday 1 November 2026: that day has 25 hours
    const saturday = clinicDate(2026, 10, 1)
    expect(addDays(saturday, 1)).toEqual(clinicDate(2026, 10, 2))
    expect(+addDays(saturday, 1) - +saturday).toBe(25 * 3_600_000)
  })

  it("reads a day from the URL only when it's a real one", () => {
    expect(parseDay("2026-09-28")).toEqual(clinicDate(2026, 8, 28))
    expect(parseDay("2026-02-30")).toBeNull()
    expect(parseDay("28/09/2026")).toBeNull()
  })
})

describe("dates", () => {
  it("writes times and ranges as the desk writes it", () => {
    expect(clock(at(28, 11, 24))).toBe("11:24 AM")
    expect(clockPadded(at(28, 9))).toBe("09:00 AM")
    expect(timeRange(at(28, 11), at(28, 12))).toBe("11:00 AM - 12:00 PM")
    expect(timeRange(at(28, 8), at(28, 8, 30), " to ")).toBe(
      "8:00 AM to 8:30 AM"
    )
    expect(weekdayDate(at(28, 9))).toBe("Monday, September 28")
    expect(weekdayMonthDay(at(30, 9))).toBe("Wednesday, Sep 30")
    expect(longDate(at(28, 9))).toBe("September 28th, 2026")
    expect(searchStamp(at(28, 8))).toBe("28 Sept, 8:00 am")
  })

  it("names a week within a month and across two", () => {
    expect(weekRange(at(20, 0), at(26, 0))).toBe("September 20 - 26, 2026")
    expect(weekRange(at(27, 0), at(3, 0, 0, 9))).toBe("Sep 27 - Oct 3, 2026")
  })

  it("writes lengths in hours and minutes", () => {
    expect(duration(30)).toBe("30m")
    expect(duration(60)).toBe("1h")
    expect(duration(90)).toBe("1h 30m")
  })

  it("adds the year to a day outside today's", () => {
    const today = clinicDate(2026, 8, 30)
    expect(shortDay(clinicDate(2026, 0, 22), today)).toBe("Jan 22")
    expect(shortDay(clinicDate(2025, 0, 22), today)).toBe("Jan 22, 2025")
  })
})
