// Treatment plans at the desk: each line's fee and what insurance is expected to pay on it, the plan's totals and the
// patient's share, and the practice's case acceptance (accepted value over everything decided).
import type { PlanItem, PlanStatus } from "@/db/schema"
import { insurancePays } from "@/lib/insurance"

type Catalog = readonly { id: string; code: string; name: string }[]

export type PlanLine = PlanItem & {
  code: string
  name: string
  /** What the carrier is expected to pay on this line */
  insurance: number
}

const cents = (n: number) => Math.round(n * 100) / 100

/** A plan's lines with their codes and names, and insurance's estimate on each */
export function planLines(
  items: readonly PlanItem[],
  catalog: Catalog,
  carrier: string | null
): PlanLine[] {
  return items.map((item) => {
    const p = catalog.find((c) => c.id === item.procedureId)
    const code = p?.code ?? ""
    return {
      ...item,
      code,
      name: p?.name ?? item.procedureId,
      insurance: code ? insurancePays(carrier, code, item.fee) : 0,
    }
  })
}

/** The plan's fee, insurance's estimate and what's left for the patient */
export function planTotals(lines: readonly PlanLine[]) {
  const fee = cents(lines.reduce((s, l) => s + l.fee, 0))
  const insurance = cents(lines.reduce((s, l) => s + l.insurance, 0))
  return { fee, insurance, patient: cents(fee - insurance) }
}

/** "#14", or "Full mouth" for a line on no one tooth */
export const toothLabel = (tooth: number | null) =>
  tooth === null ? "Full mouth" : `#${tooth}`

/** Universal numbering: 1 to 32 */
export const isTooth = (n: number) => Number.isInteger(n) && n >= 1 && n <= 32

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  proposed: "Proposed",
  accepted: "Accepted",
  declined: "Declined",
}

/** Case acceptance: the value accepted over the value decided, as a whole percent; null before anything is decided */
export function caseAcceptance(
  plans: readonly { status: PlanStatus; fee: number }[]
) {
  const decided = plans.filter((p) => p.status !== "proposed")
  const total = decided.reduce((s, p) => s + p.fee, 0)
  if (!total) return null
  const accepted = decided
    .filter((p) => p.status === "accepted")
    .reduce((s, p) => s + p.fee, 0)
  return Math.round((accepted / total) * 100)
}
