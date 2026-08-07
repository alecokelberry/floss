import { describe, expect, it } from "vitest"

import { safeNextPath } from "./redirect"

describe("safeNextPath", () => {
  it.each([
    ["/patients", "/patients"],
    ["/patients/44?tab=history", "/patients/44?tab=history"],
    [undefined, "/"],
    [["/flow", "/patients"], "/flow"],
  ])("%s goes to %s", (next, path) => expect(safeNextPath(next)).toBe(path))
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "/sign-in",
    "/sign-in?next=/patients",
    // Browsers drop tabs and newlines in URLs, so these read as //evil.example
    "/\t/evil.example",
    "/\n/evil.example",
    "/\r//evil.example",
  ])("refuses %s", (next) => expect(safeNextPath(next)).toBe("/"))
})
