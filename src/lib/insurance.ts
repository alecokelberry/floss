// Dental benefits as the desk handles them: the carriers the practice bills, what a plan pays by kind of treatment
// (read from the CDT code), and whether a patient's benefits were checked recently enough to trust before a visit.
import { daysBetween, monthDay, parseDay } from "@/lib/dates"

/** The carriers on the practice's books; a patient without one pays for themselves */
export const CARRIERS = [
  "Delta Dental PPO",
  "Cigna Dental PPO",
  "MetLife PDP Plus",
  "Aetna Dental PPO",
  "Guardian DentalGuard",
  "UnitedHealthcare Dental",
] as const

/** Benefits checked this many days ago or fewer hold for a visit; older, the desk calls the carrier again */
const VERIFY_WINDOW_DAYS = 30

export type Coverage =
  | "Preventive"
  | "Basic"
  | "Major"
  | "Orthodontic"
  | "Cosmetic"

/**
 * The kind of treatment a CDT code is, which sets what a typical PPO pays: exams and cleanings are preventive, fillings,
 * endo, perio and extractions basic, crowns, prosthetics and implants major, D8 orthodontic, bleaching and veneers
 * cosmetic
 */
export function coverageOf(code: string): Coverage {
  const n = Number(code.slice(1))
  if (code === "D9972" || code === "D2962") return "Cosmetic"
  if (n < 2000) return "Preventive"
  if (n >= 2700 && n < 3000) return "Major"
  if (n >= 5000 && n < 7000) return "Major"
  if (n >= 8000 && n < 9000) return "Orthodontic"
  return "Basic"
}

/** The share of the fee a plan pays, by coverage: the familiar 100/80/50 */
const COVERAGE_SHARE: Record<Coverage, number> = {
  Preventive: 1,
  Basic: 0.8,
  Major: 0.5,
  Orthodontic: 0.5,
  Cosmetic: 0,
}

/** What insurance is expected to pay on a fee for a code, to the cent; nothing without a carrier */
export const insurancePays = (
  carrier: string | null,
  code: string,
  fee: number
) =>
  carrier ? Math.round(fee * COVERAGE_SHARE[coverageOf(code)] * 100) / 100 : 0

export type Verification =
  | { state: "self-pay" }
  | { state: "never" }
  | { state: "verified" | "stale"; on: Date; days: number }

/** Where a patient's benefits stand on `today`: checked within the window, checked too long ago, never, or no plan */
export function verification(
  p: { carrier: string | null; verifiedOn: string | null },
  today: Date
): Verification {
  if (!p.carrier) return { state: "self-pay" }
  const on = p.verifiedOn ? parseDay(p.verifiedOn) : null
  if (!on) return { state: "never" }
  const days = daysBetween(today, on)
  return {
    state: days <= VERIFY_WINDOW_DAYS ? "verified" : "stale",
    on,
    days,
  }
}

/** The line a sheet or list shows: "Verified Sep 12", "Checked Jul 2", "Not verified", "Self-pay" */
export function verificationLabel(v: Verification) {
  switch (v.state) {
    case "self-pay":
      return "Self-pay"
    case "never":
      return "Not verified"
    case "verified":
      return `Verified ${monthDay(v.on)}`
    case "stale":
      return `Checked ${monthDay(v.on)}`
  }
}

/** Whether the desk should call the carrier before the patient's next visit */
export const needsVerifying = (v: Verification) =>
  v.state === "never" || v.state === "stale"
