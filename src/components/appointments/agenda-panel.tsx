"use client"

import {
  MapPinIcon,
  MessageSquareIcon,
  PlusIcon,
  Settings2Icon,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

import { TeamAvatar } from "@/components/shared/avatars"
import { ContextPanel } from "@/components/shared/context-panel"
import { ToneBadge } from "@/components/shared/tone-badge"
import { usePractice } from "@/components/shell/practice"
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { Task } from "@/db/queries/tasks"
import { openSheet } from "@/hooks/use-sheet"
import { setTaskFilters, useTaskFilters } from "@/hooks/use-task-filters"
import { plannerHref, readPlannerParams } from "@/lib/calendar"
import { timeRange } from "@/lib/dates"
import { agendaGroups, CATEGORIES, moreAttendees } from "@/lib/tasks"
import { TASK_CATEGORY } from "@/lib/tones"
import { cn } from "@/lib/utils"

import { FilterMenu } from "./appointments-board"

/**
 * The Agenda panel: everything from today on, by day, through the same filters as the calendar; a day's heading
 * jumps the calendar there, a card opens its sheet.
 */
export function AgendaPanel({ tasks }: { tasks: Task[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const { renderedAt } = usePractice()
  const filters = useTaskFilters()
  const [, startTransition] = useTransition()
  const today = new Date(renderedAt)
  const groups = agendaGroups(
    tasks.filter(
      (t) =>
        filters.categories.includes(t.category) &&
        filters.clinicians.includes(t.clinician)
    ),
    today
  )

  function jump(day: Date) {
    const { view } = readPlannerParams(
      { view: params.get("view") ?? undefined },
      today
    )
    startTransition(() =>
      router.replace(plannerHref(day, view, today), { scroll: false })
    )
  }

  return (
    <ContextPanel
      title="Agenda"
      action={
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
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Filter appointments"
            >
              <Settings2Icon />
            </Button>
          }
        />
      }
    >
      <ScrollArea className="min-h-0 flex-1">
        {groups.length ? (
          groups.map((g, i) => (
            <div key={g.day.getTime()}>
              {i > 0 && <Separator />}
              <section className="py-3">
                <div className="px-3 pb-2">
                  <button
                    type="button"
                    aria-current={g.label === "Today" ? "date" : undefined}
                    onClick={() => jump(g.day)}
                    className={cn(
                      "rounded-md text-xs font-medium tracking-wide uppercase outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                      g.label === "Today"
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {g.label}
                  </button>
                </div>
                <div role="list" className="flex flex-col gap-2 px-3">
                  {g.items.map((t) => (
                    <div role="listitem" key={t.id}>
                      <AgendaCard task={t} />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ))
        ) : (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            Nothing scheduled from this day on.
          </p>
        )}
      </ScrollArea>
      <div className="shrink-0 border-t px-3 py-2.5">
        <Button
          className="w-full"
          onClick={() => openSheet({ kind: "new-task" })}
        >
          <PlusIcon data-icon="inline-start" />
          New Appointment
        </Button>
      </div>
    </ContextPanel>
  )
}

function AgendaCard({ task: t }: { task: Task }) {
  const more = moreAttendees(t.attendeeCount)
  return (
    <button
      type="button"
      onClick={() => openSheet({ kind: "task", id: t.id })}
      className="flex w-full flex-col gap-3 rounded-md border border-border/80 px-3 py-2 text-left outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex w-full items-start gap-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: TASK_CATEGORY[t.category].color }}
            />
            <span className="truncate text-sm leading-snug font-medium">
              {t.title}
            </span>
          </span>
          <span className="text-xs text-muted-foreground">
            {t.allDay ? "All day" : timeRange(t.startsAt, t.endsAt, " to ")}
          </span>
        </div>
        <ToneBadge
          tone={TASK_CATEGORY[t.category].badge}
          size="sm"
          className="shrink-0"
        >
          {TASK_CATEGORY[t.category].label}
        </ToneBadge>
      </div>
      {t.room && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPinIcon className="size-3" />
          {t.room}
        </span>
      )}
      {(t.attendeeCount > 0 || t.notes > 0) && (
        <div className="flex w-full items-center justify-between">
          {t.attendeeCount > 0 && (
            <span className="flex items-center gap-2">
              <AvatarGroup className="-space-x-1">
                {t.attendees.slice(0, 3).map((a) => (
                  <TeamAvatar
                    key={a.name ?? a.initials}
                    name={a.name}
                    initials={a.initials}
                    size={20}
                  />
                ))}
                {more > 0 && (
                  <AvatarGroupCount className="size-5 text-[8px] font-semibold text-foreground">
                    +{more}
                  </AvatarGroupCount>
                )}
              </AvatarGroup>
              <span className="text-xs text-muted-foreground">
                {t.attendeeCount}{" "}
                {t.attendeeCount === 1 ? "attendee" : "attendees"}
              </span>
            </span>
          )}
          {t.notes > 0 && (
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquareIcon className="size-3.5" />
              {t.notes} {t.notes === 1 ? "note" : "notes"}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
