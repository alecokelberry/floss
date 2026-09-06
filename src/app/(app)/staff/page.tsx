import type { Metadata } from "next"

import { PageBody, PageHeader } from "@/components/shared/page-header"
import { NewVisitButton } from "@/components/staff/new-visit-button"
import { StaffBoard } from "@/components/staff/staff-board"
import { StaffFilter } from "@/components/staff/staff-filter"
import { getStaffDay } from "@/db/queries/staff"

export const metadata: Metadata = { title: "Staff" }

/** Staff: today's visits on a board, one lane per practitioner at work */
export default async function StaffPage() {
  const day = await getStaffDay()
  return (
    <>
      <PageHeader title="Staff">
        <StaffFilter />
        <NewVisitButton today={day.today} />
      </PageHeader>
      <PageBody className="overflow-x-hidden">
        <section className="flex min-h-0 flex-1 flex-col gap-4">
          <StaffBoard day={day} />
        </section>
      </PageBody>
    </>
  )
}
