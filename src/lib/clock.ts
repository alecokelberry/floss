// The clinic's clock, as the demo keeps one: the practice's data is written for late morning, so a seeded
// day starts at 11:24 and runs in real time from there. One row
// (`demoDay`) holds the moment it was set at, the real time it was, and an optional pause. The server reads it per
// request (src/db/clock.ts), the browser from the app layout (src/hooks/use-now.ts). A day seeded on another date
// gives way to a fresh one (`staleReason`).
import { atMinute, isSameDay } from "@/lib/dates"

/** Where a seeded day starts, in minutes after midnight: 11:24, late morning */
export const DAY_MOMENT_MIN = 11 * 60 + 24

export type ClockState = {
  /** Real time the clock was last set running */
  seededAt: number
  /** The clinic moment at `seededAt` */
  clinicStart: number
  /** Real time it was paused, while it is */
  pausedAt: number | null
}

/** The clinic's time in ms at real time `real`: the moment it was set running, plus the real time since (or until the pause) */
export function clockTime(clock: ClockState, real: number = Date.now()) {
  return clock.clinicStart + ((clock.pausedAt ?? real) - clock.seededAt)
}

/** A clinic moment on the day of `real`, `minutes` after midnight: what a seed draws the day around */
export function clinicMoment(real: number, minutes: number) {
  return atMinute(real, minutes).getTime()
}

/** Why the seeded day should give way to a fresh one (it's from another date), or null while it's today's */
export function staleReason(clinicStart: Date, real: number) {
  return isSameDay(clinicStart, real) ? null : "a new day"
}
