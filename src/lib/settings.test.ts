import { describe, expect, it } from "vitest"

import {
  checkSetting,
  closingHours,
  DEFAULT_SETTINGS,
  hourLabel,
  openingHours,
  readPrice,
  readSettings,
  readTab,
  withOpening,
} from "./settings"

describe("readSettings", () => {
  it("reads stored values and falls back to the default for a missing or broken one", () => {
    const s = readSettings([
      { key: "hours", value: { open: 9, close: 17 } },
      { key: "terms", value: 12 },
    ])
    expect(s.hours).toEqual({ open: 9, close: 17 })
    expect(s.terms).toBe(DEFAULT_SETTINGS.terms)
    expect(s.alerts).toEqual(DEFAULT_SETTINGS.alerts)
  })
})

describe("checkSetting", () => {
  it("keeps the day from inverting and terms to the offered ones", () => {
    expect(checkSetting("hours", { open: 10, close: 9 })).toBeNull()
    expect(checkSetting("hours", { open: 8, close: 19 })).toEqual({
      open: 8,
      close: 19,
    })
    expect(checkSetting("terms", 45)).toBe(45)
    expect(checkSetting("terms", 20)).toBeNull()
  })
})

describe("the Settings page's rules", () => {
  it("reads the tab from a link", () => {
    expect([readTab("billing"), readTab("nope"), readTab(undefined)]).toEqual([
      "billing",
      "profile",
      "profile",
    ])
  })

  it("writes and offers the hours as the desk expects", () => {
    expect([hourLabel(0), hourLabel(8), hourLabel(12), hourLabel(19)]).toEqual([
      "12:00 am",
      "8:00 am",
      "12:00 pm",
      "7:00 pm",
    ])
    expect(openingHours.at(-1)).toBe(22)
    expect(closingHours(10)[0]).toBe(11)
    expect(closingHours(10).at(-1)).toBe(23)
    expect(withOpening({ open: 8, close: 19 }, 20)).toEqual({
      open: 20,
      close: 21,
    })
    expect(withOpening({ open: 8, close: 19 }, 9)).toEqual({
      open: 9,
      close: 19,
    })
  })

  it("checks a price", () => {
    expect(readPrice(" 300 ")).toEqual({ price: 300 })
    expect(readPrice("12.5")).toEqual({ price: 12.5 })
    expect(readPrice("")).toEqual({ error: "Enter a price." })
    expect(readPrice("1,200")).toEqual({ error: "Prices are numbers." })
    expect(readPrice("-5")).toEqual({ error: "A price cannot be negative." })
  })
})
