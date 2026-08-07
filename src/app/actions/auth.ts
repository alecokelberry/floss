"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { authActionClient } from "@/lib/safe-action"

/**
 * Sign Out in one round trip: the session ends, its cookies clear through Next (`nextCookies`), and the sign-in page
 * comes back in the same response. A cleared cookie makes Next drop the whole client cache, so no page prefetched
 * while signed in can be shown again.
 */
export const signOut = authActionClient.action(async () => {
  await auth.api.signOut({ headers: await headers() })
  redirect("/sign-in")
})
