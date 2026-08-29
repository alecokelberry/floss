"use client"

import {
  Building2Icon,
  CalendarIcon,
  ChevronDownIcon,
  FlagIcon,
  HashIcon,
  LayoutGridIcon,
  ListChecksIcon,
  MessageSquareIcon,
  PackageIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useOptimistic, useTransition } from "react"

import { moveTask } from "@/app/actions/tasks"
import { Portrait } from "@/components/shared/avatars"
import { CategoryTag } from "@/components/shared/tone-badge"
import { CheckBadges } from "@/components/sheets/task-sheet"
import { usePractice } from "@/components/shell/practice"
import { AvatarGroup } from "@/components/ui/avatar"
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
import {
  EventCalendar,
  type EventCalendarRenderEventProps,
} from "@/components/ui/event-calendar/event-calendar"
import { EventCalendarContent } from "@/components/ui/event-calendar/event-calendar-content"
import {
  EventCalendarNav,
  EventCalendarNavNext,
  EventCalendarNavPrev,
  EventCalendarNavToday,
  EventCalendarToolbar,
  EventCalendarViewSwitcher,
} from "@/components/ui/event-calendar/event-calendar-nav"
import type {
  CalendarEvent,
  CalendarView as EcView,
} from "@/components/ui/event-calendar/event-calendar-types"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Progress, ProgressLabel } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import type { Task } from "@/db/queries/tasks"
import { openSheet } from "@/hooks/use-sheet"
import {
  setTaskFilters,
  toggled,
  useTaskFilters,
} from "@/hooks/use-task-filters"
import { outcome } from "@/lib/action-result"
import { dayOf } from "@/lib/bookings"
import {
  clickedFraction,
  type PlannerView,
  plannerHref,
  quarterAt,
} from "@/lib/calendar"
import { CLINIC_TZ, clock, fullDate, monthDay, startOfDay } from "@/lib/dates"
import { teamPhoto } from "@/lib/portraits"
import { CATEGORIES, CLINICIANS } from "@/lib/tasks"
import { TASK_CATEGORY } from "@/lib/tones"
import { cn } from "@/lib/utils"

const WORK_ICON = {
  Tasks: ListChecksIcon,
  "Treatment Plan": LayoutGridIcon,
  Paperwork: PackageIcon,
}

/**
 * The Appointments: the practice's planner on the Event Calendar (Month, Week, Day, Agenda; Week first, weeks
 * from Monday). Category and Clinician narrow it; a chip previews on hover and opens its sheet on click; empty time
 * or an all-day cell starts a New Appointment there; chips drag, resize and move in and out of the all-day row.
 */
