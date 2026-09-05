import {
  CalendarClockIcon,
  CircleDollarSignIcon,
  StethoscopeIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { IconTile } from "@/components/ui/icon-tile"
import type { DirectoryPatient } from "@/db/queries/patients"
import { directoryStats } from "@/lib/patients"
import { STAT_TONE } from "@/lib/tones"

/** The sparklines: fixed bar heights (px), the same whatever the directory holds */
const BARS = {
  patients: [11, 40, 24, 6, 6, 11, 6, 6, 6, 6, 6],
  upcoming: [13, 40, 25, 6, 6, 11, 6, 6, 6, 6, 6],
  inChair: [6, 6, 40, 40, 40, 6, 6, 6, 6, 6, 6],
  unpaid: [6, 6, 20, 40, 6, 6, 6, 6, 6, 6, 6],
}

/** The four directory stats: a tile, what it counts, a delta badge, the number and a sparkline */
export function StatCards({ patients }: { patients: DirectoryPatient[] }) {
  const s = directoryStats(patients)
  const cards = [
    {
      icon: UsersIcon,
      title: "Patients",
      sub: "on the books",
      value: s.patients,
      share: 100,
      tone: STAT_TONE.violet,
      up: true,
      bars: BARS.patients,
    },
    {
      icon: CalendarClockIcon,
      title: "Upcoming",
      sub: "appointments still ahead",
      value: s.upcoming,
      share: s.upcomingShare,
      tone: STAT_TONE.emerald,
      up: true,
      bars: BARS.upcoming,
    },
    {
      icon: StethoscopeIcon,
      title: "In Chair",
      sub: "with a clinician now",
      value: s.inChair,
      share: s.inChairShare,
      tone: STAT_TONE.violet,
      up: true,
      bars: BARS.inChair,
    },
    {
      icon: CircleDollarSignIcon,
      title: "Unpaid",
      sub: "finished, not settled",
      value: s.unpaid,
      share: s.unpaidShare,
      tone: STAT_TONE.amber,
      up: false,
      bars: BARS.unpaid,
    },
  ]
  return (
    <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-4">
      {cards.map((c) => {
        const Trend = c.up ? TrendingUpIcon : TrendingDownIcon
        return (
          <Card key={c.title} className="py-0">
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 gap-3">
                  <IconTile
                    variant="elevated"
                    className="size-8 rounded-lg bg-accent text-foreground [&_svg]:size-4"
                  >
                    <c.icon />
                  </IconTile>
                  <div className="flex min-w-0 flex-col pt-0.5">
                    <span className="truncate text-sm font-medium">
                      {c.title}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {c.sub}
                    </span>
                  </div>
                </div>
                <span
                  className="inline-flex h-5 shrink-0 items-center gap-1 rounded-sm border px-1.25 py-0.5 text-xs font-medium"
                  style={{
                    // The tone's hue, pulled toward the text color so it reads at AA in either theme
                    color: `color-mix(in oklab, ${c.tone} 55%, var(--foreground))`,
                    backgroundColor: `color-mix(in oklab, ${c.tone} 15%, transparent)`,
                    borderColor: `color-mix(in oklab, ${c.tone} 25%, transparent)`,
                  }}
                >
                  <Trend className="size-3" />
                  {c.share}%
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className="text-xl font-semibold tabular-nums">
                  {c.value}
                </span>
                <div aria-hidden className="flex h-10 items-end gap-0.5">
                  {c.bars.map((h, i) => (
                    <span
                      // oxlint-disable-next-line react/no-array-index-key -- fixed bars
                      key={i}
                      className="w-1 rounded-full"
                      style={{
                        height: h,
                        backgroundColor: `color-mix(in oklab, ${c.tone} 30%, transparent)`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
