import { describe, expect, it } from "vitest"

import { DEMO_STAFF, staffTitle } from "./demo-account"

describe("DEMO_STAFF", () => {
  it("signs in as the practice manager", () => {
    expect(DEMO_STAFF.map((a) => a.email)).toEqual([
      "d.whitaker@larkspur.example",
    ])
  })
})

describe("staffTitle", () => {
  it("says what an account does, and nothing for an unknown one", () => {
    expect(staffTitle("d.whitaker@larkspur.example")).toBe("Practice manager")
    expect(staffTitle("nobody@clinic.example.com")).toBeUndefined()
  })
})
