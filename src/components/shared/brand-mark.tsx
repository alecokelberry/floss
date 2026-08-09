import { cn } from "@/lib/utils"

/**
 * Floss's glyph on a 24-unit grid: a molar, filled, so it reads at 16px. One path for the sidebar and sign-in mark,
 * the browser icon and the home-screen icon (src/app/icon.tsx, apple-icon.tsx), so they can't drift apart.
 */
export const FLOSS_GLYPH =
  "M7.2 3.5C4.6 3.5 3.4 5.7 3.8 8.6C4.1 11 5.3 12.6 5.8 15L6.7 19.4C7 20.9 8.9 20.9 9.2 19.4L10 15.6C10.3 14.4 11.1 13.9 12 13.9C12.9 13.9 13.7 14.4 14 15.6L14.8 19.4C15.1 20.9 17 20.9 17.3 19.4L18.2 15C18.7 12.6 19.9 11 20.2 8.6C20.6 5.7 19.4 3.5 16.8 3.5C15.1 3.5 14 4.4 12 4.4C10 4.4 8.9 3.5 7.2 3.5Z"

function FlossGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d={FLOSS_GLYPH} />
    </svg>
  )
}

/** The mark: the glyph on a solid 28px tile (App Shell 10's), as the sidebar and the sign-in page show it */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground",
        className
      )}
    >
      <FlossGlyph className="size-4" />
    </span>
  )
}
