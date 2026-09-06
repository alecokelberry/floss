"use client"

import {
  ActivityIcon,
  CircleCheckIcon,
  CircleDotIcon,
  ClockIcon,
  GripVerticalIcon,
  PlusIcon,
  StethoscopeIcon,
} from "lucide-react"
import { useOptimistic, useState, useTransition } from "react"

import { moveBooking } from "@/app/actions/bookings"
import { PatientAvatar } from "@/components/shared/avatars"
import { usePractice } from "@/components/shell/practice"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item"
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@/components/ui/kanban"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/toast"
import type { Practitioner } from "@/db/queries/shell"
import type { StaffDay, Visit } from "@/db/queries/staff"
import { openSheet } from "@/hooks/use-sheet"
import { outcome } from "@/lib/action-result"
import { atMinute, clock, duration } from "@/lib/dates"
import {
  BOARD_STATE,
  type BoardState,
  CHIP_PHRASE,
  nextStart,
} from "@/lib/staff"
import { BOARD_CARD, BOARD_CHIP, BOARD_DOT, LANE_TONE } from "@/lib/tones"
import { cn } from "@/lib/utils"

import { useStaffFilter } from "./staff-filter"

const LANE_ICONS = [
  CircleDotIcon,
  StethoscopeIcon,
  ActivityIcon,
  ClockIcon,
  CircleCheckIcon,
]

const byStart = (a: Visit, b: Visit) =>
  a.startsAt.getTime() - b.startsAt.getTime()

/** New visit on a lane: that practitioner, starting where their day's visits end, a General Checkup */
function bookOn(lane: string, visits: Visit[], opening: Date) {
  openSheet({
    kind: "new-booking",
    noun: "visit",
    defaults: {
      practitionerId: lane,
      procedureId: "checkup",
      startsAt: nextStart(visits, opening).getTime(),
    },
  })
}

/**
 * The Staff board: a Kanban of today's visits, one lane per practitioner with a visit (roster order until
 * someone drags a lane). A card opens its appointment; dragging it to another lane gives the visit to that
 * practitioner and it settles at its time; the filter narrows the cards, never the lanes.
 */
