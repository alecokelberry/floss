import "server-only"
import { createSafeActionClient } from "next-safe-action"

import { requireUser } from "@/lib/session"

/**
 * Every server action starts from one of these clients: its input is parsed by its Zod schema before it runs, and an
 * unexpected error is logged and reaches the browser only as a generic line. Refusals the user should read (a room
 * that's taken, a chart number in use) come back as data, `{ ok: false, error }` (src/lib/action-result.ts).
 */
const actionClient = createSafeActionClient({
  handleServerError(error) {
    console.error(error)
    return "Something went wrong. Try again."
  },
})

/** For anything that reads or writes the practice: the action gets `ctx.user`, or the caller is sent to sign in */
export const authActionClient = actionClient.use(async ({ next }) =>
  next({ ctx: { user: await requireUser() } })
)
