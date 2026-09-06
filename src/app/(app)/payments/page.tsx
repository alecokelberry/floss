import type { Metadata } from "next"

import { Ledger } from "@/components/payments/ledger"
import { NewInvoiceButton } from "@/components/payments/new-invoice-button"
import { SummaryCard } from "@/components/payments/summary-card"
import { PageBody, PageHeader } from "@/components/shared/page-header"
import { clinicNow } from "@/db/clock"
import { getLedger } from "@/db/queries/payments"

export const metadata: Metadata = { title: "Payments" }

/** Payments: the ledger is a reading of the calendar */
export default async function PaymentsPage() {
  const [invoices, now] = await Promise.all([getLedger(), clinicNow()])
  return (
    <>
      <PageHeader title="Payments">
        <NewInvoiceButton />
      </PageHeader>
      <PageBody>
        <div className="flex w-full flex-col gap-4">
          <SummaryCard invoices={invoices} today={new Date(now)} />
          <Ledger invoices={invoices} />
        </div>
      </PageBody>
    </>
  )
}
