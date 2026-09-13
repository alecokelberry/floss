"use client"

import { BellIcon, CalendarIcon, CheckCheckIcon } from "lucide-react"
import { useOptimistic, useState, useTransition } from "react"

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications"
import { PatientAvatar } from "@/components/shared/avatars"
import { ToneBadge } from "@/components/shared/tone-badge"
import { usePractice } from "@/components/shell/practice"
import { RAIL_BUTTON, RailLabel } from "@/components/shell/rail-label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Notification } from "@/db/queries/shell"
import { openSheet } from "@/hooks/use-sheet"
import { clock } from "@/lib/dates"
import { EVENT_KIND } from "@/lib/tones"
import { cn } from "@/lib/utils"

/**
 * The bell: a 320px popover beside it, the board's log newest first. Each line is the patient's face (a dot while
 * unread), who and what happened with its kind's badge, the procedure and detail, the practitioner, when, and the
 * chart number; a click reads it and opens that booking. Settings → Notifications chooses which kinds reach it.
 */
export function Notifications({ items }: { items: Notification[] }) {
  const { settings } = usePractice()
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const [read, markRead] = useOptimistic(
    new Set(items.filter((n) => n.readAt).map((n) => n.id)),
    (state, ids: number[]) => new Set([...state, ...ids])
  )
  const shown = items.filter((n) => settings.alerts[n.kind])
  const unread = shown.filter((n) => !read.has(n.id)).length

  function go(n: Notification) {
    setOpen(false)
    startTransition(async () => {
      markRead([n.id])
      await markNotificationRead(n.id)
    })
    if (n.bookingId) openSheet({ kind: "booking", id: n.bookingId })
  }

  function readAll() {
    startTransition(async () => {
      markRead(shown.map((n) => n.id))
      await markAllNotificationsRead()
    })
  }

  return (
    <SidebarMenuItem>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <SidebarMenuButton
              tooltip={{ children: "Notifications", hidden: false }}
              aria-label="Notifications"
              className={cn("relative", RAIL_BUTTON)}
            />
          }
        >
          <BellIcon />
          <RailLabel>Notifications</RailLabel>
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-primary in-data-[mobile=true]:right-auto in-data-[mobile=true]:left-6"
            />
          )}
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="end"
          sideOffset={8}
          className="w-80 gap-0 p-0"
        >
          <div className="flex items-center justify-between border-b border-foreground/4 px-4 py-3">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <Badge
                  radius="full"
                  className="h-4 min-w-4 px-1 py-px text-[0.6rem] tabular-nums"
                >
                  {unread}
                </Badge>
              )}
            </span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Mark all as read"
                    disabled={unread === 0}
                    className="size-6 opacity-60 hover:opacity-100 [&_svg]:size-3.5"
                    onClick={readAll}
                  />
                }
              >
                <CheckCheckIcon />
              </TooltipTrigger>
              <TooltipContent>Mark all as read</TooltipContent>
            </Tooltip>
          </div>
          {shown.length > 0 && (
            <ScrollArea className="max-h-80 [&>[data-slot=scroll-area-viewport]]:max-h-80">
              {shown.map((n, i) => {
                const kind = EVENT_KIND[n.kind]
                return (
                  <div key={n.id}>
                    {i > 0 && <Separator />}
                    <button
                      type="button"
                      onClick={() => go(n)}
                      className="flex w-full items-start gap-1.5 p-3 text-left outline-none hover:bg-muted focus-visible:bg-muted"
                    >
                      <span className="relative me-1.5 shrink-0">
                        <PatientAvatar patient={n.patient} size={24} />
                        {!read.has(n.id) && (
                          <span
                            aria-hidden
                            className="absolute -top-0.5 left-[18px] size-2 rounded-full bg-primary"
                          />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-2">
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0 text-sm leading-[1.375] font-medium">
                            <span className="text-primary">
                              {n.patient.firstName} {n.patient.lastName}
                            </span>{" "}
                            {kind.says}
                          </span>
                          <ToneBadge tone={kind.badge}>{kind.label}</ToneBadge>
                        </span>
                        <span className="-mt-1 text-xs font-medium text-muted-foreground">
                          {n.procedure.name} · {n.detail}
                        </span>
                        <span className="flex w-fit items-center gap-1.5 rounded-md border border-foreground/5 bg-secondary/50 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                          <CalendarIcon
                            aria-hidden
                            className="size-3 opacity-60"
                          />
                          <span className="text-foreground">
                            {n.practitioner.name}
                          </span>
                        </span>
                        <span className="-mt-1.5 flex items-center gap-2 pt-0.5 text-[11px] font-medium text-muted-foreground">
                          {clock(n.at)}
                          <span className="flex h-[18px] overflow-hidden rounded-md border border-foreground/6 text-[10px] leading-4">
                            <span className="border-r border-foreground/5 bg-secondary/60 px-1.5 leading-4">
                              Chart
                            </span>
                            <span className="px-1.5 leading-4 text-foreground">
                              {n.patient.chart}
                            </span>
                          </span>
                        </span>
                      </span>
                    </button>
                  </div>
                )
              })}
            </ScrollArea>
          )}
        </PopoverContent>
      </Popover>
    </SidebarMenuItem>
  )
}
