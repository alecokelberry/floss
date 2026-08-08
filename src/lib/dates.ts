// Every date the app shows or reckons with, in one place: the practice's own wall clock (America/Denver), whatever zone
// the server (UTC on Vercel) or the visitor's browser runs in. Nothing else imports date-fns or reads a Date's local getters (`pnpm dod` checks).
import { TZDate, tz } from "@date-fns/tz"
import * as fns from "date-fns"
import { enGB } from "date-fns/locale"

type When = Date | number

/** The practice's time zone: its day, its opening hours and every time on screen */
export const CLINIC_TZ = "America/Denver"
const inClinic = { in: tz(CLINIC_TZ) }

/** A moment on the clinic's wall clock, for reading its parts here; everything exported hands back a plain Date */
const zoned = (d: When) => new TZDate(+d, CLINIC_TZ)
/** A plain Date for the same moment: a TZDate would print its offset into SQL and props */
const plain = (d: Date) => new Date(d.getTime())

/** A wall-clock time at the practice (month from 0, as `Date` counts) */
export const clinicDate = (
  y: number,
  month: number,
  day = 1,
  h = 0,
  m = 0
): Date => plain(new TZDate(y, month, day, h, m, CLINIC_TZ))

/** Midnight at the practice, on the day of `d` */
export const startOfDay = (d: When): Date => plain(fns.startOfDay(d, inClinic))
/** The last millisecond of the practice's day */
export const endOfDay = (d: When): Date => plain(fns.endOfDay(d, inClinic))
/** The same wall-clock time `n` days on (23 or 25 hours across a DST change) */
export const addDays = (d: When, n: number): Date =>
  plain(fns.addDays(d, n, inClinic))
/** Minutes later, on any clock */
export const addMinutes = (d: When, n: number): Date => fns.addMinutes(d, n)
export const isSameDay = (a: When, b: When) => fns.isSameDay(a, b, inClinic)
/** Whole days from `b`'s date to `a`'s, on the practice's calendar */
export const daysBetween = (a: When, b: When) =>
  fns.differenceInCalendarDays(a, b, inClinic)
/** The start of the week holding `d`: Sunday (0) or Monday (1) */
export const startOfWeek = (d: When, weekStartsOn: 0 | 1): Date =>
  plain(fns.startOfWeek(d, { ...inClinic, weekStartsOn }))
export const addMonths = (d: When, n: number): Date =>
  plain(fns.addMonths(d, n, inClinic))
export const isSameMonth = (a: When, b: When) => fns.isSameMonth(a, b, inClinic)
export const startOfMonth = (d: When): Date =>
  plain(fns.startOfMonth(d, inClinic))
export const endOfMonth = (d: When): Date => plain(fns.endOfMonth(d, inClinic))

/** Minutes after the practice's midnight: 8:30 AM is 510 */
export const minuteOfDay = (d: When) => {
  const z = zoned(d)
  return z.getHours() * 60 + z.getMinutes()
}
/** The weekday at the practice, 0 for Sunday, as `Date.getDay()` counts */
export const weekday = (d: When) => zoned(d).getDay()
/** `minutes` after midnight on the day of `d`, on the practice's wall clock */
export function atMinute(d: When, minutes: number): Date {
  const z = zoned(d)
  return clinicDate(
    z.getFullYear(),
    z.getMonth(),
    z.getDate(),
    Math.floor(minutes / 60),
    minutes % 60
  )
}
/** Midnight of a "yyyy-MM-dd" day at the practice; null when it isn't one */
export function parseDay(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number)
  const date = clinicDate(y, m - 1, d)
  return Number.isNaN(date.getTime()) || isoDay(date) !== iso ? null : date
}

const format = (d: When, pattern: string, options?: { locale?: fns.Locale }) =>
  fns.format(d, pattern, { ...options, ...inClinic })

/** "11:24 AM" */
export const clock = (d: When) => format(d, "h:mm a")

/** "08:30 AM", the booking form's time selects */
export const clockPadded = (d: When) => format(d, "hh:mm a")

/** "11:00 AM - 12:00 PM", or with " to " between */
export const timeRange = (from: When, to: When, joiner = " - ") =>
  `${clock(from)}${joiner}${clock(to)}`

/** "Monday, September 28" */
export const weekdayDate = (d: When) => format(d, "EEEE, MMMM d")

/** "Wednesday, Sep 30": a day heading in the Appointments agenda */
export const weekdayMonthDay = (d: When) => format(d, "EEEE, MMM d")

/** "September 2026" */
export const monthYear = (d: When) => format(d, "MMMM yyyy")

/** "Sep 28" */
export const monthDay = (d: When) => format(d, "MMM d")
/** "Sep 12" in `today`'s year, "Jan 22, 2025" in any other */
export const shortDay = (d: When, today: When) =>
  format(
    d,
    format(d, "yyyy") === format(today, "yyyy") ? "MMM d" : "MMM d, yyyy"
  )

/** "28 Sep" */
export const dayMonth = (d: When) => format(d, "d MMM")

/** "17 Sep 2026" */
export const dayMonthYear = (d: When) => format(d, "d MMM yyyy")

/** "September 28th, 2026", the date pickers' trigger */
export const longDate = (d: When) => format(d, "PPP")

/** "September 28, 2026" */
export const fullDate = (d: When) => format(d, "MMMM d, yyyy")

/** British short months as the browser writes them: September is "Sept" */
const britishMonth = (text: string, d: When) =>
  zoned(d).getMonth() === 8 ? text.replace("Sep", "Sept") : text

/** "28 Sept, 8:00 am", Search's trailing stamp (British short month, lower-case meridiem) */
export const searchStamp = (d: When) =>
  britishMonth(format(d, "d MMM, h:mm aaa", { locale: enGB }), d)

/** "Monday 28 Sept", Search's group for the day */
export const searchDay = (d: When) =>
  britishMonth(format(d, "EEEE d MMM", { locale: enGB }), d)

/** "Sep 27, 2026", "Jul 03, 2026": the New invoice wizard's dates */
export const paddedDate = (d: When) => format(d, "MMM dd, yyyy")

/** "20260928": the day in an invoice number */
export const compactDay = (d: When) => format(d, "yyyyMMdd")

/** "yyyy-MM-dd", a day's key */
export const isoDay = (d: When) => format(d, "yyyy-MM-dd")

/** A week's range for a page title: "Sep 27 - Oct 3, 2026", or "September 20 - 26, 2026" within one month */
export function weekRange(from: When, to: When) {
  const a = zoned(from)
  const b = zoned(to)
  return a.getMonth() === b.getMonth()
    ? `${format(a, "MMMM d")} - ${format(b, "d, yyyy")}`
    : `${format(a, "MMM d")} - ${format(b, "MMM d, yyyy")}`
}

/** "September 28" */
export const monthDayLong = (d: When) => format(d, "MMMM d")

/** A week without its year: "Sep 28 - Oct 4", or "September 21 - 27" within one month */
export function weekSpan(from: When, to: When) {
  const a = zoned(from)
  const b = zoned(to)
  return a.getMonth() === b.getMonth()
    ? `${format(a, "MMMM d")} - ${format(b, "d")}`
    : `${format(a, "MMM d")} - ${format(b, "MMM d")}`
}

/** "30m", "1h", "1h 30m" */
export function duration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}
