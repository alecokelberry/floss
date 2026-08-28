import { ChairsPanel } from "@/components/calendar/chairs-panel"
import { clinicNow } from "@/db/clock"
import { getBookedDays, getUpNext } from "@/db/queries/calendar"
import { readCalendarParams } from "@/lib/calendar"
import { startOfDay } from "@/lib/dates"

export default async function CalendarPanel({
  searchParams,
}: PageProps<"/calendar">) {
  const today = new Date(await clinicNow())
  const { date, view } = readCalendarParams(await searchParams, today)
  const [bookedDays, upNext] = await Promise.all([
    getBookedDays(),
    getUpNext(startOfDay(today).getTime()),
  ])
  return (
    <ChairsPanel
      date={date}
      view={view}
      bookedDays={bookedDays}
      upNext={upNext}
    />
  )
}
