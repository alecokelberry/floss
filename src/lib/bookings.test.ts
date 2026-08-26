import { describe, expect, it } from "vitest"

import { clinicDate } from "@/lib/dates"

import {
  atTime,
  bookingInput,
  changeLine,
  dayOf,
  hhmm,
  minutesOf,
  QUARTER_HOURS,
  TIME_OPTIONS,
  timeOf,
} from "./bookings"

const base = {
  patientId: 1,
  procedureId: "checkup",
  practitionerId: "chen",
  date: "2026-09-28",
  start: "09:00",
  end: "09:30",
  status: "booked",
  room: "Op 1",
  note: "",
}

describe("bookings", () => {
  it("offers every quarter hour and reads them back", () => {
    expect(QUARTER_HOURS).toHaveLength(96)
    expect(hhmm(QUARTER_HOURS[37]!)).toBe("09:15")
    expect(minutesOf("16:45")).toBe(16 * 60 + 45)
    expect(atTime("2026-09-28", "14:15")).toEqual(
      clinicDate(2026, 8, 28, 14, 15)
    )
  })

  it("asks for a patient and an end after the start", () => {
    expect(bookingInput.safeParse(base).success).toBe(true)
    const noPatient = bookingInput.safeParse({ ...base, patientId: undefined })
    expect(noPatient.error?.issues[0]?.message).toBe("Choose a patient.")
    const backwards = bookingInput.safeParse({ ...base, end: "08:45" })
    expect(backwards.error?.issues[0]?.path).toEqual(["end"])
  })

  it("logs a status first, then a move, and nothing for the rest", () => {
    const before = {
      practitionerId: "chen",
      startsAt: clinicDate(2026, 8, 28, 9),
      endsAt: clinicDate(2026, 8, 28, 9, 30),
      status: "booked" as const,
    }
    expect(changeLine(before, { ...before, status: "completed" })).toEqual({
      kind: "status",
      detail: "Marked Completed",
    })
    expect(
      changeLine(before, {
        ...before,
        startsAt: clinicDate(2026, 8, 28, 10, 45),
        endsAt: clinicDate(2026, 8, 28, 11, 15),
      })
    ).toEqual({ kind: "rescheduled", detail: "Moved to 10:45 AM" })
    expect(changeLine(before, { ...before })).toBeNull()
  })
})

describe("the time lists", () => {
  it("offers every quarter hour as the form shows it", () => {
    expect(TIME_OPTIONS).toHaveLength(96)
    expect(TIME_OPTIONS[34]).toEqual({ value: "08:30", label: "08:30 AM" })
    expect(TIME_OPTIONS.at(-1)).toEqual({ value: "23:45", label: "11:45 PM" })
  })

  it("reads a Date's time of day and a day's midnight", () => {
    expect(timeOf(clinicDate(2026, 8, 28, 14, 15))).toBe("14:15")
    expect(dayOf("2026-09-28")).toEqual(clinicDate(2026, 8, 28))
  })
})
