import type { Metadata } from "next"

import { AddPatientButton } from "@/components/patients/add-patient-button"
import { PatientsGrid } from "@/components/patients/patients-grid"
import { StatCards } from "@/components/patients/stat-cards"
import { PageBody, PageHeader } from "@/components/shared/page-header"
import { getDirectory } from "@/db/queries/patients"

export const metadata: Metadata = { title: "Patients" }

/** Patients: the directory's four numbers and every patient in a filterable grid */
export default async function PatientsPage() {
  const patients = await getDirectory()
  return (
    <>
      <PageHeader title="Patients">
        <AddPatientButton />
      </PageHeader>
      <PageBody>
        <div className="@container flex w-full flex-col gap-4">
          <StatCards patients={patients} />
          <PatientsGrid patients={patients} />
        </div>
      </PageBody>
    </>
  )
}