export function AppointmentsBoard({
  date,
  view,
  tasks,
}: {
  date: Date
  view: PlannerView
  tasks: Task[]
}) {
  const router = useRouter()
  const { renderedAt, settings } = usePractice()
  const filters = useTaskFilters()
  const [, startTransition] = useTransition()

  const serverEvents: CalendarEvent<Task>[] = tasks
    .filter(
      (t) =>
        filters.categories.includes(t.category) &&
        filters.clinicians.includes(t.clinician)
    )
    .map((t) => ({
      id: `t${t.id}`,
      title: t.title,
      start: t.startsAt,
      end: t.endsAt,
      allDay: t.allDay,
      color: TASK_CATEGORY[t.category].color,
      data: t,
    }))
  const [events, setEvents] = useOptimistic(serverEvents)

  function go(next: Date, nextView: PlannerView) {
    startTransition(() =>
      router.replace(plannerHref(next, nextView, new Date(renderedAt)), {
        scroll: false,
      })
    )
  }

  return (
    <EventCalendar<Task>
      className="min-h-0 min-w-0 flex-1 [--ec-event-gutter:0px]"
      view={view}
      views={["month", "week", "day", "agenda"]}
      onViewChange={(v: EcView) => go(date, v as PlannerView)}
      date={date}
      onDateChange={(d) => go(startOfDay(d), view)}
      events={events}
      weekStartsOn={1}
      timeZone={CLINIC_TZ}
      dayStartHour={settings.hours.open}
      dayEndHour={settings.hours.close}
      snapDuration={15}
      scrollToHour={settings.hours.open}
      agendaDayCount={30}
      navButtonSize="default"
      interactions={{ drag: true, resize: true, selectSlot: false }}
      classNames={{ allDaySection: "[--ec-month-bar-h:6.25rem]" }}
      onEventClick={(o) =>
        o.event.data && openSheet({ kind: "task", id: o.event.data.id })
      }
      onSlotClick={(slot, e) => {
        if (slot.allDay || slot.view === "month")
          openSheet({
            kind: "new-task",
            defaults: {
              startsAt: startOfDay(slot.date).getTime(),
              allDay: true,
            },
          })
        else
          openSheet({
            kind: "new-task",
            defaults: {
              startsAt: quarterAt(
                slot.date,
                clickedFraction(e),
                settings.hours
              ).getTime(),
              minutes: 30,
            },
          })
      }}
      onEventUpdate={(u) => {
        const t = u.event.data
        if (!t) return false
        const move = { startsAt: u.start, endsAt: u.end, allDay: u.allDay }
        startTransition(async () => {
          setEvents(
            events.map((e) =>
              e.id === u.event.id
                ? { ...e, start: u.start, end: u.end, allDay: u.allDay }
                : e
            )
          )
          const result = outcome(await moveTask({ id: t.id, move }))
          if (!result.ok) toast.add({ type: "error", title: result.error })
        })
        return true
      }}
      renderEvent={(p) =>
        // The month view keeps the pill: undefined falls back to it
        p.view === "month" ? undefined : <TaskChip {...p} />
      }
    >
      <div className="flex flex-wrap items-center gap-x-2 pe-2">
        <EventCalendarNav className="w-full min-w-0 flex-nowrap sm:w-auto sm:flex-1">
          <EventCalendarNavToday />
          <EventCalendarViewSwitcher />
          <div className="flex items-center">
            <EventCalendarNavPrev />
            <EventCalendarNavNext />
          </div>
        </EventCalendarNav>
        <EventCalendarToolbar className="w-full ps-2 pb-2 max-sm:flex-wrap sm:w-auto sm:ps-0 sm:pb-0">
          <FilterMenu
            label="Category"
            options={CATEGORIES.map((c) => ({
              value: c,
              label: TASK_CATEGORY[c].label,
            }))}
            selected={filters.categories}
            onChange={(categories) =>
              setTaskFilters({
                categories: categories as typeof filters.categories,
              })
            }
          />
          <FilterMenu
            label="Clinician"
            options={CLINICIANS.map((c) => ({ value: c, label: c }))}
            selected={filters.clinicians}
            onChange={(clinicians) => setTaskFilters({ clinicians })}
          />
        </EventCalendarToolbar>
      </div>
      <EventCalendarContent />
    </EventCalendar>
  )
}

