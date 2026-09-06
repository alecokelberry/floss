import { describe, expect, it } from "vitest"

import { clinicDate } from "@/lib/dates"

import {
  BOARD_STATE,
  CHIP_PHRASE,
  clinicianId,
  clinicianInput,
  loadRows,
  nextStart,
} from "./staff"

const at = (h: number, m = 0) => clinicDate(2026, 8, 28, h, m)
const visit = (practitionerId: string, from: number, mins: number) => ({
  practitionerId,
  startsAt: at(from),
  endsAt: new Date(at(from).getTime() + mins * 60_000),
})
const roster = [
  { id: "chen", name: "Dr. Amara Chen", specialty: "Restorative" },
  { id: "menon", name: "Dr. Ravi Menon", specialty: "Endodontics" },
  { id: "weber", name: "Dr. Noah Weber", specialty: "Periodontics" },
  { id: "duarte", name: "Dr. Ines Duarte", specialty: "Prosthodontics" },
]
const ok = {
  name: "Dr. Test Person",
  specialty: "Testing",
  qualification: "",
  phone: "",
  joinedOn: "",
  email: "",
  photoUrl: "",
}
const error = (patch: object) =>
  clinicianInput.safeParse({ ...ok, ...patch }).error?.issues[0]?.message

describe("staff", () => {
  it("folds six statuses into the board's four and words the chips", () => {
    expect([BOARD_STATE.cancelled, BOARD_STATE.arrived]).toEqual([
      "done",
      "in_chair",
    ])
    expect(CHIP_PHRASE.booked).toBe("Due in")
  })

  it("starts Add visit where the lane's day ends", () => {
    expect(
      nextStart([visit("chen", 9, 30), visit("chen", 11, 60)], at(8))
    ).toEqual(at(12))
    expect(nextStart([], at(8))).toEqual(at(8))
  })

  it("orders the Load panel as the desk expects", () => {
    const load = loadRows(
      roster,
      [visit("chen", 9, 210), visit("menon", 9, 225)],
      [visit("chen", 9, 30)]
    )
    expect(
      load.floor.map((r) => [r.chair.id, r.minutes, r.today, r.tomorrow])
    ).toEqual([
      ["menon", 225, 1, 0],
      ["chen", 210, 1, 1],
    ])
    expect(load.floor[1]!.share).toBeCloseTo(210 / 225)
    expect(load.off.map((r) => r.chair.id)).toEqual(["duarte", "weber"])
    expect(load.booked).toBe(435)
  })

  it("checks the clinician form", () => {
    expect(clinicianInput.safeParse(ok).success).toBe(true)
    expect(error({ name: "" })).toBe("Give the clinician a name.")
    expect(error({ specialty: "" })).toBe("Say what they practise.")
    expect(error({ joinedOn: "2024-5-6" })).toBe("Use the YYYY-MM-DD format.")
    expect(error({ joinedOn: "2024-13-01" })).toBe("That is not a real date.")
    expect(error({ joinedOn: "2024-02-30" })).toBeUndefined()
    expect(error({ joinedOn: "2999-01-01" })).toBe(
      "Nobody joins in the future."
    )
    expect(error({ photoUrl: "photo.jpg" })).toBe(
      "Enter a full image URL, or leave it empty for initials."
    )
    expect(clinicianId("Dr. Test Person", ["person"])).toBe("person-2")
  })
})
