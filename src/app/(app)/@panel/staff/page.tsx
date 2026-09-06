import { LoadPanel } from "@/components/staff/load-panel"
import { getStaffDay } from "@/db/queries/staff"

export default async function StaffPanel() {
  return <LoadPanel day={await getStaffDay()} />
}
