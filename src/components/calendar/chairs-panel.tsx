"use client"

import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisIcon,
  EyeOffIcon,
  FocusIcon,
  PlusIcon,
  Share2Icon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { setChairColor } from "@/app/actions/bookings"
import { PatientAvatar, PractitionerAvatar } from "@/components/shared/avatars"
import {
  ContextPanel,
  CountBadge,
  PanelSection,
} from "@/components/shared/context-panel"
import { usePractice } from "@/components/shell/practice"
import { AvatarGroup } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/toast"
import type { UpNextEntry } from "@/db/queries/calendar"
import type { Practitioner } from "@/db/queries/shell"
import { CHAIR_COLORS, type ChairColor } from "@/db/schema"
import { openSheet } from "@/hooks/use-sheet"
import { outcome } from "@/lib/action-result"
import { type CalendarView, calendarHref } from "@/lib/calendar"
import {
  addMonths,
  CLINIC_TZ,
  clock,
  isoDay,
  isSameMonth,
  monthYear,
} from "@/lib/dates"
import { BOOKING_STATUS, CHAIR_COLOR } from "@/lib/tones"
import { cn } from "@/lib/utils"

import { newAt } from "./calendar-actions"
import { useShownChairs } from "./chair-menu"

const SHOWN = 5

/**
 * The Chairs panel: a month to jump through (a dot under every day with bookings), the chairs the board shows
 * (checkboxes; each chair's ⋯ picks its color or shows it alone), today's Up Next, and two ways to act.
 */
