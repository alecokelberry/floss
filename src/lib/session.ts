// The session, checked where the data is (Next's data access layer pattern): every query and server action that
// touches the practice calls `requireUser` (actions through `authActionClient`, src/lib/safe-action.ts), so a missing
// or expired session never reads or writes practice data, even if a page slipped past the proxy's cookie check.
// `cache` makes it one lookup per request. Every signed-in account may do everything: there are no roles.
import "server-only"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

import { auth } from "@/lib/auth"

/** The signed-in session, or null */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
)

export type User = NonNullable<Awaited<ReturnType<typeof getSession>>>["user"]

/** The signed-in user; anyone else is sent to sign in */
export async function requireUser(): Promise<User> {
  const session = await getSession()
  if (!session) redirect("/sign-in")
  return session.user
}
