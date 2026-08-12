"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

// next-themes renders an inline <script> that sets the theme class before first paint.
// It runs from the server HTML; on the client React 19 warns about rendering <script>,
// so mark the client copy as inert data. The element sets suppressHydrationWarning,
// so the differing `type` attribute doesn't cause a hydration warning.
const scriptProps =
  typeof window === "undefined"
    ? undefined
    : ({ type: "application/json" } as const)

export function ThemeProvider(
  props: React.ComponentProps<typeof NextThemesProvider>
) {
  return <NextThemesProvider scriptProps={scriptProps} {...props} />
}
