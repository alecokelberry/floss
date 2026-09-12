"use client"

import {
  ListChecksIcon,
  PhoneIcon,
  RotateCcwIcon,
  SearchIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import type { Route } from "next"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { loadSearchIndex } from "@/app/actions/search"
import { TAB_META } from "@/components/settings/settings-panel"
import { Portrait } from "@/components/shared/avatars"
import { Dot } from "@/components/shared/dot"
import { ToneBadge } from "@/components/shared/tone-badge"
import { RAIL_BUTTON, RailLabel } from "@/components/shell/rail-label"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { IconTile } from "@/components/ui/icon-tile"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import type { DayBooking } from "@/db/queries/shell"
import type { TaskCategory } from "@/db/schema"
import { openSheet } from "@/hooks/use-sheet"
import { searchDay, searchStamp } from "@/lib/dates"
import { PAGES } from "@/lib/nav"
import { patientPhoto } from "@/lib/portraits"
import {
  type Hit,
  MIN_QUERY,
  type SearchGroup,
  searchGroups,
} from "@/lib/search"
import type { SettingsTab } from "@/lib/settings"
import { BOOKING_STATUS } from "@/lib/tones"
import { cn } from "@/lib/utils"

const TASK_ICON: Record<TaskCategory, React.ComponentType> = {
  procedure: StethoscopeIcon,
  task: ListChecksIcon,
  insurance: ShieldCheckIcon,
  call: PhoneIcon,
  meeting: UsersIcon,
  recall: RotateCcwIcon,
}

/** The settings tabs as Search finds them: what each one is for, and the words that lead there */
const SETTINGS_HITS: {
  tab: SettingsTab
  says: string
  keywords: string[]
}[] = [
  {
    tab: "profile",
    says: "Who is signed in at the desk.",
    keywords: ["account", "name"],
  },
  {
    tab: "hours",
    says: "The working day both calendars draw.",
    keywords: ["open", "close"],
  },
  {
    tab: "chairs",
    says: "The columns the board runs.",
    keywords: ["rooms", "colours", "colors"],
  },
  {
    tab: "procedures",
    says: "The price list every invoice bills from.",
    keywords: ["prices"],
  },
  {
    tab: "billing",
    says: "How long the practice gives people to pay.",
    keywords: ["terms", "net"],
  },
  {
    tab: "notifications",
    says: "Which desk actions reach the bell.",
    keywords: ["alerts"],
  },
]

const STATIC_HITS: Hit[] = [
  ...PAGES.map((p): Hit => ({
    kind: "page",
    key: p.href,
    title: p.label,
    meta: ["Page"],
    tile: p.href,
    open: { href: p.href },
  })),
  ...SETTINGS_HITS.map((s): Hit => ({
    kind: "setting",
    key: `setting-${s.tab}`,
    title: TAB_META[s.tab].label,
    meta: ["Settings", s.says],
    keywords: s.keywords,
    tile: s.tab,
    open: { href: `/settings?tab=${s.tab}` },
  })),
]

function Tile({ hit }: { hit: Hit }) {
  const Icon =
    hit.kind === "page"
      ? PAGES.find((p) => p.href === hit.tile)?.icon
      : hit.kind === "setting"
        ? TAB_META[hit.tile as SettingsTab].icon
        : TASK_ICON[hit.tile as TaskCategory]
  return (
    <IconTile className="size-8 rounded-lg border border-foreground/10 bg-foreground/5 text-foreground [&_svg]:size-4">
      {Icon && <Icon />}
    </IconTile>
  )
}

/**
 * The Search (the rail's button, ⌘K anywhere): with nothing typed, the day's first bookings and every page; from
 * two characters, pages and settings, clinicians, the planner, patients, bookings and invoices, each opening where
 * it lives. ↑ ↓ Home End move, ↵ opens, Esc closes.
 */
export function SearchDialog({ today }: { today: DayBooking[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const [index, setIndex] = useState<Hit[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // The records are read fresh each time Search opens
  useEffect(() => {
    if (!open) return
    let live = true
    void loadSearchIndex().then((r) => live && setIndex(r.data ?? []))
    return () => {
      live = false
    }
  }, [open])

  const kept = today.filter((b) => b.status !== "cancelled")
  const defaults: SearchGroup[] = [
    {
      label: `${kept[0] ? searchDay(kept[0].startsAt) : "Today"} · ${Math.min(5, kept.length)} of ${kept.length}`,
      hits: kept.slice(0, 5).map((b) => {
        const name = `${b.patient.firstName} ${b.patient.lastName}`
        return {
          kind: "booking",
          key: `booking-${b.id}`,
          title: name,
          badge: {
            tone: BOOKING_STATUS[b.status].badge,
            label: BOOKING_STATUS[b.status].label,
          },
          meta: [b.procedure.name, b.practitioner.name, b.room?.name].filter(
            (m): m is string => Boolean(m)
          ),
          trailing: searchStamp(b.startsAt),
          avatar: { src: patientPhoto(b.patient.chart), name },
          open: { kind: "booking", id: b.id },
        } satisfies Hit
      }),
    },
    { label: "Go to", hits: STATIC_HITS.filter((h) => h.kind === "page") },
  ].filter((g) => g.hits.length > 0)
  const groups =
    query.trim().length < MIN_QUERY
      ? defaults
      : searchGroups([...STATIC_HITS, ...index], query)
  const rows = groups.flatMap((g) => g.hits)

  function choose(hit: Hit) {
    setOpen(false)
    setQuery("")
    setActive(0)
    if ("href" in hit.open) router.push(hit.open.href as Route)
    else openSheet(hit.open)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const last = rows.length - 1
    const move = (i: number) => {
      e.preventDefault()
      setActive(i)
      listRef.current
        ?.querySelector(`[data-index="${i}"]`)
        ?.scrollIntoView({ block: "nearest" })
    }
    if (e.key === "ArrowDown") move(Math.min(last, active + 1))
    else if (e.key === "ArrowUp") move(Math.max(0, active - 1))
    else if (e.key === "Home") move(0)
    else if (e.key === "End") move(last)
    else if (e.key === "Enter" && rows[active]) {
      e.preventDefault()
      choose(rows[active])
    }
  }

  let n = -1
  return (
    <>
      <SidebarMenuButton
        tooltip={{ hidden: false, children: "Search" }}
        aria-label="Search"
        className={RAIL_BUTTON}
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
        <RailLabel>Search</RailLabel>
      </SidebarMenuButton>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) {
            setQuery("")
            setActive(0)
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="gap-0 p-0 sm:max-w-2xl"
          onKeyDown={onKeyDown}
        >
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">
            Find patients, bookings, invoices, clinicians, planner events and
            pages.
          </DialogDescription>
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <SearchIcon aria-hidden className="size-4 text-muted-foreground" />
            <input
              role="combobox"
              aria-expanded
              aria-controls="search-results"
              aria-label="Search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search patients, bookings, invoices..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <DialogClose
            aria-label="Close"
            className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-md opacity-60 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon className="size-4" />
          </DialogClose>
          {rows.length ? (
            <div
              id="search-results"
              role="listbox"
              ref={listRef}
              className="max-h-[min(24rem,60vh)] scroll-py-1 [scrollbar-width:none] overflow-y-auto overscroll-contain p-1"
            >
              {groups.map((g) => (
                <div key={g.label} role="group" aria-label={g.label}>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {g.label}
                  </div>
                  {g.hits.map((hit) => {
                    n++
                    const i = n
                    return (
                      <div
                        key={hit.key}
                        role="option"
                        tabIndex={-1}
                        aria-selected={i === active}
                        data-index={i}
                        onMouseMove={() => setActive(i)}
                        onClick={() => choose(hit)}
                        onKeyDown={() => {}}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-2 py-2",
                          i === active && "bg-accent"
                        )}
                      >
                        {hit.avatar ? (
                          <Portrait
                            src={hit.avatar.src}
                            name={hit.avatar.name}
                            size={32}
                          />
                        ) : (
                          <Tile hit={hit} />
                        )}
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {hit.title}
                            </span>
                            {hit.badge && (
                              <ToneBadge tone={hit.badge.tone}>
                                {hit.badge.label}
                              </ToneBadge>
                            )}
                          </div>
                          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                            {hit.meta.map((m, j) => (
                              <span
                                key={m}
                                className="flex min-w-0 items-center gap-1.5"
                              >
                                {j > 0 && <Dot />}
                                <span className="truncate">{m}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                        {hit.trailing && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {hit.trailing}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ) : (
            <p className="p-8 px-4 text-center text-sm text-muted-foreground">
              No matches for “{query}”
            </p>
          )}
          <div className="flex items-center gap-3 border-t px-4 py-2 text-xs text-muted-foreground">
            <span>
              <kbd>↑↓</kbd> navigate
            </span>
            <span>
              <kbd>↵</kbd> open
            </span>
            <span>
              <kbd>esc</kbd> close
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
