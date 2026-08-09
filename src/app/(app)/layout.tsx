import { cookies } from "next/headers"

import { SheetHost } from "@/components/sheets/sheet-host"
import { AppSidebar } from "@/components/shell/app-sidebar"
import { LiveRefresh } from "@/components/shell/live-refresh"
import { PracticeProvider } from "@/components/shell/practice"
import { ShellProvider } from "@/components/shell/shell-provider"
import { SidebarInset } from "@/components/ui/sidebar"
import { readClock } from "@/db/clock"
import { ensureFreshDay } from "@/db/demo-day"
import { getPatientList } from "@/db/queries/calendar"
import { getCatalog } from "@/db/queries/day"
import {
  getBookingsOn,
  getNotifications,
  getPractitioners,
  getSettings,
} from "@/db/queries/shell"
import { clockTime } from "@/lib/clock"
import { startOfDay } from "@/lib/dates"
import { requireUser } from "@/lib/session"

/**
 * The app's shell: the rail and the page's context panel (the `@panel` slot), then the page. Loads what every
 * page shares: who's signed in, the practitioners, the settings, the bell's log and the clinic's clock.
 */
export default async function AppLayout({
  children,
  panel,
}: LayoutProps<"/"> & { panel: React.ReactNode }) {
  const [user] = await Promise.all([requireUser(), ensureFreshDay()])
  const [
    practitioners,
    settings,
    notifications,
    clock,
    cookieStore,
    patients,
    catalog,
    today,
  ] = await Promise.all([
    getPractitioners(),
    getSettings(),
    getNotifications(),
    readClock(),
    cookies(),
    getPatientList(),
    getCatalog(),
    readClock().then((c) => getBookingsOn(startOfDay(clockTime(c)).getTime())),
  ])
  return (
    <PracticeProvider
      me={{ name: user.name, email: user.email }}
      practitioners={practitioners}
      patients={patients}
      procedures={catalog.procedures}
      rooms={catalog.rooms}
      settings={settings}
      clock={clock}
      renderedAt={clockTime(clock)}
    >
      <ShellProvider
        defaultOpen={cookieStore.get("sidebar_state")?.value !== "false"}
      >
        <LiveRefresh />
        <AppSidebar panel={panel} notifications={notifications} today={today} />
        <SheetHost />
        <SidebarInset className="min-w-0 md:overflow-hidden">
          {children}
        </SidebarInset>
      </ShellProvider>
    </PracticeProvider>
  )
}
