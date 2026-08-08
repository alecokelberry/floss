import { describe, expect, it } from "vitest"

import { initialsOf, patientPhoto, teamPhoto } from "./portraits"

describe("portraits", () => {
  it("finds a seeded patient's face and leaves a new one to initials", () => {
    expect(patientPhoto("PT-2041")).toBe("/avatars/patients/2041.jpg")
    expect(patientPhoto("PT-2728")).toBe("/avatars/patients/2728.jpg")
    expect(patientPhoto("PT-3001")).toBeUndefined()
  })

  it("finds the planner's people by name", () => {
    expect(teamPhoto("Dr. Tomas Reyes")).toBe(
      "/avatars/practitioners/reyes.jpg"
    )
    expect(teamPhoto("Hana Sato")).toBe("/avatars/practitioners/sato.jpg")
    expect(teamPhoto("Dana Whitaker")).toBe("/avatars/staff/dana.jpg")
  })

  it("takes initials from the first and last word, past the title", () => {
    expect(initialsOf("Dr. Amara Chen")).toBe("AC")
    expect(initialsOf("Wei Ling Tan")).toBe("WT")
    expect(initialsOf("Dana")).toBe("D")
  })
})
