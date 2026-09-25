"use client"

import { type ColumnDef, useTable } from "@tanstack/react-table"
import { ActivityIcon, ChevronRightIcon, SearchIcon, XIcon } from "lucide-react"
import { useState } from "react"

import { CountBadge } from "@/components/shared/context-panel"
import { ToneBadge } from "@/components/shared/tone-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DataGrid,
  type DataGridFeatures,
  dataGridFeatures,
} from "@/components/ui/data-grid/data-grid"
import { DataGridScrollArea } from "@/components/ui/data-grid/data-grid-scroll-area"
import {
  DataGridTable,
  DataGridTableFootRow,
  DataGridTableFootRowCell,
} from "@/components/ui/data-grid/data-grid-table"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Progress, ProgressLabel } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { DayBoard } from "@/db/queries/day"
import { openSheet } from "@/hooks/use-sheet"
import {
  BREAKDOWN_STATES,
  type BreakdownBy,
  type BreakdownState,
  type Bucket,
  breakdown,
  breakdownTotals,
  type Counts,
  delta,
  filterBreakdown,
  heatStep,
  percent,
  STATE_COPY,
} from "@/lib/day-sheet"
import { HEAT } from "@/lib/tones"
import { cn } from "@/lib/utils"

type Filter = "everything" | "unpaid" | "cancelled"

/** A bucket as the grid's row: a group (depth 0, with its children counted) or one of its children (depth 1) */
type Row = Bucket & { depth: 0 | 1; children?: number }
const FILTERS: { value: Filter; label: string }[] = [
  { value: "everything", label: "Everything" },
  { value: "unpaid", label: "Has unpaid" },
  { value: "cancelled", label: "Has cancelled" },
]

const TABS: { value: BreakdownBy; label: string }[] = [
  { value: "chair", label: "By chair" },
  { value: "procedure", label: "By procedure" },
  { value: "room", label: "By room" },
]

/**
 * The Day Breakdown: every booking on today's sheet grouped by chair, procedure or room, against the state it's
 * in, as a heat grid. A filter and a search narrow the child buckets, Notes shows each child's second line, and each
 * heat cell's hover card says what the share means against the day and who's in it.
 */
