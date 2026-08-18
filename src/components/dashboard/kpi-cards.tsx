import {
  CalendarCheckIcon,
  ClockIcon,
  GaugeIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { IconTile } from "@/components/ui/icon-tile"
import type { DayBoard } from "@/db/queries/day"
import { duration } from "@/lib/dates"
import { percent } from "@/lib/day-sheet"
import { KPI_DELTA, KPI_TILE } from "@/lib/tones"
import { cn } from "@/lib/utils"

/** The four KPI cards: a lit tile, what it tracks, one number and its context in color. Static, no hover. */
export function KpiCards({ numbers }: { numbers: DayBoard["numbers"] }) {
  const n = numbers
  const cards = [
    {
      icon: CalendarCheckIcon,
      tile: KPI_TILE.schedule,
      eyebrow: "Schedule",
      title: "Booked Today",
      label: "Appointments",
      value: String(n.booked),
      delta: `${percent(n.keptShare, 1)} (kept)`,
      good: true,
    },
    {
      icon: GaugeIcon,
      tile: KPI_TILE.capacity,
      eyebrow: "Capacity",
      title: "Chair Load",
      label: "Utilisation",
      value: percent(n.utilisation, 1),
      delta: `${duration(n.bookedMinutes)} (of ${duration(n.capacity)})`,
      good: true,
    },
    {
      icon: ClockIcon,
      tile: KPI_TILE.open,
      eyebrow: "Open Time",
      title: "Still Sellable",
      label: "Unbooked",
      value: duration(n.openMinutes),
      delta: `${percent(n.openShare, 1)} (${n.openSlots} slots)`,
      good: true,
    },
    {
      icon: TriangleAlertIcon,
      tile: KPI_TILE.risk,
      eyebrow: "Risk",
      title: "Watchlist",
      label: "Needs Desk",
      value: String(n.needsDesk),
      delta: `${n.unpaid} (unpaid)`,
      good: false,
    },
  ]
  return (
    <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.title} size="sm">
          <CardContent>
            <div className="flex items-center gap-2.5">
              <IconTile
                variant="elevated"
                className={cn(
                  "size-10 rounded-lg [background-image:radial-gradient(48.05%_48.05%_at_50%_5.95%,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0)_100%)] [&_svg]:size-5 [&_svg]:text-white",
                  c.tile
                )}
              >
                <c.icon />
              </IconTile>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-sm leading-tight text-muted-foreground">
                  {c.eyebrow}
                </p>
                <h3 className="truncate text-sm leading-tight font-medium">
                  {c.title}
                </h3>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-1.5">
              <p className="text-sm leading-tight text-muted-foreground">
                {c.label}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xl font-medium tracking-tight tabular-nums">
                  {c.value}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    c.good ? KPI_DELTA.good : KPI_DELTA.bad
                  )}
                >
                  {c.delta}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
