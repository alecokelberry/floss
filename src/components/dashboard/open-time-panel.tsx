"use client"

import {
  CalendarDaysIcon,
  ChevronRightIcon,
  ClockPlusIcon,
  PlusIcon,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import {
  ContextPanel,
  CountBadge,
  PanelSection,
} from "@/components/shared/context-panel"
import { ToneBadge } from "@/components/shared/tone-badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DayBoard } from "@/db/queries/day"
import { openSheet } from "@/hooks/use-sheet"
import { clock, dayMonth, duration } from "@/lib/dates"
import type { OpenSlot } from "@/lib/day-sheet"
import { chairsThatRan } from "@/lib/day-sheet"
import { CHAIR_COLOR } from "@/lib/tones"

const SHOWN = 5

/** New Booking on a chair at a time: a General Checkup, 30 minutes (every open slot starts that way) */
function book(practitionerId: string, start: Date) {
  openSheet({
    kind: "new-booking",
    defaults: {
      practitionerId,
      procedureId: "checkup",
      startsAt: start.getTime(),
    },
  })
}

/**
 * The Open Time panel: today's sellable time, the bar of how the chairs'
 * hours went, open hours by chair (the chairs that ran, the ones never opened), the open slots of 30 minutes or more,
 * and two ways onto the sheet. Every row books.
 */
export function OpenTimePanel({ board }: { board: DayBoard }) {
  const { chairs, slots, numbers, day } = board
  const [showAll, setShowAll] = useState(false)
  const ran = chairsThatRan(chairs, board.bookings)
  const relief = chairs.filter((c) => !ran.includes(c))
  const sellable = slots.filter((s) =>
    ran.some((c) => c.id === s.practitionerId)
  )
  const first = sellable[0]
  const openFor = (id: string) =>
    slots
      .filter((s) => s.practitionerId === id)
      .reduce((t, s) => t + s.minutes, 0)
  const firstFor = (id: string) =>
    slots.find((s) => s.practitionerId === id)?.start ?? board.day
  const name = (id: string) => chairs.find((c) => c.id === id)?.name ?? ""
  const bookFirst = () => first && book(first.practitionerId, first.start)

  const chairGroup = (
    label: string,
    list: typeof chairs,
    defaultOpen: boolean
  ) => (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger
        render={
          <Button
            variant="ghost"
            aria-label={`${label} group`}
            className="w-full justify-start px-1.5"
          />
        }
      >
        <ChevronRightIcon className="size-3.5 shrink-0 opacity-60 transition-all duration-150 in-data-panel-open:rotate-90 in-data-panel-open:opacity-100" />
        <span className="truncate">{label}</span>
        <CountBadge className="ml-auto">{list.length}</CountBadge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="py-0.5">
          {list.map((c) => (
            <Button
              key={c.id}
              variant="ghost"
              className="h-9 w-full justify-start gap-2 pr-1 pl-5"
              onClick={() => book(c.id, firstFor(c.id))}
            >
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: CHAIR_COLOR[c.color] }}
              />
              <span className="min-w-0 flex-1 truncate text-left text-sm font-normal">
                {c.name}
              </span>
              <CountBadge className="ml-auto">
                {duration(openFor(c.id))}
              </CountBadge>
            </Button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )

  const slotRow = (s: OpenSlot) => {
    const chair = chairs.find((c) => c.id === s.practitionerId)
    return (
      <div role="listitem" key={`${s.practitionerId}-${s.start.getTime()}`}>
        <Button
          variant="ghost"
          aria-label={`Book ${clock(s.start)} with ${chair?.name}`}
          className="h-auto w-full items-start gap-2.5 px-3 py-2 text-left"
          onClick={() => book(s.practitionerId, s.start)}
        >
          <span
            aria-hidden
            className="w-1 shrink-0 self-stretch rounded-full"
            style={{
              backgroundColor: chair ? CHAIR_COLOR[chair.color] : undefined,
            }}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm leading-snug font-medium text-foreground">
              {clock(s.start)} to {clock(s.end)}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {name(s.practitionerId)} · {duration(s.minutes)}
            </span>
          </div>
          {s.freed && (
            <ToneBadge tone="destructive-light" className="self-center">
              Freed
            </ToneBadge>
          )}
        </Button>
      </div>
    )
  }

  return (
    <ContextPanel
      title="Open Time"
      action={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Book the first open slot"
          onClick={bookFirst}
        >
          <ClockPlusIcon />
        </Button>
      }
    >
      <div className="flex shrink-0 flex-col gap-2 border-b px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Today · {dayMonth(day)}</span>
          <CountBadge>{numbers.openSlots} slots</CountBadge>
        </div>
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">
            {duration(numbers.openMinutes)}
          </span>
          <span className="text-xs text-muted-foreground">still sellable</span>
        </div>
        <div
          role="img"
          aria-label={`${duration(numbers.bookedMinutes)} booked, ${duration(numbers.heldMinutes)} held, ${duration(numbers.shortMinutes)} in gaps too short to sell, ${duration(numbers.openMinutes)} open`}
          className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <span
            className="h-full bg-primary"
            style={{ flex: `${numbers.bookedMinutes} 0 0` }}
          />
          <span
            className="h-full bg-muted-foreground/50"
            style={{ flex: `${numbers.heldMinutes} 0 0` }}
          />
          <span
            className="h-full bg-border"
            style={{ flex: `${numbers.shortMinutes} 0 0` }}
          />
          <span
            className="h-full bg-success"
            style={{ flex: `${numbers.openMinutes} 0 0` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          Across {numbers.chairsRan} chairs that ran
        </span>
      </div>
      <ScrollArea className="min-h-0 grow">
        <div className="flex flex-col">
          <PanelSection
            label="Open by chair"
            count={`${ran.length} of ${chairs.length}`}
          >
            <div role="list" className="px-2">
              <div role="listitem">
                {chairGroup("Chairs that ran", ran, true)}
              </div>
              <div role="listitem">
                {chairGroup("Never opened", relief, false)}
              </div>
            </div>
          </PanelSection>
          <PanelSection label="Open slots · 30m+" count={sellable.length}>
            <div role="list" className="flex flex-col gap-0.5 px-1.5">
              {(showAll ? sellable : sellable.slice(0, SHOWN)).map(slotRow)}
            </div>
            {sellable.length > SHOWN && (
              <div className="px-1.5 pt-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2 text-muted-foreground"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? "Show fewer" : `Show all ${sellable.length}`}
                </Button>
              </div>
            )}
          </PanelSection>
        </div>
      </ScrollArea>
      <div className="flex shrink-0 flex-col gap-1 border-t px-3 py-2.5">
        <Button
          className="w-full justify-start"
          disabled={!first}
          onClick={bookFirst}
        >
          <PlusIcon data-icon="inline-start" />
          Book the first open slot
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground"
          nativeButton={false}
          render={<Link href="/calendar" />}
        >
          <CalendarDaysIcon data-icon="inline-start" />
          Open the board on this day
        </Button>
      </div>
    </ContextPanel>
  )
}
