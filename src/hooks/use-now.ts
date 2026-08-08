import { useSyncExternalStore } from "react"

import { usePractice } from "@/components/shell/practice"
import { clockTime } from "@/lib/clock"

/** How often a running clock redraws what reads it: waits are shown in minutes */
const TICK_MS = 10_000

const listeners = new Set<() => void>()
let ticks = 0
let timer: ReturnType<typeof setInterval> | null = null

function subscribe(listener: () => void) {
  listeners.add(listener)
  timer ??= setInterval(() => {
    ticks += 1
    for (const l of listeners) l()
  }, TICK_MS)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

/**
 * The clinic's current time in ms (src/lib/clock.ts), running: the server's render and the hydrating one read the
 * moment the page was rendered, so they match; after that it runs on from the clock the layout read, every 10
 * seconds (paused, it stands still).
 */
export function useNow(): number {
  const { clock, renderedAt } = usePractice()
  const tick = useSyncExternalStore(
    subscribe,
    () => ticks,
    () => -1
  )
  return tick === -1 ? renderedAt : clockTime(clock)
}
