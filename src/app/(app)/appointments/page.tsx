import type { Metadata } from "next"

import { AppointmentsBoard } from "@/components/appointments/appointments-board"
import {
  AppointmentsActions,
  CategoryDots,
} from "@/components/appointments/appointments-header"
import { PageHeader } from "@/components/shared/page-header"
import { clinicNow } from "@/db/clock"
import { getTasks } from "@/db/queries/tasks"
import { plannerTitle, readPlannerParams } from "@/lib/calendar"

export const metadata: Metadata = { title: "Appointments" }

/** Appointments: the practice's planner beyond the chairs */
export default async function AppointmentsPage({
  searchParams,
}: PageProps<"/appointments">) {
  const today = new Date(await clinicNow())
  const { date, view } = readPlannerParams(await searchParams, today)
  const tasks = await getTasks()
  return (
    <>
      <PageHeader title={plannerTitle(date, view)} after={<CategoryDots />}>
        <AppointmentsActions date={date} view={view} tasks={tasks} />
      </PageHeader>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AppointmentsBoard date={date} view={view} tasks={tasks} />
      </div>
    </>
  )
}
