"use client"

import {
  BriefcaseMedicalIcon,
  CalendarIcon,
  ClockIcon,
  FunnelIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useOptimistic, useState, useTransition } from "react"

import { moveBooking } from "@/app/actions/bookings"
import { Portrait, PractitionerAvatar } from "@/components/shared/avatars"
import { StatusBadge } from "@/components/shared/tone-badge"
import { usePractice } from "@/components/shell/practice"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { EventCalendarRenderEventProps } from "@/components/ui/event-calendar/event-calendar"
import { EventCalendar } from "@/components/ui/event-calendar/event-calendar"
import { EventCalendarContent } from "@/components/ui/event-calendar/event-calendar-content"
import {
  EventCalendarNav,
  EventCalendarNavNext,
  EventCalendarNavPrev,
  EventCalendarNavToday,
  EventCalendarToolbar,
} from "@/components/ui/event-calendar/event-calendar-nav"
import type { CalendarEvent } from "@/components/ui/event-calendar/event-calendar-types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { LogEntry, SheetEntry, WeekSheet } from "@/db/queries/calendar"
import { BOOKING_STATUSES, type BookingStatus } from "@/db/schema"
import { openSheet } from "@/hooks/use-sheet"
import { outcome } from "@/lib/action-result"
import {
  bookedInView,
  type CalendarView,
  calendarHref,
  clickedFraction,
  quarterAt,
} from "@/lib/calendar"
import { CLINIC_TZ, clock, isSameDay, startOfDay } from "@/lib/dates"
import { patientPhoto } from "@/lib/portraits"
import { BLOCK_CHIP, BOOKING_STATUS } from "@/lib/tones"

import { ChairMenu, useShownChairs } from "./chair-menu"
import { LogHistory } from "./log-history"

type Entry =
  | { kind: "booking"; booking: SheetEntry }
  | { kind: "block"; title: string }

/**
 * The Calendar: the Calendar and Log History tabs, then the Event Calendar with the shown chairs as columns
 * (Day) or the week's days (Week). A chip opens its appointment; empty time books that chair at that quarter hour;
 * chips drag to another time or chair and resize from their edges.
 */
