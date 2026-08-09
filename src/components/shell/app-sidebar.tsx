"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { BrandMark } from "@/components/shared/brand-mark"
import { AccountMenu } from "@/components/shell/account-menu"
import { CollapseHandle } from "@/components/shell/collapse-handle"
import { Notifications } from "@/components/shell/notifications"
import { RAIL_BUTTON, RailLabel } from "@/components/shell/rail-label"
import { SearchDialog } from "@/components/shell/search-dialog"
import {
  ThemeRailButton,
  useThemeHotkey,
} from "@/components/shell/theme-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { DayBooking, Notification } from "@/db/queries/shell"
import { getNavItem, RAIL, SETTINGS } from "@/lib/nav"

/**
 * The shell as shadcn's sidebar-09 (nested sidebars): a 48px rail (the brand; Dashboard, Calendar, Appointments,
 * Patients, Staff, Payments; at its foot the bell, Search, our Theme button and Settings; the account) and beside it the page's context
 * panel (the `@panel` slot). The handle on the seam or ⌘B folds the panel away. The rail's links prefetch their whole
 * page (`prefetch`, kept for `staleTimes`, next.config.ts), so a click shows it at once.
 */
export function AppSidebar({
  panel,
  notifications,
  today,
}: {
  panel: React.ReactNode
  notifications: Notification[]
  today: DayBooking[]
}) {
  const pathname = usePathname()
  const active = getNavItem(pathname)?.href
  const { setOpenMobile } = useSidebar()
  const close = () => setOpenMobile(false)
  useThemeHotkey()

  return (
    <>
      <Sidebar
        collapsible="icon"
        aria-label="Practice"
        className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      >
        <Sidebar
          collapsible="none"
          className="w-(--sidebar-width-icon)! border-r in-data-[mobile=true]:w-full! in-data-[mobile=true]:border-r-0"
        >
          <SidebarHeader className="px-2 py-3">
            <Link
              href="/dashboard"
              aria-label="Floss, back to the dashboard"
              onClick={close}
              className="mx-auto flex items-center gap-2 rounded-lg text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring in-data-[mobile=true]:ms-2"
            >
              <BrandMark className="rounded-lg" />
              <RailLabel>Floss</RailLabel>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {RAIL.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active === item.href}
                        tooltip={{ hidden: false, children: item.label }}
                        aria-label={item.label}
                        className={RAIL_BUTTON}
                        render={
                          <Link href={item.href} prefetch onClick={close} />
                        }
                      >
                        <item.icon />
                        <RailLabel>{item.label}</RailLabel>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup className="mt-auto">
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  <Notifications items={notifications} />
                  <SidebarMenuItem>
                    <SearchDialog today={today} />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <ThemeRailButton />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={active === SETTINGS.href}
                      tooltip={{ hidden: false, children: SETTINGS.label }}
                      aria-label={SETTINGS.label}
                      className={RAIL_BUTTON}
                      render={
                        <Link href={SETTINGS.href} prefetch onClick={close} />
                      }
                    >
                      <SETTINGS.icon />
                      <RailLabel>{SETTINGS.label}</RailLabel>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <AccountMenu />
          </SidebarFooter>
        </Sidebar>
        <Sidebar
          collapsible="none"
          className="hidden min-w-0 flex-1 bg-background md:flex"
        >
          {panel}
        </Sidebar>
      </Sidebar>
      <CollapseHandle />
    </>
  )
}
