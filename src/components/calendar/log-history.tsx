"use client"

import {
  CalendarPlusIcon,
  ClockIcon,
  PencilIcon,
  TagIcon,
  XIcon,
} from "lucide-react"

import { Dot } from "@/components/shared/dot"
import { ToneBadge } from "@/components/shared/tone-badge"
import { Badge } from "@/components/ui/badge"
import { IconTile } from "@/components/ui/icon-tile"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { LogEntry } from "@/db/queries/calendar"
import type { EventKind } from "@/db/schema"
import { clock } from "@/lib/dates"
import { EVENT_KIND } from "@/lib/tones"
import { cn } from "@/lib/utils"

const ICON: Record<EventKind, React.ComponentType> = {
  booked: CalendarPlusIcon,
  rescheduled: ClockIcon,
  status: TagIcon,
  updated: PencilIcon,
  cancelled: XIcon,
}

/** The Log History: the day's actions newest first, counted by kind, each with who, whose chair, what and when */
export function LogHistory({ log }: { log: LogEntry[] }) {
  const kinds = (Object.keys(EVENT_KIND) as EventKind[]).filter((k) =>
    log.some((e) => e.kind === k)
  )
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
        <span className="text-sm font-medium">Recent Actions</span>
        <Dot />
        <span className="text-xs text-muted-foreground">
          {log.length} {log.length === 1 ? "action" : "actions"}
        </span>
        <div className="ms-auto flex flex-wrap items-center gap-1.5">
          {kinds.map((k) => (
            <Badge key={k} variant="outline" className="text-muted-foreground">
              {EVENT_KIND[k].label}
              <span className="text-foreground tabular-nums">
                {log.filter((e) => e.kind === k).length}
              </span>
            </Badge>
          ))}
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {log.length ? (
          <ol className="px-4">
            {log.map((e) => {
              const Icon = ICON[e.kind]
              return (
                <li key={e.id} className="flex items-start gap-3 py-2.5">
                  <IconTile
                    variant="soft"
                    className={cn(
                      "mt-0.5 [--icon-tile-icon-size:--spacing(3.5)] [--icon-tile-inset:--spacing(0.5)] [--icon-tile-size:--spacing(8)]",
                      EVENT_KIND[e.kind].tile
                    )}
                  >
                    <Icon />
                  </IconTile>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {e.patient.firstName} {e.patient.lastName}
                      </span>
                      <ToneBadge tone={EVENT_KIND[e.kind].badge}>
                        {EVENT_KIND[e.kind].label}
                      </ToneBadge>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{e.patient.chart}</span>
                      <Dot />
                      <span className="truncate">{e.practitioner.name}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate">{e.procedure.name}</span>
                      <Dot />
                      <span className="truncate">{e.detail}</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {clock(e.at)}
                  </span>
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nothing has changed on this day's board.
          </p>
        )}
      </ScrollArea>
    </div>
  )
}
