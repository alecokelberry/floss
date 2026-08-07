"use client"

import { ChevronRightIcon } from "lucide-react"
import type { Route } from "next"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Portrait } from "@/components/shared/avatars"
import { BrandMark } from "@/components/shared/brand-mark"
import { ThemeToggle } from "@/components/shell/theme-toggle"
import { FieldError } from "@/components/ui/field"
import { Frame, FramePanel } from "@/components/ui/frame"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth-client"
import { DEMO_PASSWORD, DEMO_STAFF } from "@/lib/demo-account"

type StaffId = (typeof DEMO_STAFF)[number]["id"]

/**
 * a Frame card centered on a grained surface, brand tile, title, then the one way in. Its
 * social row becomes the practice manager's card (shadcn Item, outline, as its "item-link" example: face, name, one
 * line, a chevron): one tap signs in, since the demo has a single account. Its email form, "Forgot password?" and "Sign up" are left out.
 */
export function SignInForm({ next }: { next: Route | null }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState<StaffId | null>(null)
  const [pending, startTransition] = useTransition()

  function signIn(
    credentials: { email: string; password: string },
    who: StaffId
  ) {
    setError(null)
    setSigningIn(who)
    startTransition(async () => {
      const { error: failed } = await authClient.signIn.email(credentials)
      if (failed) {
        setError(
          failed.status === 429
            ? "Too many tries. Wait a minute, then try again."
            : "That account couldn't sign in. Try again."
        )
        return
      }
      // Where they were headed, else straight to the Dashboard (not "/", which only redirects there). No
      // refresh: nothing from the app is cached yet (signing out drops the client cache).
      router.replace(next ?? "/dashboard")
    })
  }

  return (
    <div className="relative isolate flex min-h-svh flex-col bg-muted dark:bg-background">
      {/* Its grain: SVG noise over the surface, darker specks in light, lighter in dark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.22] mix-blend-multiply dark:opacity-[0.12] dark:mix-blend-screen dark:invert"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* The same toggle as the app's header, so the theme can be picked before signing in (D works here too). In the
          page's flow, not over it, so a phone's card never runs under it */}
      <div className="flex justify-end p-3 sm:p-4">
        <ThemeToggle />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 pb-8">
        <div className="flex w-full max-w-[28rem] flex-col gap-4">
          <Frame>
            <FramePanel className="p-9 sm:p-11">
              <div className="mb-9 flex flex-col items-center gap-5 pt-3 text-center">
                <BrandMark className="size-10 rounded-xl [&_svg]:size-5" />
                <div className="flex flex-col gap-1.5">
                  <h1 className="text-[28px] leading-[1.333] font-semibold tracking-display">
                    Floss
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    A dental front desk.
                  </p>
                </div>
              </div>

              <ItemGroup aria-label="Demo account" className="gap-2">
                {DEMO_STAFF.map((staff) => {
                  return (
                    <div role="listitem" key={staff.id}>
                      <Item
                        variant="outline"
                        className="flex-nowrap text-left hover:bg-muted disabled:opacity-50"
                        render={
                          <button
                            type="button"
                            aria-label={`Sign in as ${staff.name}`}
                            disabled={pending}
                            onClick={() =>
                              signIn(
                                { email: staff.email, password: DEMO_PASSWORD },
                                staff.id
                              )
                            }
                          />
                        }
                      >
                        <ItemMedia>
                          <Portrait
                            src={staff.photo}
                            name={staff.name}
                            size={32}
                          />
                        </ItemMedia>
                        <ItemContent className="min-w-0 gap-0">
                          <ItemTitle>{staff.name}</ItemTitle>
                          <ItemDescription>{staff.title}</ItemDescription>
                        </ItemContent>
                        <ItemActions className="shrink-0 text-muted-foreground">
                          {pending && signingIn === staff.id ? (
                            <Spinner />
                          ) : (
                            <ChevronRightIcon aria-hidden className="size-4" />
                          )}
                        </ItemActions>
                      </Item>
                    </div>
                  )
                })}
              </ItemGroup>
              {error && (
                <FieldError role="alert" className="mt-3">
                  {error}
                </FieldError>
              )}
            </FramePanel>
          </Frame>
        </div>
      </main>
    </div>
  )
}
