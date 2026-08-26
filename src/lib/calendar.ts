// The Calendar's place: which day and view it shows, kept in the URL so the
// page, its Chairs panel and a reload agree; its title; and the counts it prints.
import type { Route } from "next"

import type { BookingStatus } from "@/db/schema"
import {
  addDays,
  atMinute,
  isoDay,
  monthDayLong,
  monthYear,
  parseDay,
  startOfDay,
  startOfWeek,
  weekRange,
  weekSpan,
} from "@/lib/dates"

export type CalendarView = "day" | "week"

/** `?date=2026-09-29&view=week` read against today; anything unreadable falls back to today's Day view */
export function readCalendarParams(
  params: { date?: string | string[]; view?: string | string[] },
  today: Date
): { date: Date; view: CalendarView } {
  const raw = typeof params.date === "string" ? params.date : ""
  const date = parseDay(raw) ?? startOfDay(today)
  return { date, view: params.view === "week" ? "week" : "day" }
}

/** A page's URL for a day and view: today and the page's own default view are left out */
function viewHref(
  page: "/calendar" | "/appointments",
  date: Date,
  view: string,
  defaultView: string,
  today: Date
): Route {
  const params = new URLSearchParams()
  if (isoDay(date) !== isoDay(today)) params.set("date", isoDay(date))
  if (view !== defaultView) params.set("view", view)
  const query = params.toString()
  return `${page}${query ? `?${query}` : ""}` as Route
}

/** The Calendar's URL for a day and view; today's Day view is the bare page */
export const calendarHref = (date: Date, view: CalendarView, today: Date) =>
  viewHref("/calendar", date, view, "day", today)

/** The Sunday its week starts on, and the seven days the page loads around a day */
export const weekOf = (date: Date) => startOfWeek(date, 0)

/** The header's title: the month in the Day view, the week's range in the Week view */
export function calendarTitle(date: Date, view: CalendarView) {
  if (view === "day") return monthYear(date)
  const start = weekOf(date)
  return weekRange(start, addDays(start, 6))
}

/** "N booked in view": the shown bookings that still hold their slot */
export const bookedInView = (list: { status: BookingStatus }[]) =>
  list.filter((b) => b.status !== "cancelled").length

/** The Appointments page's views (its week starts on Monday) */
export type PlannerView = "month" | "week" | "day" | "agenda"

export function readPlannerParams(
  params: { date?: string | string[]; view?: string | string[] },
  today: Date
): { date: Date; view: PlannerView } {
  const { date } = readCalendarParams(params, today)
  const view = params.view
  return {
    date,
    view:
      view === "month" || view === "day" || view === "agenda" ? view : "week",
  }
}

/** The Appointments URL for a day and view; this week is the bare page */
export const plannerHref = (date: Date, view: PlannerView, today: Date) =>
  viewHref("/appointments", date, view, "week", today)

/** "Sep 28 - Oct 4" or "September 21 - 27" (no year), "September 2026", or the day "September 28" */
export function plannerTitle(date: Date, view: PlannerView) {
  if (view === "month") return monthYear(date)
  if (view !== "week") return monthDayLong(date)
  const start = startOfWeek(date, 1)
  return weekSpan(start, addDays(start, 6))
}

/**
 * The quarter hour a click lands in, `fraction` of the way down a day column that runs from opening to close (the
 * calendar rounds to the nearest one)
 */
export function quarterAt(
  day: Date,
  fraction: number,
  hours: { open: number; close: number }
) {
  const minutes = hours.open * 60 + fraction * (hours.close - hours.open) * 60
  return atMinute(day, Math.floor(minutes / 15) * 15)
}

/** How far down its column a click fell, 0 at the top to 1 at the foot */
export function clickedFraction(e: {
  clientY: number
  currentTarget: { getBoundingClientRect(): { top: number; height: number } }
}) {
  const column = e.currentTarget.getBoundingClientRect()
  return (e.clientY - column.top) / column.height
}
