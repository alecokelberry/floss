import type { Metadata } from "next"

import { DashboardCharts } from "@/components/dashboard/charts"
import { DashboardActions } from "@/components/dashboard/dashboard-actions"
import { DayBreakdown } from "@/components/dashboard/day-breakdown"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { PageBody, PageHeader } from "@/components/shared/page-header"
import { getDayBoard } from "@/db/queries/day"

export const metadata: Metadata = { title: "Dashboard" }

/** The Dashboard: the day's four numbers, the practice's year in two charts, and the day's sheet by state */
export default async function DashboardPage() {
  const board = await getDayBoard()
  return (
    <>
      <PageHeader title="Clinic Dashboard">
        <DashboardActions board={board} />
      </PageHeader>
      <PageBody>
        <div className="@container flex w-full flex-col gap-4">
          <h2 className="sr-only">Clinic overview</h2>
          <KpiCards numbers={board.numbers} />
          <DashboardCharts />
          <DayBreakdown board={board} />
        </div>
      </PageBody>
    </>
  )
}