/** A checkbox menu: the Category (in each category's color) or Clinician filter, its count on the trigger */
export function FilterMenu({
  label,
  options,
  selected,
  onChange,
  trigger,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  trigger?: React.ReactElement
}) {
  return (
    <DropdownMenu>
      {trigger ? (
        <DropdownMenuTrigger render={trigger} />
      ) : (
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          {label}
          <span className="text-muted-foreground tabular-nums">
            {selected.length}
          </span>
          <ChevronDownIcon data-icon="inline-end" />
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {options.map((o) => (
            <DropdownMenuCheckboxItem
              key={o.value}
              checked={selected.includes(o.value)}
              closeOnClick={false}
              onCheckedChange={(on) =>
                onChange(
                  toggled(
                    options.map((x) => x.value),
                    selected,
                    o.value,
                    on
                  )
                )
              }
            >
              {o.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The planner chip: its reference (or time, or day) and category tag, the title, then the workstream with its
 * progress or the patient; under 45 minutes one line with a dot.
 */
function TaskChip({
  occurrence,
  segment,
}: EventCalendarRenderEventProps<Task>) {
  const t = occurrence.event.data
  if (!t) return null
  const minutes =
    (occurrence.end.getTime() - occurrence.start.getTime()) / 60_000
  const allDay = occurrence.allDay
  const height = (segment.endMin ?? 0) - (segment.startMin ?? 0)
  if (!allDay && height < 45)
    return (
      <TaskHover task={t}>
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full bg-(--ec-event-color)"
        />
        <span className="truncate font-medium">{t.title}</span>
        <span className="shrink-0 text-muted-foreground">
          {clock(occurrence.start)}
        </span>
      </TaskHover>
    )
  const Work = t.workstream ? WORK_ICON[t.workstream] : null
  const third = allDay || height >= 75
  return (
    <TaskHover task={t}>
      <span className="flex h-full w-full min-w-0 flex-col justify-start gap-1 overflow-hidden py-0.5">
        <span className="flex w-full min-w-0 items-center gap-1.5">
          <span className="hidden min-w-0 @[7rem]:flex">
            {t.reference ? (
              <span className="flex min-w-0 items-center gap-0.5 text-foreground/75">
                <HashIcon className="size-3 shrink-0" />
                <span className="truncate font-medium">{t.reference}</span>
              </span>
            ) : allDay ? (
              <span className="flex min-w-0 items-center gap-0.5 text-foreground/75">
                <CalendarIcon className="size-3 shrink-0" />
                <span className="truncate font-medium">
                  {monthDay(occurrence.start)}
                </span>
              </span>
            ) : (
              <span className="truncate text-foreground/75">
                {clock(occurrence.start)}, {minutes} min
              </span>
            )}
          </span>
          <span className="ms-auto shrink-0">
            <CategoryTag category={t.category} className="shrink-0" />
          </span>
        </span>
        <span
          className={cn(
            "w-full min-w-0 font-medium text-foreground",
            allDay ? "line-clamp-2" : "truncate"
          )}
        >
          {t.title}
        </span>
        {third &&
          (Work ? (
            <span className="flex w-full min-w-0 items-center gap-1.5 text-foreground/75">
              <Work className="size-3.5 shrink-0" />
              <span className="truncate">{t.workstream}</span>
              {t.workTotal !== null && (
                <span className="ms-auto shrink-0 tabular-nums">
                  {t.workDone}/{t.workTotal}
                </span>
              )}
            </span>
          ) : (
            <span className="flex w-full min-w-0 items-center gap-1.5 text-foreground/75">
              <Building2Icon className="size-3.5 shrink-0" />
              <span className="truncate">{t.patient}</span>
            </span>
          ))}
        {allDay && t.workTotal !== null && t.workstream && (
          <Progress
            value={Math.round(((t.workDone ?? 0) / t.workTotal) * 100)}
            className="h-1 w-full"
          >
            <ProgressLabel className="sr-only">
              {t.workstream} progress
            </ProgressLabel>
          </Progress>
        )}
      </span>
    </TaskHover>
  )
}

/** The chip's hover card: the entry's facts at a glance, never anything to click */
function TaskHover({
  task: t,
  children,
}: {
  task: Task
  children: React.ReactNode
}) {
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex min-h-4 items-center gap-3">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 items-center">{value}</div>
    </div>
  )
  const due = dayOf(t.dueOn)
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={500}
        render={
          <span className="flex h-full w-full min-w-0 items-center gap-1.5" />
        }
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="start" className="w-96">
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {t.title}
            </span>
            <CategoryTag category={t.category} />
          </div>
          <div className="flex flex-col gap-1.5">
            {row("Patient", t.patient)}
            {row(
              "Clinician",
              <span className="flex min-w-0 items-center gap-1.5">
                <Portrait
                  src={teamPhoto(t.clinician)}
                  name={t.clinician}
                  size={16}
                />
                <span className="truncate">{t.clinician}</span>
              </span>
            )}
            {row("Requirement", t.requirement || "Unassigned")}
            {row("Due", fullDate(due))}
            {t.sourceTitle &&
              row(
                "Source",
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-medium">{t.sourceTitle}</span>
                </span>
              )}
            {t.stage && row("Stage", t.stage)}
            {(t.status || t.priority) &&
              row(
                "Status",
                <span className="flex flex-wrap gap-1">
                  {t.status && <Badge variant="outline">{t.status}</Badge>}
                  {t.priority && (
                    <Badge variant="outline">
                      <FlagIcon className="text-foreground" />
                      {t.priority}
                    </Badge>
                  )}
                </span>
              )}
            {t.room && row("Room", t.room)}
            {t.attendeeCount > 0 &&
              row(
                "Attendees",
                <span className="flex items-center gap-1.5">
                  <AvatarGroup className="*:data-[slot=avatar]:ring-1 *:data-[slot=avatar]:ring-popover">
                    {t.attendees.slice(0, 3).map((a) => (
                      <Portrait
                        key={a.name ?? a.initials}
                        src={a.name ? teamPhoto(a.name) : undefined}
                        name={a.name ?? a.initials}
                        size={16}
                      />
                    ))}
                  </AvatarGroup>
                  <span className="text-muted-foreground tabular-nums">
                    {t.attendeeCount}
                  </span>
                </span>
              )}
          </div>
          <Separator />
          <div className="flex min-h-5 items-center gap-1.5">
            <CheckBadges task={t} />
            <span className="ms-auto flex items-center gap-1.5">
              {t.notes > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MessageSquareIcon className="size-3.5" />
                  <span className="tabular-nums">{t.notes}</span>
                  <span className="sr-only">comments</span>
                </span>
              )}
              <Badge variant="secondary">{t.state}</Badge>
            </span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
