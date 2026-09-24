import { describe, expect, it } from "vitest"

import { clinicDate } from "@/lib/dates"

import {
  coverageOf,
  insurancePays,
  needsVerifying,
  verification,
  verificationLabel,
} from "./insurance"

const today = clinicDate(2026, 8, 30)

describe("coverage", () => {
  it("reads the kind of treatment from the CDT code", () => {
    expect(coverageOf("D0120")).toBe("Preventive")
    expect(coverageOf("D1110")).toBe("Preventive")
    expect(coverageOf("D2391")).toBe("Basic")
    expect(coverageOf("D2740")).toBe("Major")
    expect(coverageOf("D3330")).toBe("Basic")
    expect(coverageOf("D4341")).toBe("Basic")
    expect(coverageOf("D5110")).toBe("Major")
    expect(coverageOf("D6010")).toBe("Major")
    expect(coverageOf("D7140")).toBe("Basic")
    expect(coverageOf("D8670")).toBe("Orthodontic")
    expect(coverageOf("D9972")).toBe("Cosmetic")
    expect(coverageOf("D2962")).toBe("Cosmetic")
  })

  it("pays 100/80/50, nothing on cosmetic work or without a carrier", () => {
    expect(insurancePays("Delta Dental PPO", "D1110", 135)).toBe(135)
    expect(insurancePays("Delta Dental PPO", "D2391", 210)).toBe(168)
    expect(insurancePays("Delta Dental PPO", "D2740", 1250)).toBe(625)
    expect(insurancePays("Delta Dental PPO", "D9972", 450)).toBe(0)
    expect(insurancePays(null, "D1110", 135)).toBe(0)
  })
})

describe("verification", () => {
  const plan = { carrier: "Cigna Dental PPO" }

  it("trusts a check within 30 days, not an older one", () => {
    const fresh = verification({ ...plan, verifiedOn: "2026-09-12" }, today)
    expect(fresh).toMatchObject({ state: "verified", days: 18 })
    expect(verificationLabel(fresh)).toBe("Verified Sep 12")
    expect(needsVerifying(fresh)).toBe(false)

    const edge = verification({ ...plan, verifiedOn: "2026-08-31" }, today)
    expect(edge.state).toBe("verified")

    const stale = verification({ ...plan, verifiedOn: "2026-07-02" }, today)
    expect(stale.state).toBe("stale")
    expect(verificationLabel(stale)).toBe("Checked Jul 2")
    expect(needsVerifying(stale)).toBe(true)
  })

  it("asks for a first check, and leaves self-pay alone", () => {
    const never = verification({ ...plan, verifiedOn: null }, today)
    expect(verificationLabel(never)).toBe("Not verified")
    expect(needsVerifying(never)).toBe(true)

    const own = verification({ carrier: null, verifiedOn: null }, today)
    expect(verificationLabel(own)).toBe("Self-pay")
    expect(needsVerifying(own)).toBe(false)
  })
})
