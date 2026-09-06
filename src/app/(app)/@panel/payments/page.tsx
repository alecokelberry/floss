import { ActivityPanel } from "@/components/payments/activity-panel"
import { getLedger } from "@/db/queries/payments"

export default async function PaymentsPanel() {
  return <ActivityPanel invoices={await getLedger()} />
}
