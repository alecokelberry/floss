import { describe, expect, it } from "vitest"

import { outcome, refuse } from "./action-result"

describe("outcome", () => {
  it("passes an action's own result through", () => {
    expect(outcome({ data: { ok: true, message: "Saved" } })).toEqual({
      ok: true,
      message: "Saved",
    })
    expect(outcome({ data: refuse("That booking is gone.") })).toEqual({
      ok: false,
      error: "That booking is gone.",
    })
  })

  it("reads the first field that failed validation, however deep", () => {
    expect(
      outcome({
        validationErrors: {
          _errors: [],
          input: {
            _errors: [],
            title: { _errors: ["Give it a title."] },
            to: { _errors: ["End must be after start."] },
          },
        },
      })
    ).toEqual({ ok: false, error: "Give it a title." })
  })

  it("falls back to the server's line, then a generic one", () => {
    expect(
      outcome({ serverError: "Something went wrong. Try again." })
    ).toEqual({ ok: false, error: "Something went wrong. Try again." })
    expect(outcome(undefined)).toEqual({
      ok: false,
      error: "Something went wrong. Try again.",
    })
  })
})
