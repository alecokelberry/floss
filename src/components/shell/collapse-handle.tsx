"use client"

import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

/**
 * The collapse handle on the seam between the panel and the page: a slim pill that bends into a chevron on hover
 * while a "Collapse" (or "Expand") label slides out. It folds the panel away, leaving the rail (⌘B does the same).
 */
export function CollapseHandle() {
  const { open, toggleSidebar } = useSidebar()
  const label = open ? "Collapse" : "Expand"
  return (
    <button
      type="button"
      aria-label={`${label} sidebar`}
      onClick={toggleSidebar}
      className="group/rail fixed top-1/2 z-30 hidden h-12 w-7 -translate-y-1/2 items-center pl-2 transition-[left] duration-200 ease-linear md:flex"
      style={{
        left: open ? "var(--sidebar-width)" : "var(--sidebar-width-icon)",
      }}
    >
      <span className="flex flex-col items-center" aria-hidden>
        <span
          className={cn(
            "h-2 w-0.5 origin-bottom rounded-t-full bg-foreground/40 transition-[rotate,background-color] duration-100 ease-linear group-hover/rail:bg-foreground/60",
            open ? "group-hover/rail:rotate-40" : "group-hover/rail:-rotate-40"
          )}
        />
        <span
          className={cn(
            "h-2 w-0.5 origin-top rounded-b-full bg-foreground/40 transition-[rotate,background-color] duration-100 ease-linear group-hover/rail:bg-foreground/60",
            open ? "group-hover/rail:-rotate-40" : "group-hover/rail:rotate-40"
          )}
        />
      </span>
      <span className="pointer-events-none absolute left-full -ml-2 -translate-x-0.5 rounded-md border bg-foreground px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-background opacity-0 shadow-xs shadow-black/5 transition-[opacity,translate] duration-200 ease-out group-hover/rail:translate-x-0 group-hover/rail:opacity-100">
        {label}
      </span>
    </button>
  )
}
