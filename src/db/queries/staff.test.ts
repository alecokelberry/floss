import { beforeAll, describe, expect, it } from "vitest"

import { loadRows } from "@/lib/staff"

import { seedPractice } from "../../../tests/clinic"
import type { getPractitioners } from "./shell"
import type { getStaffDay } from "./staff"

describe("the seeded day, as Staff reads it", () => {
  let day: Awaited<ReturnType<typeof getStaffDay>>
  let roster: Awaited<ReturnType<typeof getPractitioners>>
  beforeAll(async () => {
    await seedPractice()
    day = await (await import("./staff")).getStaffDay()
    roster = await (await import("./shell")).getPractitioners()
  })

  it("holds every clinician's diary", () => {
    expect(day.diary).toMatchInlineSnapshot(`
      {
        "chen": 148,
        "duarte": 48,
        "falk": 18,
        "menon": 28,
        "novak": 61,
        "raman": 30,
        "reyes": 17,
        "sato": 58,
        "weber": 26,
      }
    `)
  })

  it("gives the Load panel today's rows, busiest first", () => {
    const load = loadRows(roster, day.visits, day.tomorrow)
    expect(load.floor.map((r) => [r.chair.id, r.minutes, r.today, r.tomorrow]))
      .toMatchInlineSnapshot(`
      [
        [
          "chen",
          330,
          8,
          4,
        ],
        [
          "menon",
          270,
          3,
          1,
        ],
        [
          "sato",
          270,
          6,
          1,
        ],
        [
          "reyes",
          210,
          3,
          0,
        ],
        [
          "duarte",
          180,
          3,
          0,
        ],
        [
          "novak",
          135,
          4,
          0,
        ],
      ]
    `)
    expect(load.off.map((r) => r.chair.id)).toMatchInlineSnapshot(`
      [
        "falk",
        "weber",
        "raman",
      ]
    `)
    expect(load.booked).toMatchInlineSnapshot(`1395`)
  })
})
