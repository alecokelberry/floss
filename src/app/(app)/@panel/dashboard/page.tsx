import { OpenTimePanel } from "@/components/dashboard/open-time-panel"
import { getDayBoard } from "@/db/queries/day"

export default async function DashboardPanel() {
  return <OpenTimePanel board={await getDayBoard()} />
}
