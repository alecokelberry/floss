import { beforeAll, describe, expect, it } from "vitest"

import { directoryStats } from "@/lib/patients"

import { seedPractice } from "../../../tests/clinic"
import type { getDirectory } from "./patients"

describe("the seeded directory, as Patients reads it", () => {
  let directory: Awaited<ReturnType<typeof getDirectory>>
  beforeAll(async () => {
    await seedPractice()
    directory = await (await import("./patients")).getDirectory()
  })

  it("counts a patient's bookings and names their next treatment", () => {
    const row = (chart: string) => {
      const p = directory.find((x) => x.chart === chart)!
      return [p.upcoming, p.unpaid, p.total, p.nextTreatment]
    }
    expect(row("PT-2204")).toMatchInlineSnapshot(`
      [
        3,
        0,
        6,
        "Exam & X-rays",
      ]
    `)
    expect(row("PT-2368")).toMatchInlineSnapshot(`
      [
        2,
        1,
        7,
        "Denture Fitting",
      ]
    `)
    expect(row("PT-2394")).toMatchInlineSnapshot(`
      [
        2,
        0,
        4,
        "Braces Adjustment",
      ]
    `)
  })

  it("gives the stat cards their numbers", () => {
    expect(directoryStats(directory)).toMatchInlineSnapshot(`
      {
        "inChair": 3,
        "inChairShare": 3,
        "patients": 117,
        "unpaid": 10,
        "unpaidShare": 9,
        "upcoming": 200,
        "upcomingShare": 76,
      }
    `)
  })
})
