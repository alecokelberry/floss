"use client"

import { SidebarProvider } from "@/components/ui/sidebar"

/**
 * The shell's sidebar: the 48px rail and the 302px context panel (every page has one), 350px in all; folded (⌘B),
 * the rail alone. The rail's hover and current place are a 5% primary tint with primary text.
 */
export function ShellProvider({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean
  children: React.ReactNode
}) {
  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      className="md:h-dvh md:overflow-hidden"
      style={
        {
          "--sidebar-width": "calc(var(--sidebar-width-icon) + 18.875rem)",
          "--sidebar-accent":
            "color-mix(in oklab, var(--primary) 5%, transparent)",
          "--sidebar-accent-foreground": "var(--primary)",
        } as React.CSSProperties
      }
    >
      {children}
    </SidebarProvider>
  )
}
