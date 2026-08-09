import { describe, expect, it } from "vitest"

import { getNavItem, PAGES, RAIL } from "./nav"

describe("RAIL", () => {
  it("runs in order, Settings after", () => {
    expect(RAIL.map((p) => p.label)).toEqual([
      "Dashboard",
      "Calendar",
      "Appointments",
      "Patients",
      "Staff",
      "Payments",
    ])
    expect(PAGES.at(-1)?.label).toBe("Settings")
  })
})

describe("getNavItem", () => {
  it("lights the page a path belongs to", () => {
    expect(getNavItem("/dashboard")?.label).toBe("Dashboard")
    expect(getNavItem("/patients/12")?.label).toBe("Patients")
    expect(getNavItem("/settings")?.panel).toBe("Configuration")
    expect(getNavItem("/sign-in")).toBeUndefined()
    expect(getNavItem("/calendarx")).toBeUndefined()
  })
})
