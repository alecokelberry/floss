import type { Metadata } from "next"

import { SettingsCard } from "@/components/settings/settings-cards"
import { PageBody, PageHeader } from "@/components/shared/page-header"
import { clinicNow } from "@/db/clock"
import { getLedger } from "@/db/queries/payments"
import { ledgerSummary } from "@/lib/invoices"
import { readTab } from "@/lib/settings"

export const metadata: Metadata = { title: "Settings" }

/** Settings: one card for the tab the Configuration panel has open */
export default async function SettingsPage({
  searchParams,
}: PageProps<"/settings">) {
  const tab = readTab((await searchParams).tab)
  const [invoices, now] = await Promise.all([getLedger(), clinicNow()])
  const s = ledgerSummary(invoices, new Date(now))
  return (
    <>
      <PageHeader title="Settings" />
      <PageBody>
        <div className="flex w-full flex-col gap-4">
          <SettingsCard
            key={tab}
            tab={tab}
            ledger={{
              outstanding: s.outstanding,
              open: s.currentCount + s.overdueCount,
              pastDue: s.overdueCount,
            }}
          />
        </div>
      </PageBody>
    </>
  )
}
