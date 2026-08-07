import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SignInForm } from "@/components/auth/sign-in-form"
import { ensureFreshDay } from "@/db/demo-day"
import { safeNextPath } from "@/lib/redirect"
import { getSession } from "@/lib/session"

export const metadata: Metadata = { title: "Sign in" }

/**
 * Staff sign-in, after the shadcn auth blocks. Someone already signed in goes straight on to where they were headed, or to
 * their own day. The practice is seeded first if it isn't yet (a fresh database) or is from another day, so the
 * account the card signs in as always exists.
 */
export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const asked = (await searchParams).next
  const next = asked ? safeNextPath(asked) : null
  const [session] = await Promise.all([getSession(), ensureFreshDay()])
  if (session) redirect(next ?? "/dashboard")
  return <SignInForm next={next} />
}
