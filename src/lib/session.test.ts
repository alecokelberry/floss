// The real session check, unmocked: with no session cookie, `requireUser` sends the caller to sign in, and a
// server action stops there without touching the clinic. Every other spec mocks `@/lib/session`; this one
// proves the thing they mock.

import { beforeAll, describe, expect, it, vi } from "vitest"

/** Next's redirect, as a thrown error whose digest names where it goes */
const redirectedTo = (path: string) =>
  expect.objectContaining({
    digest: expect.stringMatching(new RegExp(`^NEXT_REDIRECT;[a-z]+;${path};`)),
  })

describe("requireUser, signed out", () => {
  beforeAll(() => {
    vi.resetModules()
    vi.doUnmock("@/lib/session")
    // A request with no cookies
    vi.doMock("next/headers", () => ({
      headers: async () => new Headers(),
      cookies: async () => ({ get: () => undefined, getAll: () => [] }),
    }))
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }))
  })

  it("sends a caller with no session to sign in", async () => {
    const { requireUser } = await import("./session")
    await expect(requireUser()).rejects.toEqual(redirectedTo("/sign-in"))
  })

  it("stops a server action before it reads or writes anything", async () => {
    const { markAllNotificationsRead } =
      await import("@/app/actions/notifications")
    await expect(markAllNotificationsRead()).rejects.toEqual(
      redirectedTo("/sign-in")
    )
    const { db } = await import("@/db")
    const { bookingEvents } = await import("@/db/schema")
    expect(await db.select().from(bookingEvents)).toEqual([])
  })
})
