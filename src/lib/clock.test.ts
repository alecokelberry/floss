import { describe, expect, it } from "vitest"

import { clinicDate } from "@/lib/dates"

import {
  type ClockState,
  clinicMoment,
  clockTime,
  DAY_MOMENT_MIN,
  staleReason,
} from "./clock"

const MIN = 60_000
const at = (h: number, m = 0, day = 22) =>
  clinicDate(2026, 8, day, h, m).getTime()

/** A day opened at 7:30 when it was really 9:00 */
const opened: ClockState = {
  seededAt: at(9),
  clinicStart: at(7, 30),
  pausedAt: null,
}

describe("clockTime", () => {
  it("runs in real time from the moment it was set running", () => {
    expect(clockTime(opened, at(9))).toBe(at(7, 30))
    expect(clockTime(opened, at(9, 25))).toBe(at(7, 55))
  })
  it("stands still while paused: a seeded day is frozen", () => {
    const frozen = { ...opened, pausedAt: opened.seededAt }
    expect(clockTime(frozen, at(9))).toBe(at(7, 30))
    expect(clockTime(frozen, at(21, 40))).toBe(at(7, 30))
  })
})

describe("clinicMoment", () => {
  it("is the given minute of the real day", () => {
    expect(clinicMoment(at(21, 17), DAY_MOMENT_MIN)).toBe(at(11, 24))
    expect(clinicMoment(at(0, 5), 11 * 60)).toBe(at(11))
    expect(clinicMoment(at(12), 0) + 90 * MIN).toBe(at(1, 30))
  })
})

describe("staleReason", () => {
  const day = new Date(at(11))
  it("keeps today's day, however long it sits", () =>
    expect(staleReason(day, at(23, 59))).toBeNull())
  it("gives way to a fresh day on another date", () =>
    expect(staleReason(day, at(8, 0, 23))).toBe("a new day"))
})
