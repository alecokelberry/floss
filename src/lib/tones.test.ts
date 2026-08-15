import { describe, expect, it } from "vitest"

import { BOOKING_STATUSES, CHAIR_COLORS, TASK_CATEGORIES } from "@/db/schema"

import { BOOKING_STATUS, CHAIR_COLOR, TASK_CATEGORY } from "./tones"

describe("tones", () => {
  it("colors every status, category and chair color", () => {
    for (const s of BOOKING_STATUSES)
      expect(BOOKING_STATUS[s].chip).toBeTruthy()
    for (const c of TASK_CATEGORIES) expect(TASK_CATEGORY[c].solid).toBeTruthy()
    expect(Object.keys(CHAIR_COLOR)).toEqual([...CHAIR_COLORS])
  })

  it("gives each booking status its own chip color", () => {
    const chips = BOOKING_STATUSES.map((s) => BOOKING_STATUS[s].chip)
    expect(new Set(chips).size).toBe(chips.length)
  })
})
