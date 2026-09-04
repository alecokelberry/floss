"use client"

import { PencilIcon, Trash2Icon } from "lucide-react"
import { useState, useTransition } from "react"

import { deleteTask, loadTask } from "@/app/actions/tasks"
import { Portrait, TeamAvatar } from "@/components/shared/avatars"
import { CategoryTag, ToneBadge } from "@/components/shared/tone-badge"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SheetClose, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import type { Task } from "@/db/queries/tasks"
import { useRecord } from "@/hooks/use-record"
import { closeSheet, openSheet } from "@/hooks/use-sheet"
import { outcome } from "@/lib/action-result"
import { dayOf } from "@/lib/bookings"
import { clock, fullDate, monthDay, weekdayDate } from "@/lib/dates"
import { teamPhoto } from "@/lib/portraits"
import { lastDay } from "@/lib/tasks"

import { SheetBody, SheetFooter, SheetFrame, SheetX } from "./sheet-frame"

/** "Monday, September 28, 9:00 AM to 10:30 AM", "Monday, September 28" or "Sep 28 to Sep 29" */
function whenLine(t: Pick<Task, "startsAt" | "endsAt" | "allDay">) {
  if (!t.allDay)
    return `${weekdayDate(t.startsAt)}, ${clock(t.startsAt)} to ${clock(t.endsAt)}`
  const last = lastDay(t)
  return last.toDateString() === t.startsAt.toDateString()
    ? weekdayDate(t.startsAt)
    : `${monthDay(t.startsAt)} to ${monthDay(last)}`
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-5 items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
    </div>
  )
}

/** The attendee avatars: the first three people, then "+ N" for the rest, then the count */
function Attendees({
  task,
  size = 20,
}: {
  task: Pick<Task, "attendees" | "attendeeCount">
  size?: number
}) {
  const shown = task.attendees.slice(0, 3)
  const more = task.attendeeCount - shown.length
  return (
    <div className="flex items-center gap-2">
      <AvatarGroup>
        {shown.map((a) => (
          <TeamAvatar
            key={a.name ?? a.initials}
            name={a.name}
            initials={a.initials}
            size={size}
          />
        ))}
        {more > 0 && (
          <AvatarGroupCount
            className="font-medium"
            style={{ width: size, height: size, fontSize: 9 }}
          >
            +{more}
          </AvatarGroupCount>
        )}
      </AvatarGroup>
      <span className="text-xs text-muted-foreground tabular-nums">
        {task.attendeeCount}
      </span>
    </div>
  )
}

/**
 * The task sheet: the entry's title and category, when; then who (reference, patient, clinician, attendees), the
 * work (requirement, due, source, stage, workstream, status, room, state), its checks and its note.
 */
export function TaskSheet({ id }: { id: number }) {
  const t = useRecord(loadTask, id)
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  function remove() {
    startTransition(async () => {
      const result = outcome(await deleteTask(id))
      setConfirming(false)
      if (!result.ok) {
        toast.add({ type: "error", title: result.error })
        return
      }
      closeSheet()
      toast.add({
        type: "success",
        title: result.message,
        description: "Taken off the practice calendar.",
      })
    })
  }

  const checks = t && t.passes + t.fails + t.pending > 0
  return (
    <SheetFrame>
      <div className="flex shrink-0 items-start gap-2.5 border-b px-5 py-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <SheetTitle className="min-w-0 truncate text-lg leading-snug font-semibold">
              {t?.title ?? "Appointment"}
            </SheetTitle>
            {t && <CategoryTag category={t.category} className="shrink-0" />}
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            {t ? whenLine(t) : t === null ? "This appointment is gone." : " "}
          </SheetDescription>
        </div>
        <SheetX />
      </div>
      <SheetBody>
        {t ? (
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-2">
              {t.reference && (
                <Row label="Reference">
                  <span className="font-mono text-xs">{t.reference}</span>
                </Row>
              )}
              <Row label="Patient">{t.patient}</Row>
              <Row label="Clinician">
                <span className="flex min-w-0 items-center gap-2">
                  <Portrait
                    src={teamPhoto(t.clinician)}
                    name={t.clinician}
                    size={20}
                  />
                  <span className="truncate">{t.clinician}</span>
                </span>
              </Row>
              {t.attendeeCount > 0 && (
                <Row label="Attendees">
                  <Attendees task={t} />
                </Row>
              )}
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <Row label="Requirement">{t.requirement}</Row>
              <Row label="Due">{fullDate(dayOf(t.dueOn))}</Row>
              {t.sourceTitle && (
                <Row label="Source">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">
                      {t.sourceTitle}
                    </span>
                    {t.sourceOn && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {fullDate(dayOf(t.sourceOn))}
                      </span>
                    )}
                  </span>
                </Row>
              )}
              {t.stage && <Row label="Stage">{t.stage}</Row>}
              {t.workstream && (
                <Row label="Workstream">
                  <span className="flex items-center gap-2">
                    {t.workstream}
                    {t.workTotal !== null && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {t.workDone} / {t.workTotal}
                      </span>
                    )}
                  </span>
                </Row>
              )}
              {(t.status || t.priority || t.recurring) && (
                <Row label="Status">
                  <span className="flex flex-wrap gap-1.5">
                    {t.status && <Badge variant="outline">{t.status}</Badge>}
                    {t.priority && (
                      <Badge variant="outline">{t.priority}</Badge>
                    )}
                    {t.recurring && <Badge variant="outline">Recurring</Badge>}
                  </span>
                </Row>
              )}
              {t.room && <Row label="Room">{t.room}</Row>}
              <Row label="State">
                <Badge variant="secondary">{t.state}</Badge>
              </Row>
            </div>
            {checks && (
              <>
                <Separator />
                <CheckBadges task={t} />
              </>
            )}
            {t.note && (
              <>
                <Separator />
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {t.note}
                </p>
              </>
            )}
          </div>
        ) : (
          t === undefined && (
            <div className="flex flex-col gap-3 p-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-5 w-3/4" />
              ))}
            </div>
          )
        )}
      </SheetBody>
      <SheetFooter>
        <Button
          variant="outline"
          className="me-auto"
          disabled={!t}
          onClick={() => setConfirming(true)}
        >
          <Trash2Icon data-icon="inline-start" />
          Delete
        </Button>
        <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
        <Button
          disabled={!t}
          onClick={() => openSheet({ kind: "edit-task", id })}
        >
          <PencilIcon data-icon="inline-start" />
          Edit
        </Button>
      </SheetFooter>
      <DeleteTaskDialog
        open={confirming}
        onOpenChange={setConfirming}
        pending={pending}
        onDelete={remove}
      />
    </SheetFrame>
  )
}

/** Pass, Fail and Pending, each only when there are some */
export function CheckBadges({
  task,
}: {
  task: Pick<Task, "passes" | "fails" | "pending">
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {task.passes > 0 && (
        <ToneBadge tone="success-light">{task.passes} Pass</ToneBadge>
      )}
      {task.fails > 0 && (
        <ToneBadge tone="destructive-light">{task.fails} Fail</ToneBadge>
      )}
      {task.pending > 0 && (
        <Badge variant="outline">{task.pending} Pending</Badge>
      )}
    </div>
  )
}

export function DeleteTaskDialog({
  open,
  onOpenChange,
  pending,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onDelete: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Booking?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the event from the practice calendar. This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={onDelete}>
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
