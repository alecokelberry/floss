"use client"

import { UserPlusIcon } from "lucide-react"

import { PractitionerAvatar } from "@/components/shared/avatars"
import { ContextPanel } from "@/components/shared/context-panel"
import { usePractice } from "@/components/shell/practice"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { StaffDay } from "@/db/queries/staff"
import { openSheet } from "@/hooks/use-sheet"
import { duration } from "@/lib/dates"
import { loadRows } from "@/lib/staff"

/**
 * The Load panel: who's on the floor today, busiest first, with a bar of their chair time against the busiest,
 * and who isn't. A row opens the clinician.
 */
export function LoadPanel({ day }: { day: StaffDay }) {
  const { practitioners } = usePractice()
  const load = loadRows(practitioners, day.visits, day.tomorrow)
  type LoadRow = (typeof load.floor)[number] | (typeof load.off)[number]
  const row = (r: LoadRow, on: boolean) => {
    const share = "share" in r ? r.share : 0
    return (
      <div
        key={r.chair.id}
        role="button"
        tabIndex={0}
        aria-label={`Open ${r.chair.name}`}
        onClick={() => openSheet({ kind: "clinician", id: r.chair.id })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            openSheet({ kind: "clinician", id: r.chair.id })
          }
        }}
        className="group flex items-center gap-2.5 rounded-md px-3 py-2 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <PractitionerAvatar practitioner={r.chair} size={32} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{r.chair.name}</span>
            {on && (
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {duration(r.minutes)}
              </span>
            )}
          </div>
          <div
            role="img"
            aria-label={`${r.chair.name}: ${duration(r.minutes)} in the chair today`}
            className="h-1 overflow-hidden rounded-full bg-accent group-hover:bg-border"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${share * 100}%` }}
            />
          </div>
          <span className="truncate text-xs text-muted-foreground">
            {on
              ? `${r.today} today · ${r.tomorrow} tomorrow`
              : `${r.chair.specialty} · not on the floor`}
          </span>
        </div>
      </div>
    )
  }
  const label = (text: string) => (
    <div className="flex h-9 items-center px-3 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {text}
    </div>
  )
  return (
    <ContextPanel
      title="Load"
      action={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Add clinician"
          onClick={() => openSheet({ kind: "new-clinician" })}
        >
          <UserPlusIcon />
        </Button>
      }
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-1.5 py-2">
          {load.floor.length > 0 && (
            <>
              {label("On the floor")}
              {load.floor.map((r) => row(r, true))}
            </>
          )}
          {load.off.length > 0 && (
            <>
              {label("Not scheduled")}
              {load.off.map((r) => row(r, false))}
            </>
          )}
        </div>
      </ScrollArea>
      <div className="flex h-10 shrink-0 items-center justify-between border-t px-3 text-xs">
        <span>
          {load.floor.length} of {practitioners.length} on the floor
        </span>
        <span className="text-muted-foreground">
          {duration(load.booked)} booked
        </span>
      </div>
    </ContextPanel>
  )
}
