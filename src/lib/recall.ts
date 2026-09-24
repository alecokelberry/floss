// Hygiene recall: when each patient is due back for a cleaning (their last hygiene visit plus their interval), and
// where they stand: booked already, overdue, due within the month, or not due yet.
import { addDays, addMonths, daysBetween, parseDay } from "@/lib/dates"

/** The visits that reset a patient's recall */
const HYGIENE_PROCEDURES = ["scaling", "perio-maint"] as const

export const isHygiene = (procedureId: string) =>
  (HYGIENE_PROCEDURES as readonly string[]).includes(procedureId)

/** Patients due within this many days make the list */
const RECALL_WINDOW_DAYS = 30

export type RecallStatus = "scheduled" | "overdue" | "due" | "current"

export const RECALL_STATUS_LABEL: Record<RecallStatus, string> = {
  scheduled: "Scheduled",
  overdue: "Overdue",
  due: "Due soon",
  current: "Current",
}

/** When they're next due: the last hygiene visit plus the interval; null for someone who's never had one here */
export function recallDue(p: {
  lastHygieneOn: string | null
  recallMonths: number
}) {
  const last = p.lastHygieneOn ? parseDay(p.lastHygieneOn) : null
  return last ? addMonths(last, p.recallMonths) : null
}

/** Where a patient stands on `today`, given the start of their next booked hygiene visit, if any */
export function recallStatus(
  due: Date,
  nextHygiene: Date | null,
  today: Date
): RecallStatus {
  if (nextHygiene) return "scheduled"
  if (daysBetween(due, today) < 0) return "overdue"
  if (due <= addDays(today, RECALL_WINDOW_DAYS)) return "due"
  return "current"
}

/** "3 mo" or "6 mo", the interval's column */
export const intervalLabel = (months: number) => `${months} mo`
