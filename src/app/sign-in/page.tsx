import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SignInForm } from "@/components/auth/sign-in-form"
import { db } from "@/db"
import { ensureFreshDay } from "@/db/demo-day"
import { seedStaff } from "@/db/seed-staff"
import { safeNextPath } from "@/lib/redirect"
import { getSession } from "@/lib/session"

export const metadata: Metadata = { title: "Sign in" }

/**
 * Staff sign-in, after the shadcn auth blocks. Someone already signed in goes straight on to where they were headed, or to
 * their own day. The practice is seeded first if it isn't yet (a fresh database) or is from another day, and the
 * demo account is brought up to date (a deploy can change its email or password mid-day), so the card always signs in.
 */
export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const asked = (await searchParams).next
  const next = asked ? safeNextPath(asked) : null
  const [session] = await Promise.all([getSession(), ensureFreshDay()])
  if (!session) await seedStaff(db)
  if (session) redirect(next ?? "/dashboard")
  return <SignInForm next={next} />
}