export function DayBreakdown({ board }: { board: DayBoard }) {
  const [by, setBy] = useState<BreakdownBy>("chair")
  const [filter, setFilter] = useState<Filter>("everything")
  const [query, setQuery] = useState("")
  const [notes, setNotes] = useState(true)
  const groupsBy = (tab: BreakdownBy) =>
    breakdown(board.bookings, tab, {
      chairs: board.chairs,
      procedures: board.procedures,
      rooms: board.rooms,
    })
  // Each tab keeps its own open groups: By chair starts open, the others closed
  const [open, setOpen] = useState<Record<BreakdownBy, string[]>>(() => ({
    chair: groupsBy("chair").map((g) => g.key),
    procedure: [],
    room: [],
  }))

  const groups = filterBreakdown(groupsBy(by), filter, query)
  const totals = breakdownTotals(groups)
  const buckets = groups.reduce((n, g) => n + g.children.length, 0)
  const opened = open[by]
  const allOpen =
    groups.length > 0 && groups.every((g) => opened.includes(g.key))
  const setOpened = (keys: string[]) => setOpen({ ...open, [by]: keys })
  const needsDesk = board.numbers.needsDesk

  // Each group's row, then its children's while it's open (this tab's open groups)
  const rows: Row[] = groups.flatMap((g) => [
    { ...g, depth: 0 as const, children: g.children.length },
    ...(opened.includes(g.key)
      ? g.children.map((c) => ({
          ...c,
          depth: 1 as const,
          key: `${g.key}-${c.key}`,
        }))
      : []),
  ])
  const toggle = (key: string) =>
    setOpened(
      opened.includes(key) ? opened.filter((k) => k !== key) : [...opened, key]
    )
  const rowHeight = (depth: number) =>
    depth === 0 ? "h-11" : notes ? "h-14" : "h-10"
  const columns: ColumnDef<DataGridFeatures, Row>[] = [
    {
      id: "bucket",
      header: "Bucket",
      cell: ({ row }) => {
        const b = row.original
        const isOpen = opened.includes(b.key)
        return b.depth === 0 ? (
          <div className={cn("flex min-w-0 items-center gap-2", rowHeight(0))}>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`${isOpen ? "Collapse" : "Expand"} ${b.label}`}
              aria-expanded={isOpen}
              className="size-6 shrink-0 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => toggle(b.key)}
            >
              <ChevronRightIcon
                className={cn(
                  "size-3.5 shrink-0 transition-transform",
                  isOpen && "rotate-90"
                )}
              />
            </Button>
            <ActivityIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="shrink-0 text-sm font-semibold">{b.label}</span>
            <span className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground sm:block">
              {b.meta}
            </span>
            <CountBadge className="shrink-0">{b.children}</CountBadge>
          </div>
        ) : (
          <div
            className={cn("flex min-w-0 items-center gap-3 ps-8", rowHeight(1))}
          >
            <CountBadge className="shrink-0">{b.badge}</CountBadge>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-normal">{b.label}</span>
              {notes && (
                <p className="truncate text-sm leading-5 text-muted-foreground">
                  {b.note}
                </p>
              )}
            </div>
          </div>
        )
      },
      size: 260,
      // No vertical padding anywhere in a row: the heat cells fill it edge to edge
      meta: {
        headerClassName: "ps-3 lg:ps-4",
        cellClassName: "py-0 ps-3 lg:ps-4",
      },
    },
    {
      id: "bookings",
      header: () => <span className="block text-right">Bookings</span>,
      cell: ({ row }) => (
        <span className="block text-right text-sm font-medium tabular-nums">
          {row.original.counts.total}
        </span>
      ),
      size: 112,
      meta: { cellClassName: "py-0" },
    },
    ...BREAKDOWN_STATES.map((s): ColumnDef<DataGridFeatures, Row> => ({
      id: s,
      header: () => (
        <span className="block text-right">{STATE_COPY[s].label}</span>
      ),
      cell: ({ row }) => (
        <HeatCell
          bucket={row.original}
          state={s}
          totals={totals}
          group={row.original.depth === 0}
          className={rowHeight(row.original.depth)}
        />
      ),
      size: 128,
      meta: {
        cellClassName: "p-0",
        headerClassName: "last:pe-3 lg:last:pe-4",
      },
    })),
  ]

  return (
    <Card className="w-full gap-0 py-0">
      <CardHeader className="flex flex-col items-start gap-3 border-b py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardTitle className="text-base font-semibold">
            Day Breakdown
          </CardTitle>
          <CardDescription className="text-xs">
            Every booking on the sheet, against the state it is in.
          </CardDescription>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-xs font-medium text-muted-foreground">
              Bookings
            </span>
            <Badge variant="secondary" className="tabular-nums">
              {board.bookings.length}
            </Badge>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:border-l sm:pl-3">
            <span className="truncate text-xs font-medium text-muted-foreground">
              Needs desk
            </span>
            <ToneBadge tone="destructive-light" className="tabular-nums">
              {needsDesk}
            </ToneBadge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-4 pt-2">
          <Tabs value={by} onValueChange={(v) => setBy(v as BreakdownBy)}>
            <TabsList variant="line" className="gap-5">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="px-0 pb-3"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <Separator />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              items={FILTERS}
              value={filter}
              onValueChange={(v) => setFilter(v as Filter)}
            >
              <SelectTrigger
                aria-label="Filter by what needs the desk"
                className="w-full sm:w-40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <InputGroup className="w-full min-w-0 sm:w-52">
              <InputGroupAddon>
                <SearchIcon className="text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Search buckets"
                placeholder="Search buckets"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Field
              orientation="horizontal"
              className="w-auto items-center gap-2"
            >
              <FieldLabel
                htmlFor="breakdown-notes"
                className="leading-none font-normal"
              >
                Notes
              </FieldLabel>
              <Switch
                id="breakdown-notes"
                aria-label="Toggle the second line on every row"
                checked={notes}
                onCheckedChange={setNotes}
              />
            </Field>
            <Button
              variant="outline"
              onClick={() => setOpened(allOpen ? [] : groups.map((g) => g.key))}
            >
              {allOpen ? "Collapse" : "Expand"}
            </Button>
          </div>
        </div>
        <Separator />
        {/* TanStack's table keeps the rows it was made with, so a new set (a group opened, a filter, Notes) makes a
            new one */}
        <BreakdownGrid
          key={`${by}|${filter}|${query}|${notes}|${opened.join()}`}
          rows={rows}
          columns={columns}
          footer={
            groups.length > 0 && (
              <DataGridTableFootRow>
                <DataGridTableFootRowCell className="ps-3 lg:ps-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      Visible buckets
                    </span>
                    <Badge variant="outline" className="tabular-nums">
                      {buckets}
                    </Badge>
                  </div>
                </DataGridTableFootRowCell>
                <DataGridTableFootRowCell className="text-right">
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {totals.total}
                  </span>
                </DataGridTableFootRowCell>
                {BREAKDOWN_STATES.map((s) => (
                  <DataGridTableFootRowCell
                    key={s}
                    className="text-right last:pe-3 lg:last:pe-4"
                  >
                    {totals[s] > 0 && (
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          s === "cancelled"
                            ? "text-destructive"
                            : "text-foreground"
                        )}
                      >
                        {totals[s]} / {percent(totals[s], totals.total)}
                      </span>
                    )}
                  </DataGridTableFootRowCell>
                ))}
              </DataGridTableFootRow>
            )
          }
          count={groups.length}
        />
      </CardContent>
    </Card>
  )
}

