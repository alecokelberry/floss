import { beforeAll, describe, expect, it } from "vitest"

import { ledgerSummary } from "@/lib/invoices"

import { NOW, seedPractice } from "../../../tests/clinic"
import type { getLedger } from "./payments"

describe("the seeded ledger, as Payments reads it", () => {
  let ledger: Awaited<ReturnType<typeof getLedger>>
  beforeAll(async () => {
    await seedPractice()
    ledger = await (await import("./payments")).getLedger()
  })

  it("raises an invoice for every billed visit, newest first", () => {
    expect(ledger.length).toMatchInlineSnapshot(`212`)
    expect(
      ledger
        .slice(0, 4)
        .map((i) => [
          i.number,
          `${i.lines[0].patient.firstName} ${i.lines[0].patient.lastName}`,
          i.amount,
          i.status,
        ])
    ).toMatchInlineSnapshot(`
      [
        [
          "INV-20260928-13",
          "Yuki Nakamura",
          135,
          "paid",
        ],
        [
          "INV-20260928-12",
          "Chiara Novello",
          150,
          "paid",
        ],
        [
          "INV-20260928-11",
          "Kwame Osei",
          1250,
          "paid",
        ],
        [
          "INV-20260928-10",
          "Declan Brennan",
          1250,
          "paid",
        ],
      ]
    `)
  })

  it("sums what's owed, overdue and collected", () => {
    const s = ledgerSummary(ledger, NOW)
    expect(s).toMatchInlineSnapshot(`
      {
        "collected": 79185,
        "collectedCount": 200,
        "current": 6355,
        "currentCount": 8,
        "oldestOverdue": 12,
        "outstanding": 7060,
        "overdue": 705,
        "overdueCount": 4,
        "raised": 212,
      }
    `)
    expect(s.outstanding).toBe(s.current + s.overdue)
    expect(s.overdueCount).toBeGreaterThan(0)
  })
})
