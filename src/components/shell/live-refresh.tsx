"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * The page is busy under someone's hands: a dialog, menu or popover is open, or a card is being dragged. An open sheet
 * isn't: the page behind it refreshes, and anything typed in it survives.
 */
const BUSY =
  "[role=dialog][data-open]:not([data-slot=sheet-content]), [data-dragging=true]"
const busy = () => Boolean(document.querySelector(BUSY))

/**
 * Keeps staff pages current without a reload. Every `seconds`, while the tab is visible, it asks the server
 * whether anything was written (`/api/clinic/version`, a stamp, not data) and re-renders the server components
 * only when it moved: a move in another tab shows within a few seconds, and
 * nothing re-renders while the clinic is quiet. A change that lands while a form dialog is open or a card is
 * dragged waits until it closes. Client state (open panels, filters, typed text) survives a refresh.
 */
export function LiveRefresh({ seconds = 4 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    let seen: string | null = null
    let stale = false
    let inFlight = false
    const tick = async () => {
      if (document.visibilityState !== "visible" || inFlight) return
      inFlight = true
      try {
        const res = await fetch("/api/clinic/version", { cache: "no-store" })
        if (res.ok) {
          const { version } = (await res.json()) as { version: string }
          if (seen !== null && version !== seen) stale = true
          seen = version
        }
      } catch {
        // Offline for a moment: try again next tick
      } finally {
        inFlight = false
      }
      if (stale && !busy()) {
        stale = false
        router.refresh()
      }
    }
    void tick()
    const id = setInterval(() => void tick(), seconds * 1000)
    // Catch up as soon as someone comes back to the tab
    const onVisible = () =>
      document.visibilityState === "visible" && void tick()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [router, seconds])
  return null
}
