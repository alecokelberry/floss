"use client"

import { PencilIcon, Trash2Icon } from "lucide-react"
import { useState, useTransition } from "react"

import { loadPatient, removePatient } from "@/app/actions/patients"
import {
  RecallBadge,
  VerifyBadge,
  VerifyButton,
} from "@/components/front-desk/badges"
import { TreatmentPlanCard } from "@/components/front-desk/treatment-plan"
import { PatientAvatar, PractitionerAvatar } from "@/components/shared/avatars"
import { Dot } from "@/components/shared/dot"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SheetClose, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import type { DirectoryPatient } from "@/db/queries/patients"
import type { PatientStage } from "@/db/schema"
import { useNow } from "@/hooks/use-now"
import { useRecord } from "@/hooks/use-record"
import { closeSheet, openSheet } from "@/hooks/use-sheet"
import { outcome } from "@/lib/action-result"
import { fullDate, startOfDay } from "@/lib/dates"
import { verification } from "@/lib/insurance"
import { intervalLabel, recallDue, recallStatus } from "@/lib/recall"
import { PATIENT_STAGE } from "@/lib/tones"

import { SheetBody, SheetFooter, SheetFrame, SheetX } from "./sheet-frame"

/** The stage as the grid, the Directory and the sheet badge it: an outline badge with its dot */
export function StageBadge({ stage }: { stage: PatientStage }) {
  return (
    <Badge variant="outline">
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ backgroundColor: PATIENT_STAGE[stage].dot }}
      />
      {PATIENT_STAGE[stage].label}
    </Badge>
  )
}

/**
 * Removing a patient, asked first: from the sheet it says their appointments stay; from the grid's row menu it's the
 * shorter confirm with Delete
 */
export function RemovePatientDialog({
  patient,
  open,
  onOpenChange,
  from,
  onRemoved,
}: {
  patient: Pick<DirectoryPatient, "id" | "name" | "chart">
  open: boolean
  onOpenChange: (open: boolean) => void
  from: "sheet" | "row"
  onRemoved?: () => void
}) {
  const [pending, startTransition] = useTransition()
  function remove() {
    startTransition(async () => {
      const result = outcome(await removePatient(patient.id))
      onOpenChange(false)
      if (!result.ok) {
        toast.add({ type: "error", title: result.error })
        return
      }
      onRemoved?.()
      toast.add({
        type: "success",
        title: "Patient removed",
        description: result.message,
      })
    })
  }
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove patient?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove{" "}
            <span className="font-medium text-foreground">{patient.name}</span>{" "}
            ({patient.chart}) from the directory. Their appointments stay on the
            diary.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={remove}>
            {from === "sheet" ? "Remove" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * The patient sheet: who, their contacts, their practitioner, next treatment and bookings; their dental plan and
 * whether it's verified, when they're due back for a cleaning, and their latest treatment plan
 */
export function PatientSheet({ id }: { id: number }) {
  // Verify and a plan's answer write from inside the sheet; the next revision reads the patient again
  const [revision, setRevision] = useState(0)
  const reread = () => setRevision((r) => r + 1)
  const p = useRecord(loadPatient, id, revision)
  const today = startOfDay(useNow())
  const [confirming, setConfirming] = useState(false)
  const due = p ? recallDue(p) : null
  const plan = p?.plans[0]
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{value}</dd>
    </div>
  )
  return (
    <SheetFrame>
      <div className="flex shrink-0 flex-col gap-3 border-b px-5 py-3.5">
        <div className="flex items-center gap-2">
          {p ? (
            <PatientAvatar patient={p} size={36} />
          ) : (
            <Skeleton className="size-9 rounded-full" />
          )}
          <div className="ms-0.5 flex min-w-0 flex-1 flex-col">
            <SheetTitle className="truncate text-sm font-medium">
              {p?.name ?? "Patient"}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {p?.chart ?? (p === null ? "This patient is gone." : " ")}
            </SheetDescription>
          </div>
          <SheetX className="self-start" />
        </div>
        {p && (
          <div>
            <StageBadge stage={p.stage} />
          </div>
        )}
      </div>
      <SheetBody>
        {p && (
          <div className="flex flex-col gap-4 p-5">
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Contact</h3>
              <dl className="flex flex-col gap-3">
                {row("Chart", p.chart)}
                {row("Phone", p.phone || "—")}
                {row("Email", p.email || "—")}
                <Separator className="my-1" />
                {row(
                  "Practitioner",
                  p.practitioner ? (
                    <span className="flex items-center justify-end gap-1.5">
                      <PractitionerAvatar
                        practitioner={p.practitioner}
                        size={20}
                      />
                      {p.practitioner.name}
                    </span>
                  ) : (
                    "Unassigned"
                  )
                )}
                {row("Next treatment", p.nextTreatment ?? "Nothing booked")}
                {row(
                  "Bookings",
                  <span className="flex items-center justify-end gap-1.5 tabular-nums">
                    {p.upcoming} upcoming
                    <Dot />
                    {p.total} total
                    {p.unpaid > 0 && (
                      <>
                        <Dot />
                        <span className="text-warning-ink">
                          {p.unpaid} unpaid
                        </span>
                      </>
                    )}
                  </span>
                )}
              </dl>
            </section>
            <Separator />
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Insurance</h3>
                {p.carrier && (
                  <VerifyButton
                    patientId={p.id}
                    name={p.name}
                    onDone={reread}
                  />
                )}
              </div>
              <dl className="flex flex-col gap-3">
                {row("Plan", p.carrier ?? "Self-pay")}
                {p.memberId && row("Member ID", p.memberId)}
                {row(
                  "Benefits",
                  <VerifyBadge state={verification(p, today)} />
                )}
              </dl>
            </section>
            <Separator />
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Recall</h3>
              <dl className="flex flex-col gap-3">
                {row("Interval", intervalLabel(p.recallMonths))}
                {row(
                  "Next cleaning due",
                  due ? (
                    <span className="flex items-center justify-end gap-1.5">
                      {fullDate(due)}
                      <RecallBadge
                        status={recallStatus(due, p.nextHygiene, today)}
                      />
                    </span>
                  ) : (
                    "At their first visit"
                  )
                )}
              </dl>
            </section>
            {plan && (
              <>
                <Separator />
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">
                    Treatment plan
                    {p.plans.length > 1 && (
                      <span className="ms-1.5 font-normal text-muted-foreground">
                        latest of {p.plans.length}
                      </span>
                    )}
                  </h3>
                  <TreatmentPlanCard
                    plan={plan}
                    patientId={p.id}
                    carrier={p.carrier}
                    onDone={reread}
                  />
                </section>
              </>
            )}
          </div>
        )}
      </SheetBody>
      <SheetFooter>
        <Button
          variant="outline"
          className="me-auto"
          disabled={!p}
          onClick={() => setConfirming(true)}
        >
          <Trash2Icon data-icon="inline-start" />
          Delete
        </Button>
        <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
        <Button
          disabled={!p}
          onClick={() => openSheet({ kind: "edit-patient", id })}
        >
          <PencilIcon data-icon="inline-start" />
          Edit
        </Button>
      </SheetFooter>
      {p && (
        <RemovePatientDialog
          patient={p}
          open={confirming}
          onOpenChange={setConfirming}
          from="sheet"
          onRemoved={closeSheet}
        />
      )}
    </SheetFrame>
  )
}
