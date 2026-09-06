import { describe, expect, it } from "vitest"

import { clinicDate } from "@/lib/dates"

import {
  ageing,
  dueCell,
  invoicesFrom,
  ledgerSummary,
  money,
  moneyCents,
  nextNumber,
  wizardTotals,
} from "./invoices"

const today = clinicDate(2026, 8, 28, 11, 24)
let id = 0
const line = (
  d: number,
  seq: number,
  status: string,
  price: number,
  bill: string | null = null,
  month = 8
) => ({
  id: ++id,
  bill,
  seq,
  startsAt: clinicDate(2026, month, d, 9),
  status,
  fee: null,
  procedure: { name: `P${price}`, code: `D${price}`, price },
})

describe("invoices", () => {
  it("bills completed and unpaid bookings, numbered by the day's order", () => {
    const list = invoicesFrom(
      [
        line(28, 2, "unpaid", 850),
        line(28, 1, "completed", 90),
        line(28, 3, "booked", 120),
        line(27, 1, "completed", 90, "w1"),
        line(27, 2, "completed", 220, "w1"),
        line(3, 1, "unpaid", 90, null, 6),
      ],
      today
    )
    expect(list.map((i) => [i.number, i.amount, i.status])).toEqual([
      ["INV-20260928-2", 850, "open"],
      ["INV-20260928-1", 90, "paid"],
      ["INV-20260927-1", 310, "paid"],
      ["INV-20260703-1", 90, "past_due"],
    ])
    expect(list[2]!.treatment).toBe("P90, P220")
    expect(nextNumber(list, clinicDate(2026, 8, 28))).toBe("INV-20260928-3")
    // Net 7 ages the same bill sooner
    const net7 = invoicesFrom([line(3, 1, "unpaid", 90, null, 8)], today, 7)
    expect(net7[0]!.status).toBe("past_due")
  })

  it("words the due cell and the ageing", () => {
    const open = { status: "open" as const, due: clinicDate(2026, 9, 28) }
    const late = { status: "past_due" as const, due: clinicDate(2026, 7, 2) }
    expect(dueCell(open, today).top).toBe("Due in 30d")
    expect(dueCell(late, today).top).toBe("57d overdue")
    expect([ageing(open, today), ageing(late, today)]).toEqual([
      "Due in 30 days",
      "57 days past due",
    ])
  })

  it("sums the ledger", () => {
    const s = ledgerSummary(
      [
        { status: "paid", amount: 350, due: today },
        { status: "open", amount: 850, due: today },
        { status: "past_due", amount: 90, due: clinicDate(2026, 7, 2) },
      ],
      today
    )
    expect(s).toMatchObject({
      outstanding: 940,
      current: 850,
      overdue: 90,
      collected: 350,
      oldestOverdue: 57,
    })
  })

  it("writes money and the wizard's totals as the desk writes it", () => {
    expect([money(1880), money(117.9), money(33327.9)]).toEqual([
      "$1,880",
      "$117.90",
      "$33,327.90",
    ])
    expect(moneyCents(90)).toBe("$90.00")
    const t = wizardTotals(
      [{ procedureId: "scaling", qty: 1, rate: 120, tax: 8.25 }],
      10
    )
    expect([t.subtotal, t.discount, t.tax, t.total]).toEqual([
      120, 12, 9.9, 117.9,
    ])
    expect(t.fees).toEqual([117.9])
  })
})