export function StaffBoard({ day }: { day: StaffDay }) {
  const { practitioners, settings } = usePractice()
  const [filter] = useStaffFilter()
  const [order, setOrder] = useState<string[]>([])
  const [live, setLive] = useState<Record<string, Visit[]> | null>(null)
  const [moved, setMoved] = useOptimistic<Record<number, string>>({})
  const [, startTransition] = useTransition()
  const opening = atMinute(day.today, settings.hours.open * 60)

  const visits = day.visits.map((v) => {
    const to = moved[v.id]
    return to ? { ...v, practitionerId: to } : v
  })
  const withVisits = practitioners.filter((p) =>
    visits.some((v) => v.practitionerId === p.id)
  )
  // Lanes in the order dragged, new ones at the right end
  const lanes = [
    ...order.filter((id) => withVisits.some((p) => p.id === id)),
    ...withVisits.map((p) => p.id).filter((id) => !order.includes(id)),
  ]
  const derived = Object.fromEntries(
    lanes.map((id) => [
      id,
      visits
        .filter(
          (v) =>
            v.practitionerId === id &&
            (filter === "everything" || BOARD_STATE[v.status] === filter)
        )
        .toSorted(byStart),
    ])
  )
  const value = live ?? derived
  const chair = (id: string) => practitioners.find((p) => p.id === id)
  // A lane's place among the practitioners with visits, which picks its icon and tone
  const laneIndex = (id: string) =>
    Math.max(
      0,
      practitioners
        .filter((p) => visits.some((v) => v.practitionerId === p.id))
        .findIndex((p) => p.id === id)
    ) % LANE_ICONS.length

  return (
    <ScrollArea className="-m-1 min-h-0 w-[calc(100%+0.5rem)] flex-1 pb-3">
      <Kanban<Visit>
        value={value}
        onValueChange={setLive}
        getItemValue={(v) => `apt-${v.id}`}
        onDragCancel={() => setLive(null)}
        onValueCommit={(next, meta) => {
          setLive(null)
          if (meta.kind === "column") {
            setOrder(Object.keys(next))
            return
          }
          const id = String(meta.event.active.id)
          const [lane, list] =
            Object.entries(next).find(([, l]) =>
              l.some((v) => `apt-${v.id}` === id)
            ) ?? []
          const visit = list?.find((v) => `apt-${v.id}` === id)
          if (!lane || !visit || visit.practitionerId === lane) return
          startTransition(async () => {
            setMoved({ ...moved, [visit.id]: lane })
            const result = outcome(
              await moveBooking({
                id: visit.id,
                move: {
                  startsAt: visit.startsAt,
                  endsAt: visit.endsAt,
                  practitionerId: lane,
                },
              })
            )
            if (!result.ok) toast.add({ type: "error", title: result.error })
          })
        }}
        className="w-full max-w-full"
      >
        <KanbanBoard className="relative flex w-max items-start gap-4 p-1">
          {Object.entries(value).map(([lane, list]) => {
            const c = chair(lane)
            if (!c) return null
            return (
              <Lane
                key={lane}
                chair={c}
                Icon={LANE_ICONS[laneIndex(lane)] ?? CircleDotIcon}
                tone={LANE_TONE[laneIndex(lane)] ?? ""}
                visits={list}
                onBook={() =>
                  bookOn(
                    lane,
                    visits.filter((v) => v.practitionerId === lane),
                    opening
                  )
                }
              />
            )
          })}
        </KanbanBoard>
        <KanbanOverlay>
          {({ value: id, variant }) => {
            if (variant === "column") {
              const c = chair(String(id))
              return c ? (
                <Lane
                  chair={c}
                  Icon={LANE_ICONS[laneIndex(c.id)] ?? CircleDotIcon}
                  tone={LANE_TONE[laneIndex(c.id)] ?? ""}
                  visits={value[c.id] ?? []}
                  onBook={() => {}}
                  overlay
                />
              ) : null
            }
            const v = Object.values(value)
              .flat()
              .find((x) => `apt-${x.id}` === String(id))
            return v ? <VisitCard visit={v} overlay /> : null
          }}
        </KanbanOverlay>
      </Kanban>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}

function Lane({
  chair,
  Icon,
  tone,
  visits,
  onBook,
  overlay,
}: {
  chair: Practitioner
  Icon: React.ComponentType<{ className?: string }>
  tone: string
  visits: Visit[]
  onBook: () => void
  overlay?: boolean
}) {
  return (
    <KanbanColumn value={chair.id} className="w-64 shrink-0 self-start">
      <Card
        aria-label={`${chair.name}: ${chair.specialty}`}
        className={cn(
          "group/column w-full gap-0 overflow-hidden bg-muted/40 p-0",
          overlay && "shadow-lg"
        )}
      >
        <CardHeader className="flex min-h-9 flex-row items-center gap-2 px-2 py-2">
          <span
            className={cn(
              "flex size-4 shrink-0 items-center justify-center [&>svg]:size-4",
              tone
            )}
          >
            <Icon aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className="truncate text-sm leading-5 font-semibold"
              title={chair.name}
            >
              {chair.name}
            </span>
            <span className="inline-flex shrink-0 items-center text-xs leading-none font-medium text-muted-foreground tabular-nums">
              {visits.length}
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-focus-within/column:opacity-100 group-hover/column:opacity-100">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Book with ${chair.name}`}
              className="border border-transparent text-muted-foreground hover:border-border! hover:bg-background! hover:text-foreground"
              onClick={onBook}
            >
              <PlusIcon />
            </Button>
            <KanbanColumnHandle
              aria-label={`Move ${chair.name} column`}
              render={(props) => (
                <Button
                  {...props}
                  variant="ghost"
                  size="icon-sm"
                  className="cursor-grab! border border-transparent text-muted-foreground hover:border-border! hover:bg-background! hover:text-foreground active:cursor-grabbing"
                >
                  <GripVerticalIcon />
                </Button>
              )}
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-2 pt-0 pb-2">
          <KanbanColumnContent value={chair.id} className="flex flex-col gap-3">
            {visits.map((v) => (
              <VisitCard key={v.id} visit={v} />
            ))}
          </KanbanColumnContent>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Book with ${chair.name}`}
            className="h-8 w-full justify-center border border-transparent px-2 pl-1.5 font-normal text-muted-foreground hover:border-border! hover:bg-background! hover:text-foreground"
            onClick={onBook}
          >
            <PlusIcon data-icon="inline-start" />
            Add visit
          </Button>
        </CardContent>
      </Card>
    </KanbanColumn>
  )
}

/** A visit: chart and state, the procedure, room and length, the patient and the time chip */
function VisitCard({ visit: v, overlay }: { visit: Visit; overlay?: boolean }) {
  const state: BoardState = BOARD_STATE[v.status]
  const minutes = (v.endsAt.getTime() - v.startsAt.getTime()) / 60_000
  const name = `${v.patient.firstName} ${v.patient.lastName}`
  const phrase = `${CHIP_PHRASE[v.status]} ${clock(v.startsAt)}`
  const line = `${v.room?.name ?? "—"} · ${duration(minutes)}`
  const label = {
    done: "Done",
    in_chair: "In Chair",
    booked: "Booked",
    unpaid: "Unpaid",
  }[state]
  const card = (
    <Item
      variant="outline"
      size="sm"
      className={cn(
        "items-stretch gap-3 bg-card px-3 py-2.5 transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-sm",
        BOARD_CARD[state],
        overlay && "shadow-lg"
      )}
    >
      <ItemHeader className="flex-col items-stretch gap-1.5">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <ItemDescription className="text-[0.6875rem] leading-none font-medium tabular-nums">
            {v.patient.chart}
          </ItemDescription>
          <ItemActions>
            <Badge variant="outline" size="sm">
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: BOARD_DOT[state] }}
              />
              {label}
            </Badge>
          </ItemActions>
        </div>
        <ItemContent className="min-w-0 gap-1">
          <ItemTitle
            className="line-clamp-2 leading-5 font-semibold"
            title={v.procedure.name}
          >
            {v.procedure.name}
          </ItemTitle>
          <ItemDescription className="line-clamp-1 text-xs">
            <span className="min-w-0 truncate" title={line}>
              {line}
            </span>
          </ItemDescription>
        </ItemContent>
      </ItemHeader>
      <ItemFooter className="min-w-0 items-center gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <PatientAvatar patient={v.patient} size={20} />
          <div className="min-w-0 truncate text-xs font-medium" title={name}>
            {name}
          </div>
        </div>
        <span
          title={phrase}
          className={cn(
            "ml-auto flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[0.6875rem] leading-none font-medium",
            BOARD_CHIP[v.status === "cancelled" ? "cancelled" : state]
          )}
        >
          <ClockIcon aria-hidden className="size-3.5 shrink-0" />
          <span className="sr-only">{CHIP_PHRASE[v.status]} </span>
          <span className="shrink-0 font-semibold tabular-nums">
            {clock(v.startsAt)}
          </span>
        </span>
      </ItemFooter>
    </Item>
  )
  return (
    <KanbanItem
      value={`apt-${v.id}`}
      role="button"
      tabIndex={0}
      aria-label={`${name}: ${v.procedure.name} at ${clock(v.startsAt)}`}
      className="rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      onClick={() => openSheet({ kind: "booking", id: v.id })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          openSheet({ kind: "booking", id: v.id })
        }
      }}
    >
      {overlay ? (
        card
      ) : (
        <KanbanItemHandle className="block cursor-grab!">
          {card}
        </KanbanItemHandle>
      )}
    </KanbanItem>
  )
}
