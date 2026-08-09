import {
  BanknoteIcon,
  CalendarCheckIcon,
  CalendarIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  SettingsIcon,
  StethoscopeIcon,
  UsersIcon,
} from "lucide-react"
import type { Route } from "next"

export type NavItem = {
  href: Route
  label: string
  icon: LucideIcon
  /** The page's context panel title */
  panel: string
}

/** The rail's places, in order */
export const RAIL: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboardIcon,
    panel: "Open Time",
  },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon, panel: "Chairs" },
  {
    href: "/appointments",
    label: "Appointments",
    icon: CalendarCheckIcon,
    panel: "Agenda",
  },
  {
    href: "/patients",
    label: "Patients",
    icon: UsersIcon,
    panel: "Directory",
  },
  { href: "/staff", label: "Staff", icon: StethoscopeIcon, panel: "Load" },
  {
    href: "/payments",
    label: "Payments",
    icon: BanknoteIcon,
    panel: "Activity",
  },
]

/** Settings, at the rail's foot */
export const SETTINGS: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: SettingsIcon,
  panel: "Configuration",
}

/** Every page, rail order then Settings (Search's "Go to") */
export const PAGES: NavItem[] = [...RAIL, SETTINGS]

/** The page a path belongs to */
export function getNavItem(pathname: string) {
  return PAGES.find(
    (p) => pathname === p.href || pathname.startsWith(`${p.href}/`)
  )
}
