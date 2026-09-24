import { describe, expect, it } from "vitest"

import {
  caseAcceptance,
  isTooth,
  planLines,
  planTotals,
  toothLabel,
} from "./treatment"

const catalog = [
  { id: "root-canal", code: "D3330", name: "Root Canal" },
  { id: "crown", code: "D2740", name: "Crown" },
  { id: "whitening", code: "D9972", name: "Whitening" },
]
const items = [
  { procedureId: "root-canal", tooth: 14, fee: 1150 },
  { procedureId: "crown", tooth: 14, fee: 1250 },
  { procedureId: "whitening", tooth: null, fee: 450 },
]

describe("treatment plans", () => {
  it("prices each line and splits the plan between the carrier and the patient", () => {
    const lines = planLines(items, catalog, "Delta Dental PPO")
    expect(lines.map((l) => [l.code, l.insurance])).toEqual([
      ["D3330", 920],
      ["D2740", 625],
      ["D9972", 0],
    ])
    expect(planTotals(lines)).toEqual({
      fee: 2850,
      insurance: 1545,
      patient: 1305,
    })
  })

  it("leaves the whole fee to a self-pay patient", () => {
    const totals = planTotals(planLines(items, catalog, null))
    expect(totals).toEqual({ fee: 2850, insurance: 0, patient: 2850 })
  })

  it("names teeth by Universal number", () => {
    expect(toothLabel(14)).toBe("#14")
    expect(toothLabel(null)).toBe("Full mouth")
    expect(isTooth(32)).toBe(true)
    expect(isTooth(0)).toBe(false)
    expect(isTooth(33)).toBe(false)
  })

  it("counts case acceptance by value, over what's been decided", () => {
    expect(
      caseAcceptance([
        { status: "accepted", fee: 3000 },
        { status: "declined", fee: 1000 },
        { status: "proposed", fee: 9000 },
      ])
    ).toBe(75)
    expect(caseAcceptance([{ status: "proposed", fee: 500 }])).toBeNull()
  })
})
