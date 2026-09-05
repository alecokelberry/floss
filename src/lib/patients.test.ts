import { describe, expect, it } from "vitest"

import { clinicDate } from "@/lib/dates"

import {
  ago,
  directoryStats,
  messageInput,
  nextChart,
  patientInput,
  splitName,
} from "./patients"

const ok = {
  name: "Ada Okonkwo",
  chart: "PT-2501",
  phone: "",
  email: "",
  practitionerId: null,
  stage: "new",
  carrier: "",
  memberId: "",
}
const error = (patch: object) =>
  patientInput.safeParse({ ...ok, ...patch }).error?.issues[0]?.message

describe("patients", () => {
  it("checks the patient form as the desk writes it", () => {
    expect(patientInput.safeParse(ok).success).toBe(true)
    expect(error({ name: "" })).toBe("Give the patient a name.")
    expect(error({ chart: "" })).toBe("Every patient needs a chart number.")
    expect(error({ chart: "pt-2501" })).toBe("Use the PT-0000 format.")
    expect(error({ chart: "PT-2501 " })).toBeUndefined()
    for (const phone of ["1234567", "12 34 56 7", "+1 (555) 0100"])
      expect(error({ phone })).toBeUndefined()
    for (const phone of ["12345", "555-CALL-NOW"])
      expect(error({ phone })).toBe("Enter a reachable number.")
    for (const email of ["a@b.c", "A@B.CO"])
      expect(error({ email })).toBeUndefined()
    for (const email of ["a@b", "a b@c.com", "@b.com", "a@.com", "nope"])
      expect(error({ email })).toBe("Enter a valid email address.")
    expect(error({ carrier: "Delta Dental PPO" })).toBe(
      "Add the member ID from their card."
    )
    expect(
      error({ carrier: "Delta Dental PPO", memberId: "D104522318" })
    ).toBeUndefined()
    expect(error({ carrier: "Acme Dental" })).toBeDefined()
  })

  it("checks a message", () => {
    const m = (patch: object) =>
      messageInput.safeParse({
        to: "+1 (555) 0389",
        subject: "",
        body: "Hi",
        ...patch,
      }).error?.issues[0]?.message
    expect(m({})).toBeUndefined()
    expect(m({ to: "" })).toBe("Say who this is going to.")
    expect(m({ to: "tomorrow" })).toBe(
      "Enter a phone number or an email address."
    )
    expect(m({ body: " " })).toBe("Write something before sending.")
  })

  it("splits names and numbers the next chart", () => {
    expect(splitName("Wei Ling Tan")).toEqual({
      firstName: "Wei Ling",
      lastName: "Tan",
    })
    expect(nextChart(["PT-2041", "PT-2728"])).toBe("PT-3001")
    expect(nextChart(["PT-3001"])).toBe("PT-3002")
  })

  it("counts the stat cards and the time since", () => {
    const s = directoryStats([
      { upcoming: 6, unpaid: 0, stage: "active" },
      { upcoming: 0, unpaid: 1, stage: "in_chair" },
    ])
    expect(s).toMatchObject({
      patients: 2,
      upcoming: 6,
      upcomingShare: 50,
      inChair: 1,
      unpaid: 1,
    })
    const now = clinicDate(2026, 8, 28, 11, 24).getTime()
    expect(ago(clinicDate(2026, 8, 28, 11, 24), now)).toBe("Just now")
    expect(ago(clinicDate(2026, 8, 28, 10, 38), now)).toBe("46 min ago")
    expect(ago(clinicDate(2026, 8, 28, 9, 5), now)).toBe("2 hours ago")
  })
})