export function ChairsPanel({
  date,
  view,
  bookedDays,
  upNext,
}: {
  date: Date
  view: CalendarView
  bookedDays: string[]
  upNext: UpNextEntry[]
}) {
  const router = useRouter()
  const { practitioners, renderedAt } = usePractice()
  const [month, setMonth] = useState(date)
  // A day picked elsewhere (the board's arrows) brings its month into view
  const [shownDate, setShownDate] = useState(date)
  if (shownDate.getTime() !== date.getTime()) {
    setShownDate(date)
    setMonth(date)
  }
  const [showAll, setShowAll] = useState(false)
  const [, startTransition] = useTransition()
  const chairs = useShownChairs()
  const booked = new Set(bookedDays)
  const daily = practitioners.filter((p) => p.chairGroup === "daily")
  const relief = practitioners.filter((p) => p.chairGroup === "relief")

  const pick = (day: Date) =>
    startTransition(() =>
      router.replace(calendarHref(day, view, new Date(renderedAt)), {
        scroll: false,
      })
    )

  const group = (label: string, list: Practitioner[], open: boolean) => (
    <Collapsible defaultOpen={open}>
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
          {list.map((p) => (
            <ChairRow
              key={p.id}
              chair={p}
              checked={chairs.shown.includes(p.id)}
              onCheckedChange={(on) => chairs.toggle(p.id, on)}
              onOnly={() => chairs.show([p.id])}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )

  return (
    <ContextPanel
      title="Chairs"
      action={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="New booking"
          onClick={() =>
            openSheet({ kind: "new-booking", defaults: newAt(date) })
          }
        >
          <PlusIcon />
        </Button>
      }
    >
      <ScrollArea className="min-h-0 grow">
        <div className="flex flex-col">
          <div className="flex shrink-0 flex-col items-center border-b px-1 py-2">
            <div className="flex w-full items-center justify-between px-2 pb-1">
              <span className="text-sm font-medium">{monthYear(month)}</span>
              <div className="flex items-center justify-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Previous month"
                  onClick={() => setMonth(addMonths(month, -1))}
                >
                  <ChevronLeftIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Next month"
                  onClick={() => setMonth(addMonths(month, 1))}
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
            <Calendar
              mode="single"
              timeZone={CLINIC_TZ}
              required
              month={month}
              onMonthChange={setMonth}
              selected={date}
              onSelect={(day) => {
                if (!isSameMonth(day, month)) setMonth(day)
                pick(day)
              }}
              today={new Date(renderedAt)}
              hideNavigation
              className="w-full p-0 [--cell-size:--spacing(7)]"
              classNames={{ month_caption: "hidden", today: "bg-accent" }}
              components={{
                DayButton: ({ children, ...props }) => (
                  <CalendarDayButton {...props}>
                    {booked.has(isoDay(props.day.date)) && (
                      <span
                        aria-hidden
                        className="size-1 rounded-full bg-primary in-data-[selected-single=true]:bg-primary-foreground!"
                      />
                    )}
                    {children}
                  </CalendarDayButton>
                ),
              }}
            />
          </div>
          <PanelSection
            label="My Chairs"
            count={`${chairs.shown.length} of ${practitioners.length}`}
          >
            <div role="list" className="px-2">
              <div role="listitem">{group("Daily chairs", daily, true)}</div>
              <div role="listitem">{group("Relief chairs", relief, false)}</div>
            </div>
            <div className="px-2">
              <Button
                variant="ghost"
                className="w-full justify-start px-2 text-muted-foreground"
                onClick={() => chairs.show(practitioners.map((p) => p.id))}
              >
                <PlusIcon data-icon="inline-start" className="size-3.5" />
                Show every chair
              </Button>
            </div>
          </PanelSection>
          <PanelSection label="Up Next" count={upNext.length}>
            <div role="list" className="flex flex-col gap-0.5 px-1.5">
              {(showAll ? upNext : upNext.slice(0, SHOWN)).map((b) => (
                <div role="listitem" key={b.id}>
                  <Button
                    variant="ghost"
                    aria-label={`Open ${b.patient.firstName} ${b.patient.lastName}, ${clock(b.startsAt)}`}
                    className="h-auto w-full items-start gap-2.5 px-3 py-2 text-left"
                    onClick={() => openSheet({ kind: "booking", id: b.id })}
                  >
                    <span
                      aria-hidden
                      className="w-1 shrink-0 self-stretch rounded-full"
                      style={{ backgroundColor: BOOKING_STATUS[b.status].chip }}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm leading-snug font-medium text-foreground">
                        {b.patient.firstName} {b.patient.lastName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {clock(b.startsAt)} to {clock(b.endsAt)} ·{" "}
                        {b.procedure.name}
                      </span>
                    </div>
                    <AvatarGroup className="ml-auto -space-x-1">
                      <PatientAvatar patient={b.patient} size={20} />
                      <PractitionerAvatar
                        practitioner={b.practitioner}
                        size={20}
                      />
                    </AvatarGroup>
                  </Button>
                </div>
              ))}
            </div>
            {upNext.length > SHOWN && (
              <div className="px-1.5 pt-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2 text-muted-foreground"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? "Show fewer" : `Show all ${upNext.length}`}
                </Button>
              </div>
            )}
          </PanelSection>
        </div>
      </ScrollArea>
      <div className="flex shrink-0 flex-col gap-1 border-t px-3 py-2.5">
        <Button
          className="w-full justify-start"
          onClick={() =>
            openSheet({ kind: "new-booking", defaults: newAt(date) })
          }
        >
          <PlusIcon data-icon="inline-start" />
          New Booking
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground"
          onClick={() =>
            toast.add({
              type: "info",
              title: "Share availability",
              description:
                "Sends the open slots on the board to a patient. Connect your sharing service to issue a link.",
            })
          }
        >
          <Share2Icon data-icon="inline-start" />
          Share Availability
        </Button>
      </div>
    </ContextPanel>
  )
}

/** A chair in My Chairs: its color, whether the board shows it, and a ⋯ menu for its color and focus */
function ChairRow({
  chair,
  checked,
  onCheckedChange,
  onOnly,
}: {
  chair: Practitioner
  checked: boolean
  onCheckedChange: (on: boolean) => void
  onOnly: () => void
}) {
  const [color, setColor] = useState(chair.color)
  const [, startTransition] = useTransition()
  function paint(next: ChairColor) {
    setColor(next)
    startTransition(async () => {
      const result = outcome(await setChairColor({ id: chair.id, color: next }))
      if (!result.ok) toast.add({ type: "error", title: result.error })
    })
  }
  return (
    <div className="group flex h-9 items-center gap-2 pr-1 pl-5">
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: CHAIR_COLOR[color] }}
      />
      <Checkbox
        aria-label={`Toggle ${chair.name}`}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <span className="flex-1 truncate text-sm font-normal">{chair.name}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Options for ${chair.name}`}
              className="size-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
            />
          }
        >
          <EllipsisIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <div className="grid grid-cols-6 gap-1.5 p-1.5">
              {CHAIR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  aria-pressed={c === color}
                  onClick={() => paint(c)}
                  className={cn(
                    "flex size-4.5 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                  style={{ backgroundColor: CHAIR_COLOR[c] }}
                >
                  {c === color && (
                    <CheckIcon
                      aria-hidden
                      strokeWidth={3}
                      className="size-2.5 text-white"
                    />
                  )}
                </button>
              ))}
            </div>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={onOnly}>
              <FocusIcon />
              Show only this chair
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCheckedChange(false)}>
              <EyeOffIcon />
              Hide from board
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