/** A heat cell: count and share filling the cell, a hover card with what it means against the day */
function HeatCell({
  bucket,
  state,
  totals,
  group,
  className,
}: {
  bucket: Bucket
  state: BreakdownState
  totals: Counts
  group?: boolean
  className?: string
}) {
  const count = bucket.counts[state]
  const total = bucket.counts.total
  const share = total ? count / total : 0
  const average = totals.total ? totals[state] / totals.total : 0
  const d = delta(state, share, average)
  const copy = STATE_COPY[state]
  const patients = bucket.bookings.filter((b) => b.status === state)
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={600}
        render={
          <button
            type="button"
            aria-label={`${bucket.label}, ${copy.label}: ${count} of ${total}, ${percent(count, total)}`}
            className={cn(
              "flex w-full min-w-28 items-center justify-between gap-2 px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              HEAT[heatStep(state, count, total)],
              group ? "font-semibold" : "font-medium",
              className
            )}
          />
        }
      >
        <span className="tabular-nums">{count}</span>
        <span className="tabular-nums opacity-80">{percent(count, total)}</span>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="end" alignOffset={0} className="w-72">
        <div className="flex flex-col gap-3 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold">
                {bucket.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {copy.means}
              </span>
            </div>
            <ToneBadge
              tone={
                state === "cancelled" ? "destructive-light" : "success-light"
              }
              className="shrink-0"
            >
              {copy.label}
            </ToneBadge>
          </div>
          <Separator />
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-lg leading-none font-semibold tabular-nums">
                {percent(count, total)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {count} of {total} bookings
              </span>
            </div>
            <ToneBadge
              tone={d.good ? "success-light" : "destructive-light"}
              className="shrink-0 tabular-nums"
            >
              {d.points > 0 ? "+" : ""}
              {d.points} pts
            </ToneBadge>
          </div>
          <Progress value={Math.round(share * 100)}>
            <ProgressLabel className="sr-only">
              {copy.label} share
            </ProgressLabel>
          </Progress>
          <span className="text-xs text-muted-foreground tabular-nums">
            Day average {percent(totals[state], totals.total)}
          </span>
          {!group && patients.length > 0 && (
            <div className="flex flex-wrap gap-x-1 gap-y-0.5">
              {patients.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="rounded-sm text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  onClick={() => openSheet({ kind: "booking", id: b.id })}
                >
                  {b.patient}
                </button>
              ))}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

/** The breakdown's grid: a fresh table for the rows it's given (its parent keys it on them) */
function BreakdownGrid({
  rows,
  columns,
  footer,
  count,
}: {
  rows: Row[]
  columns: ColumnDef<DataGridFeatures, Row>[]
  footer: React.ReactNode
  count: number
}) {
  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: rows,
    getRowId: (r: Row) => r.key,
    // Every bucket on one page
    state: { pagination: { pageIndex: 0, pageSize: 500 } },
  })
  return (
    <DataGrid
      table={table}
      recordCount={count}
      emptyMessage="No bookings match this view."
      tableLayout={{
        dense: true,
        cellBorder: true,
        rowBorder: true,
        footerBackground: true,
        width: "fixed",
      }}
    >
      <DataGridScrollArea>
        <DataGridTable footerContent={footer} />
      </DataGridScrollArea>
    </DataGrid>
  )
}
