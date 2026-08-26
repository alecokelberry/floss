import type { Metadata } from "next"

import { CalendarActions } from "@/components/calendar/calendar-actions"
import { CalendarBoard } from "@/components/calendar/calendar-board"
import { PageHeader } from "@/components/shared/page-header"
import { clinicNow } from "@/db/clock"
import { getDayLog, getWeekSheet } from "@/db/queries/calendar"
import { getPractitioners } from "@/db/queries/shell"
import { calendarTitle, readCalendarParams, weekOf } from "@/lib/calendar"
import { CHAIR_COLOR } from "@/lib/tones"

export const metadata: Metadata = { title: "Calendar" }

/** Calendar: the day's chairs (or the week) on the Event Calendar, and the day's log */
export default async function CalendarPage({
  searchParams,
}: PageProps<"/calendar">) {
  const today = new Date(await clinicNow())
  const { date, view } = readCalendarParams(await searchParams, today)
  const [sheet, log, chairs] = await Promise.all([
    getWeekSheet(weekOf(date).getTime()),
    getDayLog(date.getTime()),
    getPractitioners(),
  ])
  const shown = chairs.filter((c) => c.onBoard)
  return (
    <>
      <PageHeader
        title={calendarTitle(date, view)}
        after={
          <div className="hidden items-center *:not-first:-ms-1.5 md:flex">
            {shown.slice(0, 4).map((c) => (
              <span
                key={c.id}
                className="size-3.5 rounded-full border-2 border-background"
                style={{ backgroundColor: CHAIR_COLOR[c.color] }}
              />
            ))}
            {shown.length > 4 && (
              <span className="flex size-3.5 items-center justify-center rounded-full border-2 border-background bg-muted text-[8px] font-medium text-muted-foreground">
                +{shown.length - 4}
              </span>
            )}
          </div>
        }
      >
        <CalendarActions date={date} />
      </PageHeader>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CalendarBoard date={date} view={view} sheet={sheet} log={log} />
      </div>
    </>
  )
}
