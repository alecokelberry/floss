"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useEffect } from "react"

import { RAIL_BUTTON, RailLabel } from "@/components/shell/rail-label"
import { Button } from "@/components/ui/button"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { useToggleTheme } from "@/hooks/use-toggle-theme"
import { cn } from "@/lib/utils"

/** The key that flips the theme on every screen */
const THEME_HOTKEY = "d"

/** Typing into something: a D there is a letter, not the shortcut */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.closest("input, textarea, select, [role=combobox]") !== null)

/**
 * D alone flips light and dark wherever it's mounted: the shell and the sign-in page. Never while typing or with a modifier held, so ⌘D stays the browser's.
 */
export function useThemeHotkey() {
  const toggle = useToggleTheme()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() !== THEME_HOTKEY ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.shiftKey ||
        e.repeat ||
        e.defaultPrevented ||
        typing(e.target)
      )
        return
      e.preventDefault()
      toggle()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [toggle])
}

// A sun/moon button wired to next-themes, on the sign-in page. Borderless like
// the other header icons. The swap runs on `dark:` classes, so the right icon shows before
// hydration.
export function ThemeToggle({ className }: { className?: string }) {
  const toggle = useToggleTheme()
  useThemeHotkey()
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      aria-keyshortcuts="D"
      className={cn(
        "text-muted-foreground [&_svg:not([class*='size-'])]:size-4.5",
        className
      )}
      onClick={toggle}
    >
      <SunMoon />
    </Button>
  )
}

/** c-button-61's two icons, the sun spinning out as the moon spins in; they swap on `dark:`, so they're right before
 * hydration */
function SunMoon() {
  return (
    <>
      <SunIcon className="scale-100 rotate-0 opacity-100 transition-[scale,rotate,opacity] duration-300 motion-reduce:transition-none dark:scale-0 dark:-rotate-90 dark:opacity-0" />
      <MoonIcon className="absolute scale-0 rotate-90 opacity-0 transition-[scale,rotate,opacity] duration-300 motion-reduce:transition-none dark:scale-100 dark:rotate-0 dark:opacity-100" />
    </>
  )
}

/**
 * The rail's Theme button, between Search and Settings:
 * the same spinning sun and moon.
 */
export function ThemeRailButton() {
  const toggle = useToggleTheme()
  return (
    <SidebarMenuButton
      tooltip={{ hidden: false, children: "Theme" }}
      aria-label="Toggle theme"
      aria-keyshortcuts="D"
      className={cn("relative", RAIL_BUTTON)}
      onClick={toggle}
    >
      <SunMoon />
      <RailLabel>Theme</RailLabel>
    </SidebarMenuButton>
  )
}
