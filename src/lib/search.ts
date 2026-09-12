// Search: what a query finds, in which groups, how many of each. Pure, so the
// dialog only draws what comes back.
import type { SheetRequest } from "@/hooks/use-sheet"
import type { BadgeTone } from "@/lib/tones"

/** A found row: what it is, what it says, how it's drawn, and what choosing it opens */
export type Hit = {
  kind:
    | "page"
    | "setting"
    | "clinician"
    | "task"
    | "patient"
    | "booking"
    | "invoice"
  key: string
  title: string
  meta: string[]
  trailing?: string
  /** Words it answers to beyond what it shows ("rooms" finds Chairs) */
  keywords?: string[]
  /** A person's portrait (patients, bookings, invoices, clinicians) */
  avatar?: { src?: string; name: string }
  badge?: { tone: BadgeTone; label: string }
  /** A page's href, a settings tab or a planner category: the tile's icon */
  tile?: string
  open: SheetRequest | { href: string }
}

export type SearchGroup = { label: string; hits: Hit[] }

/** The groups a query fills, in order, and how many of each show */
const ORDER: { kind: Hit["kind"][]; label: string; cap?: number }[] = [
  { kind: ["page", "setting"], label: "Go to" },
  { kind: ["clinician"], label: "Clinicians" },
  { kind: ["task"], label: "Planner" },
  { kind: ["patient"], label: "Patients", cap: 5 },
  { kind: ["booking"], label: "Bookings", cap: 6 },
  { kind: ["invoice"], label: "Invoices", cap: 5 },
]

/** Filtering starts at two characters */
export const MIN_QUERY = 2

const text = (h: Hit) =>
  [h.title, ...h.meta, h.trailing ?? "", ...(h.keywords ?? [])]
    .join(" ")
    .toLowerCase()

/** The groups for a query: every hit whose words hold it, capped, "Bookings · 6 of 11" when capped */
export function searchGroups(hits: Hit[], query: string): SearchGroup[] {
  const q = query.trim().toLowerCase()
  if (q.length < MIN_QUERY) return []
  const found = hits.filter((h) => text(h).includes(q))
  return ORDER.map(({ kind, label, cap }) => {
    const all = found.filter((h) => kind.includes(h.kind))
    const shown = cap ? all.slice(0, cap) : all
    return {
      label:
        all.length > shown.length
          ? `${label} · ${shown.length} of ${all.length}`
          : label,
      hits: shown,
    }
  }).filter((g) => g.hits.length > 0)
}