export function CalendarBoard({
  date,
  view,
  sheet,
  log,
}: {
  date: Date
  view: CalendarView
  sheet: WeekSheet
  log: LogEntry[]
}) {
  const router = useRouter()
  const { practitioners, rooms, renderedAt, settings } = usePractice()
  // The day by provider (a column per chair) or by operatory (a column per room)
  const [columns, setColumns] = useState<"providers" | "operatories">(
    "providers"
  )
  const byRoom = view === "day" && columns === "operatories"
  const hours = settings.hours
  const [, startTransition] = useTransition()
  const [statuses, setStatuses] = useState<BookingStatus[]>([
    ...BOOKING_STATUSES,
  ])
  const chairState = useShownChairs()
  const chairs = practitioners.filter((p) => chairState.shown.includes(p.id))
  const shown = new Set(chairs.map((c) => c.id))

  const serverEvents: CalendarEvent<Entry>[] = [
    ...sheet.bookings
      .filter((b) => shown.has(b.practitionerId) && statuses.includes(b.status))
      .map((b) => ({
        id: `b${b.id}`,
        title: `${b.patient.firstName} ${b.patient.lastName}`,
        start: b.startsAt,
        end: b.endsAt,
        color: BOOKING_STATUS[b.status].chip,
        resourceId: byRoom ? (b.room?.id ?? "") : b.practitionerId,
        data: { kind: "booking" as const, booking: b },
      })),
    // Held time belongs to a chair, not a room
    ...sheet.blocks
      .filter((k) => !byRoom && shown.has(k.practitionerId))
      .map((k) => ({
        id: `k${k.id}`,
        title: k.title,
        start: k.startsAt,
        end: k.endsAt,
        color: BLOCK_CHIP,
        resourceId: k.practitionerId,
        readOnly: true,
        data: { kind: "block" as const, title: k.title },
      })),
  ]
  const [events, setEvents] = useOptimistic(serverEvents)

  // What "N booked in view" counts: the day's (Day) or the week's (Week) shown bookings
  const inView = sheet.bookings.filter(
    (b) =>
      shown.has(b.practitionerId) &&
      statuses.includes(b.status) &&
      (view === "week" || isSameDay(b.startsAt, date))
  )

  function go(next: Date, nextView: CalendarView) {
    startTransition(() =>
      router.replace(calendarHref(next, nextView, new Date(renderedAt)), {
        scroll: false,
      })
    )
  }

  return (
    <Tabs defaultValue="calendar" className="min-h-0 flex-1 gap-0">
      <div className="flex shrink-0 items-stretch justify-between gap-3 border-b pe-4">
        <TabsList variant="line" className="h-11! gap-6 py-0! ps-4">
          <TabsTrigger
            value="calendar"
            className="h-full! px-1 after:-bottom-px!"
          >
            Calendar
          </TabsTrigger>
          <TabsTrigger value="log" className="h-full! px-1 after:-bottom-px!">
            Log History
          </TabsTrigger>
        </TabsList>
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarIcon className="size-3.5 shrink-0" />
          <span className="tabular-nums">{bookedInView(inView)}</span>
          <span className="hidden sm:inline">booked in view</span>
        </div>
      </div>
      <TabsContent value="calendar" className="flex min-h-0 flex-1 flex-col">
        <EventCalendar<Entry>
          className="min-w-0 flex-1 [--ec-event-gutter:0px]"
          view={view === "day" ? "resource" : "week"}
          views={["resource", "week"]}
          date={date}
          onDateChange={(d) => go(startOfDay(d), view)}
          events={events}
          resources={
            byRoom
              ? rooms.map((r) => ({ id: r.id, title: r.name }))
              : chairs.map((c) => ({ id: c.id, title: c.name }))
          }
          dayStartHour={hours.open}
          dayEndHour={hours.close}
          snapDuration={15}
          scrollToHour={hours.open}
          navButtonSize="default"
          classNames={{ resourceHeader: "p-0 text-start whitespace-normal" }}
          weekStartsOn={0}
          timeZone={CLINIC_TZ}
          interactions={{ drag: true, resize: true, selectSlot: false }}
          onEventClick={(o) =>
            o.event.data?.kind === "booking" &&
            openSheet({ kind: "booking", id: o.event.data.booking.id })
          }
          onSlotClick={(slot, e) => {
            if (slot.allDay) return
            openSheet({
              kind: "new-booking",
              defaults: {
                practitionerId: byRoom
                  ? chairs[0]?.id
                  : (slot.resourceId ?? chairs[0]?.id),
                procedureId: "checkup",
                startsAt: quarterAt(
                  slot.date,
                  clickedFraction(e),
                  hours
                ).getTime(),
              },
            })
          }}
          onEventUpdate={(u) => {
            const data = u.event.data
            if (data?.kind !== "booking") return false
            const moved = {
              startsAt: u.start,
              endsAt: u.end,
              ...(byRoom
                ? { roomId: u.resourceId }
                : { practitionerId: u.resourceId }),
            }
            startTransition(async () => {
              setEvents(
                events.map((e) =>
                  e.id === u.event.id
                    ? {
                        ...e,
                        start: u.start,
                        end: u.end,
                        resourceId: u.resourceId ?? e.resourceId,
                      }
                    : e
                )
              )
              const result = outcome(
                await moveBooking({ id: data.booking.id, move: moved })
              )
              if (!result.ok) toast.add({ type: "error", title: result.error })
            })
            return true
          }}
          renderEvent={(p) => <Chip {...p} />}
          renderResourceHeader={({ resource }) => {
            if (byRoom) {
              const here = sheet.bookings.filter(
                (b) =>
                  b.room?.id === resource.id &&
                  b.status !== "cancelled" &&
                  isSameDay(b.startsAt, date)
              )
              const who = chairs.filter((c) =>
                here.some((b) => b.practitionerId === c.id)
              )
              return (
                <div className="flex items-center gap-2 p-2 text-start">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">
                      {resource.title}
                    </span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {here.length} {here.length === 1 ? "patient" : "patients"}
                    </span>
                  </div>
                  <div className="flex shrink-0 *:not-first:-ms-1.5">
                    {who.map((c) => (
                      <PractitionerAvatar
                        key={c.id}
                        practitioner={c}
                        size={24}
                        className="ring-2 ring-background"
                      />
                    ))}
                  </div>
                </div>
              )
            }
            const chair = chairs.find((c) => c.id === resource.id)
            const patients = sheet.bookings.filter(
              (b) =>
                b.practitionerId === resource.id &&
                b.status !== "cancelled" &&
                isSameDay(b.startsAt, date)
            ).length
            return (
              <div className="flex items-center gap-2 p-2 text-start">
                {chair && <PractitionerAvatar practitioner={chair} size={32} />}
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">
                    {resource.title}
                  </span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {patients} {patients === 1 ? "patient" : "patients"}
                  </span>
                </div>
              </div>
            )
          }}
        >
          <div className="flex flex-wrap items-center gap-x-2 pe-2">
            <EventCalendarNav className="w-full min-w-0 flex-nowrap sm:w-auto sm:flex-1">
              <EventCalendarNavToday />
              <div className="flex items-center">
                <EventCalendarNavPrev />
                <EventCalendarNavNext />
              </div>
            </EventCalendarNav>
            <EventCalendarToolbar className="w-full ps-2 pb-2 max-sm:flex-wrap sm:w-auto sm:ps-0 sm:pb-0">
              <ToggleGroup
                aria-label="Board view"
                variant="outline"
                spacing={0}
                value={[view]}
                onValueChange={(v) => {
                  const next = v[0] as CalendarView | undefined
                  if (next && next !== view) go(date, next)
                }}
                className="shrink-0"
              >
                <ToggleGroupItem value="day">Day</ToggleGroupItem>
                <ToggleGroupItem value="week">Week</ToggleGroupItem>
              </ToggleGroup>
              {view === "day" && (
                <ToggleGroup
                  aria-label="Columns"
                  variant="outline"
                  spacing={0}
                  value={[columns]}
                  onValueChange={(v) => {
                    const next = v[0] as typeof columns | undefined
                    if (next) setColumns(next)
                  }}
                  className="shrink-0"
                >
                  <ToggleGroupItem value="providers">Providers</ToggleGroupItem>
                  <ToggleGroupItem value="operatories">
                    Operatories
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
              <ChairMenu
                chairs={chairState}
                trigger={
                  <Button variant="outline" aria-label="Choose chairs">
                    <BriefcaseMedicalIcon data-icon="inline-start" />
                    <span className="truncate">
                      {chairs.length} of {practitioners.length} Chairs
                    </span>
                  </Button>
                }
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" aria-label="Filter by status" />
                  }
                >
                  <FunnelIcon data-icon="inline-start" />
                  <span className="hidden sm:inline">Filters</span>
                  <Badge variant="outline" radius="full">
                    {statuses.length}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-46">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Status</DropdownMenuLabel>
                    {BOOKING_STATUSES.map((s) => (
                      <DropdownMenuCheckboxItem
                        key={s}
                        checked={statuses.includes(s)}
                        closeOnClick={false}
                        onCheckedChange={(on) =>
                          setStatuses(
                            on
                              ? BOOKING_STATUSES.filter(
                                  (x) => x === s || statuses.includes(x)
                                )
                              : statuses.filter((x) => x !== s)
                          )
                        }
                      >
                        {BOOKING_STATUS[s].label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </EventCalendarToolbar>
          </div>
          <EventCalendarContent className="[--ec-resource-col-min:8rem]" />
        </EventCalendar>
      </TabsContent>
      <TabsContent value="log" className="flex min-h-0 flex-1 flex-col">
        <LogHistory log={log} />
      </TabsContent>
    </Tabs>
  )
}

/** The chip: the patient's face and name with the status badge, then the start and procedure on longer chips. A
 * held block is hatched, its title centered */
function Chip({ occurrence, segment }: EventCalendarRenderEventProps<Entry>) {
  const data = occurrence.event.data
  if (data?.kind === "block")
    return (
      <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,color-mix(in_oklab,var(--color-border)_35%,transparent)_5px,color-mix(in_oklab,var(--color-border)_35%,transparent)_6px)] text-xs font-medium text-muted-foreground">
        <ClockIcon className="size-3 shrink-0" />
        <span className="truncate">{data.title}</span>
      </span>
    )
  if (data?.kind !== "booking") return null
  const b = data.booking
  const long = (segment.endMin ?? 0) - (segment.startMin ?? 0) >= 45
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="flex min-w-0 items-center gap-1.5">
        <Portrait
          src={patientPhoto(b.patient.chart)}
          name={occurrence.event.title}
          size={16}
        />
        <span className="truncate font-medium">{occurrence.event.title}</span>
        <span className="hidden shrink-0 items-center @[9rem]:flex">
          <StatusBadge status={b.status} />
        </span>
        <span className="sr-only">{BOOKING_STATUS[b.status].label}</span>
      </span>
      {long && (
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="shrink-0 tabular-nums">
            {clock(occurrence.start)}
          </span>
          <span
            aria-hidden
            className="size-1 shrink-0 rounded-full bg-muted-foreground/40"
          />
          <span className="truncate">{b.procedure.name}</span>
        </span>
      )}
    </span>
  )
}
