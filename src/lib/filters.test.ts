import { describe, expect, it } from "vitest"

import { matchRule, matchValues, ruleReady } from "./filters"

describe("filters", () => {
  it("matches a text or a select", () => {
    expect(matchRule("Elsa Lindqvist", "contains", "lind")).toBe(true)
    expect(matchRule("Elsa Lindqvist", "contains", "lind", true)).toBe(false)
    expect(matchRule("Mateo Santos", "starts_with", "ma")).toBe(true)
    expect(matchRule("menon", "is_any_of", ["menon", "novak"])).toBe(true)
    expect(matchRule("", "empty", undefined)).toBe(true)
  })

  it("matches a row holding several values", () => {
    const treatments = ["checkup", "extraction"]
    expect(matchValues(treatments, "has_any_of", ["extraction", "crown"])).toBe(
      true
    )
    expect(matchValues(treatments, "has_all_of", ["extraction", "crown"])).toBe(
      false
    )
    expect(matchValues(treatments, "has_none_of", ["crown"])).toBe(true)
  })

  it("waits for a value unless the operator needs none", () => {
    expect([ruleReady("contains", ""), ruleReady("empty", undefined)]).toEqual([
      false,
      true,
    ])
    expect(ruleReady("has_any_of", ["paid"])).toBe(true)
  })
})
