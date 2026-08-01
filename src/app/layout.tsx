import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/shell/theme-provider"
import { Toaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"

// Inter, the UI's one typeface
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// Browser chrome matches the page background in each theme
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export const metadata: Metadata = {
  title: { default: "Floss", template: "%s · Floss" },
  description:
    "A dental practice's front desk: chairs, bookings, patients and payments. Synthetic data only.",
  // Added to an iPhone or iPad home screen it opens standalone under a normal status bar (the manifest does the rest).
  // No viewport-fit=cover, so nothing needs safe-area padding: Safari keeps the page inside the safe area.
  appleWebApp: { capable: true, title: "Floss", statusBarStyle: "default" },
}

/** The document, fonts, theme and toasts. The app's shell is `(app)/layout.tsx`. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <Toaster>{children}</Toaster>
          </TooltipProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
