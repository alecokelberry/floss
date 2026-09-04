import { AgendaPanel } from "@/components/appointments/agenda-panel"
import { getTasks } from "@/db/queries/tasks"

export default async function AppointmentsPanel() {
  return <AgendaPanel tasks={await getTasks()} />
}
