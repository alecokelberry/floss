"use client"

import { useTheme } from "next-themes"
import { useCallback } from "react"

/** Flip between light and dark, reading what's on screen right now (the rail's Theme button, D) */
export function useToggleTheme() {
  const { setTheme } = useTheme()
  return useCallback(
    () =>
      setTheme(
        document.documentElement.classList.contains("dark") ? "light" : "dark"
      ),
    [setTheme]
  )
}
