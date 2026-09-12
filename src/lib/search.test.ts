import { describe, expect, it } from "vitest"

import { type Hit, searchGroups } from "./search"

const hit = (kind: Hit["kind"], title: string, meta: string[] = []): Hit => ({
  kind,
  key: `${kind}-${title}`,
  title,
  meta,
  open: { href: "/dashboard" },
})

describe("search", () => {
  const hits = [
    ...Array.from({ length: 11 }, (_, i) =>
      hit("booking", `Samir Haddad ${i}`)
    ),
    hit("patient", "Samir Haddad", ["Active", "Dr. Ravi Menon"]),
    hit("clinician", "Dr. Amara Chen", ["Restorative"]),
    hit("page", "Calendar", ["Page"]),
    {
      ...hit("setting", "Chairs", ["Settings", "The columns the board runs."]),
      keywords: ["rooms"],
    },
  ]

  it("waits for two characters", () => {
    expect(searchGroups(hits, "s")).toEqual([])
  })

  it("groups in rail order and caps with a count", () => {
    expect(
      searchGroups(hits, "sam").map((g) => [g.label, g.hits.length])
    ).toEqual([
      ["Patients", 1],
      ["Bookings · 6 of 11", 6],
    ])
    expect(searchGroups(hits, "room").map((g) => g.label)).toEqual(["Go to"])
    expect(searchGroups(hits, "board").map((g) => g.label)).toEqual(["Go to"])
    expect(searchGroups(hits, "chen").map((g) => g.label)).toEqual([
      "Clinicians",
    ])
  })
})
