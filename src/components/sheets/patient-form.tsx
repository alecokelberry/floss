"use client"

import { useEffect, useState, useTransition } from "react"

import {
  loadPatient,
  nextChartNumber,
  savePatient,
} from "@/app/actions/patients"
import { PatientAvatar } from "@/components/shared/avatars"
import { usePractice } from "@/components/shell/practice"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SheetClose, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import type { DirectoryPatient } from "@/db/queries/patients"
import type { PatientStage } from "@/db/schema"
import { useRecord } from "@/hooks/use-record"
import { closeSheet } from "@/hooks/use-sheet"
import { outcome } from "@/lib/action-result"
import { CARRIERS } from "@/lib/insurance"
import { type PatientInput, patientInput, STAGES } from "@/lib/patients"
import { PATIENT_STAGE } from "@/lib/tones"

import { SheetBody, SheetFooter, SheetFrame, SheetX } from "./sheet-frame"

/** New Patient and Edit Patient: name, chart, contacts, practitioner, stage and dental plan, checked on Save */
export function PatientForm({ editId }: { editId?: number }) {
  const patient = useRecord(loadPatient, editId)
  const [chart, setChart] = useState<string | null>(null)
  useEffect(() => {
    if (editId === undefined)
      void nextChartNumber().then((r) => setChart(r.data ?? null))
  }, [editId])
  const ready = editId === undefined ? chart !== null : patient !== undefined
  return (
    <SheetFrame>
      <div className="flex shrink-0 items-center gap-2.5 border-b px-5 py-3.5">
        {patient ? (
          <PatientAvatar patient={patient} size={36} />
        ) : (
          <Avatar className="size-9">
            <AvatarFallback>?</AvatarFallback>
          </Avatar>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <SheetTitle className="truncate text-sm font-medium">
            {patient?.name ?? "New Patient"}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {patient?.chart ?? "Take their details and chart number."}
          </SheetDescription>
        </div>
        <SheetX className="self-start" />
      </div>
      {ready ? (
        <Fields
          patient={patient ?? undefined}
          chart={chart ?? ""}
          key={patient?.id ?? "new"}
        />
      ) : (
        <SheetBody>
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </SheetBody>
      )}
    </SheetFrame>
  )
}

function Fields({
  patient,
  chart,
}: {
  patient?: DirectoryPatient
  chart: string
}) {
  const { practitioners } = usePractice()
  const [d, setD] = useState<PatientInput>(() =>
    patient
      ? {
          name: patient.name,
          chart: patient.chart,
          phone: patient.phone,
          email: patient.email,
          practitionerId: patient.practitionerId,
          stage: patient.stage,
          carrier: CARRIERS.find((c) => c === patient.carrier) ?? ("" as const),
          memberId: patient.memberId ?? "",
        }
      : {
          name: "",
          chart,
          phone: "",
          email: "",
          practitionerId: null,
          stage: "new",
          carrier: "",
          memberId: "",
        }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()
  const set = (patch: Partial<PatientInput>) => setD({ ...d, ...patch })

  function save() {
    const parsed = patientInput.safeParse(d)
    if (!parsed.success) {
      const found: Record<string, string> = {}
      for (const i of parsed.error.issues)
        found[String(i.path[0])] ??= i.message
      setErrors(found)
      return
    }
    setErrors({})
    startTransition(async () => {
      const result = outcome(
        await savePatient({ id: patient?.id ?? null, input: parsed.data })
      )
      if (!result.ok) {
        toast.add({ type: "error", title: result.error })
        return
      }
      closeSheet()
      toast.add({
        type: "success",
        title: patient ? "Patient updated" : "Patient added",
        description: result.message,
      })
    })
  }

  const text = (
    key: "name" | "chart" | "phone" | "email" | "memberId",
    label: string,
    placeholder: string
  ) => (
    <Field data-invalid={errors[key] ? true : undefined}>
      <FieldLabel htmlFor={`patient-${key}`}>{label}</FieldLabel>
      <Input
        id={`patient-${key}`}
        placeholder={placeholder}
        autoComplete="off"
        value={d[key]}
        aria-invalid={errors[key] ? true : undefined}
        onChange={(e) => set({ [key]: e.target.value })}
      />
      {errors[key] && <FieldError>{errors[key]}</FieldError>}
    </Field>
  )

  return (
    <>
      <SheetBody>
        <form
          id="patient-sheet-form"
          noValidate
          className="p-5"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <FieldGroup className="gap-3">
            {text("name", "Name", "Ada Okonkwo")}
            {text("chart", "Chart", "PT-0000")}
            {text("phone", "Phone", "+1 (555) 0000")}
            {text("email", "Email", "name@example.com")}
            <Field>
              <FieldLabel htmlFor="patient-practitioner">
                Practitioner
              </FieldLabel>
              <Select
                items={practitioners.map((p) => ({
                  value: p.id,
                  label: p.name,
                }))}
                value={d.practitionerId}
                onValueChange={(v) => set({ practitionerId: v ?? null })}
              >
                <SelectTrigger id="patient-practitioner" className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {practitioners.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="patient-stage">Stage</FieldLabel>
              <Select
                items={STAGES.map((s) => ({
                  value: s,
                  label: PATIENT_STAGE[s].label,
                }))}
                value={d.stage}
                onValueChange={(v) => set({ stage: v as PatientStage })}
              >
                <SelectTrigger id="patient-stage" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {PATIENT_STAGE[s].label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="patient-carrier">Dental plan</FieldLabel>
              <Select
                items={[
                  { value: "", label: "Self-pay" },
                  ...CARRIERS.map((c) => ({ value: c, label: c })),
                ]}
                value={d.carrier}
                onValueChange={(v) => set({ carrier: v ?? "" })}
              >
                <SelectTrigger id="patient-carrier" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="">Self-pay</SelectItem>
                    {CARRIERS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            {d.carrier && text("memberId", "Member ID", "D104522318")}
          </FieldGroup>
        </form>
      </SheetBody>
      <SheetFooter className="justify-end">
        <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
        <Button type="submit" form="patient-sheet-form" disabled={pending}>
          Save
        </Button>
      </SheetFooter>
    </>
  )
}
