import { SettingsPanel } from "@/components/settings/settings-panel"
import { readTab } from "@/lib/settings"

export default async function SettingsPanelPage({
  searchParams,
}: PageProps<"/settings">) {
  return <SettingsPanel tab={readTab((await searchParams).tab)} />
}
