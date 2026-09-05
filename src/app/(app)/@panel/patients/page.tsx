import { DirectoryPanel } from "@/components/patients/directory-panel"
import { getDirectory } from "@/db/queries/patients"

export default async function PatientsPanel() {
  return <DirectoryPanel patients={await getDirectory()} />
}
