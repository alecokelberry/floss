// Payments as a reading of the calendar: every Completed or Unpaid booking is
// billed, lines raised together in the New invoice wizard share a bill, and nothing about an invoice is stored but
// its fee. Numbers, due dates, standing and totals are all derived here.
import { addDays, compactDay, daysBetween, startOfDay } from "@/lib/dates"

type Line = {
  id: number
  bill: string | null
  seq: number
  startsAt: Date
  status: string
  fee: number | null
  procedure: { name: string; code: string; price: number }
}

export type InvoiceStatus = "paid" | "open" | "past_due"

export const INVOICE_STATUS: Record<InvoiceStatus, string> = {
  paid: "Paid",
  open: "Open",
  past_due: "Past due",
}

/** Invoices fall due this many days after they're issued unless Settings → Billing says otherwise */
const TERMS_DAYS = 30

const billed = (l: Line) => l.status === "completed" || l.status === "unpaid"
const lineAmount = (l: Line) => l.fee ?? l.procedure.price

/**
 * The ledger from a set of bookings: one invoice per bill (a lone booking is its own), numbered INV-yyyymmdd-n by its
 * first line's place among the day's bills in the day's booking order, due the practice's terms after it's issued (the
 * wizard's own Due Date and Payment Terms don't change it); newest first.
 */
export function invoicesFrom<L extends Line>(
  bookings: L[],
  today: Date,
  termsDays = TERMS_DAYS
) {
  const days = new Map<string, L[]>()
  for (const l of bookings.filter(billed)) {
    const day = compactDay(l.startsAt)
    days.set(day, [...(days.get(day) ?? []), l])
  }
  const out: Invoice<L>[] = []
  for (const [day, list] of days) {
    const bills = new Map<string, [L, ...L[]]>()
    for (const l of list.toSorted((a, b) => a.seq - b.seq)) {
      const key = l.bill ?? `b${l.id}`
      bills.set(key, [...(bills.get(key) ?? []), l] as [L, ...L[]])
    }
    ;[...bills.entries()].forEach(([key, lines], i) => {
      const issued = startOfDay(lines[0].startsAt)
      const due = addDays(issued, termsDays)
      const open = lines.some((l) => l.status === "unpaid")
      out.push({
        key,
        number: `INV-${day}-${i + 1}`,
        n: i + 1,
        issued,
        due,
        lines,
        amount: lines.reduce((t, l) => t + lineAmount(l), 0),
        treatment: lines.map((l) => l.procedure.name).join(", "),
        codes: lines.map((l) => l.procedure.code).join(", "),
        status: !open ? "paid" : due < startOfDay(today) ? "past_due" : "open",
      })
    })
  }
  return out.toSorted(
    (a, b) => b.issued.getTime() - a.issued.getTime() || b.n - a.n
  )
}
export type Invoice<L extends Line = Line> = {
  key: string
  number: string
  n: number
  issued: Date
  due: Date
  /** Never empty: a bill is its bookings */
  lines: [L, ...L[]]
  amount: number
  treatment: string
  /** The lines' CDT codes, as a claim lists them */
  codes: string
  status: InvoiceStatus
}

/** The Due cell's two lines: "Settled" over the day, "Due in 30d" or "57d overdue" over the due date */
export function dueCell(i: Pick<Invoice, "status" | "due">, today: Date) {
  const days = daysBetween(i.due, startOfDay(today))
  if (i.status === "paid") return { top: "Settled", tone: "muted" as const }
  if (i.status === "past_due")
    return { top: `${-days}d overdue`, tone: "overdue" as const }
  return { top: `Due in ${days}d`, tone: "due" as const }
}

/** The sheet's Ageing row: "Due in 30 days", "57 days past due" */
export function ageing(i: Pick<Invoice, "due">, today: Date) {
  const days = daysBetween(i.due, startOfDay(today))
  const n = Math.abs(days)
  const unit = n === 1 ? "day" : "days"
  return days >= 0 ? `Due in ${n} ${unit}` : `${n} ${unit} past due`
}

/** The summary card and the Activity footer: what's owed (current and overdue), what's collected */
export function ledgerSummary(
  invoices: Pick<Invoice, "status" | "amount" | "due">[],
  today: Date
) {
  const sum = (s: InvoiceStatus) =>
    invoices.filter((i) => i.status === s).reduce((t, i) => t + i.amount, 0)
  const count = (s: InvoiceStatus) =>
    invoices.filter((i) => i.status === s).length
  const overdue = invoices.filter((i) => i.status === "past_due")
  const oldest = overdue.length
    ? Math.max(...overdue.map((i) => daysBetween(startOfDay(today), i.due)))
    : 0
  return {
    raised: invoices.length,
    current: sum("open"),
    currentCount: count("open"),
    overdue: sum("past_due"),
    overdueCount: count("past_due"),
    collected: sum("paid"),
    collectedCount: count("paid"),
    outstanding: sum("open") + sum("past_due"),
    oldestOverdue: oldest,
  }
}

/** The next number on a day: after every bill already raised that day */
export function nextNumber(
  invoices: Pick<Invoice, "issued" | "n">[],
  day: Date
) {
  const on = invoices.filter(
    (i) => i.issued.getTime() === startOfDay(day).getTime()
  )
  return `INV-${compactDay(day)}-${on.length + 1}`
}

const dollars = (n: number, symbol: string, cents: boolean) =>
  `${n < 0 ? "-" : ""}${symbol}${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`

/** Dollars as the ledger writes them: whole ("$1,880") unless there are cents ("$117.90") */
export const money = (n: number, symbol = "$") =>
  dollars(n, symbol, Math.round(n * 100) % 100 !== 0)

/** Always with cents, as the wizard writes every amount ("$90.00") */
export const moneyCents = (n: number, symbol = "$") => dollars(n, symbol, true)

export type WizardLine = {
  procedureId: string
  qty: number
  rate: number
  tax: number
}

/**
 * The wizard's sums: tax on each line before the discount, total = subtotal - discount + tax; and each line's share of
 * the total, which becomes its booking's fee, so the bill adds up to the total to the cent.
 */
export function wizardTotals(lines: WizardLine[], discountPct: number) {
  const amounts = lines.map((l) => l.qty * l.rate)
  const subtotal = amounts.reduce((t, a) => t + a, 0)
  const tax = lines.reduce((t, l) => t + (l.qty * l.rate * l.tax) / 100, 0)
  const discount = (subtotal * discountPct) / 100
  const total = round2(subtotal - discount + tax)
  const fees = lines.map((l) => {
    const a = l.qty * l.rate
    return round2(a * (1 - discountPct / 100) + (a * l.tax) / 100)
  })
  // Put the rounding's cent on the last line
  const last = fees.at(-1)
  if (last !== undefined)
    fees[fees.length - 1] = round2(
      last + total - fees.reduce((t, f) => t + f, 0)
    )
  return {
    amounts,
    subtotal,
    tax: round2(tax),
    discount: round2(discount),
    total,
    fees,
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100
