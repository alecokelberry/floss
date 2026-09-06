"use client"

import { PencilIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"

import {
  loadClinician,
  removeClinician,
  saveClinician,
} from "@/app/actions/staff"
import { PractitionerAvatar } from "@/components/shared/avatars"
import { ToneBadge } from "@/components/shared/tone-badge"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SheetClose, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import { useRecord } from "@/hooks/use-record"
import { closeSheet } from "@/hooks/use-sheet"
import { outcome } from "@/lib/action-result"
import { duration, monthYear } from "@/lib/dates"
import { type ClinicianInput, clinicianInput } from "@/lib/staff"

import { SheetBody, SheetFooter, SheetFrame, SheetX } from "./sheet-frame"

const EMPTY: ClinicianInput = {
  name: "",
  specialty: "",
  qualification: "",
  phone: "",
  joinedOn: "",
  email: "",
  photoUrl: "",
}

/**
 * The clinician sheet: who and their standing today, their details, chair time and bookings; Edit swaps the body
 * for the form in place; Delete asks first, and won't while they hold bookings.
 */
export function ClinicianSheet({ id }: { id: string }) {
  const c = useRecord(loadClinician, id)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function remove() {
    startTransition(async () => {
      const result = outcome(await removeClinician(id))
      setConfirming(false)
      if (!result.ok) {
        toast.add({ type: "error", title: result.error })
        return
      }
      closeSheet()
      toast.add({
        type: "success",
        title: "Clinician removed",
        description: result.message,
      })
    })
  }

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">
        {value || "—"}
      </dd>
    </div>
  )

  return (
    <SheetFrame>
      <div className="flex shrink-0 flex-col gap-3 border-b px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          {c ? (
            <PractitionerAvatar practitioner={c} size={36} />
          ) : (
            <Skeleton className="size-9 rounded-full" />
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <SheetTitle className="truncate text-sm font-medium">
              {c?.name ?? "Clinician"}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {c?.specialty ?? (c === null ? "This clinician is gone." : " ")}
            </SheetDescription>
          </div>
          <SheetX className="self-start" />
        </div>
        {c && !editing && (
          <div className="flex items-center gap-2">
            {c.today > 0 ? (
              <>
                <ToneBadge tone="success-light">On the floor</ToneBadge>
                <span className="text-xs text-muted-foreground">
                  {duration(c.minutes)} in the chair today
                </span>
              </>
            ) : (
              <Badge variant="secondary">Not scheduled</Badge>
            )}
          </div>
        )}
      </div>
      {c && editing ? (
        <ClinicianFields
          id={c.id}
          initial={{
            name: c.name,
            specialty: c.specialty,
            qualification: c.qualification,
            phone: c.phone,
            joinedOn: c.joinedOn,
            email: c.email,
            photoUrl: c.photoUrl ?? "",
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <SheetBody>
            {c && (
              <div className="flex flex-col gap-4 p-5">
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">Details</h3>
                  <dl className="flex flex-col gap-3">
                    {row("Specialty", c.specialty)}
                    {row("Qualification", c.qualification)}
                    {row(
                      "Phone",
                      c.phone && (
                        <a
                          href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {c.phone}
                        </a>
                      )
                    )}
                    {row(
                      "Email",
                      c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {c.email}
                        </a>
                      )
                    )}
                    {row(
                      "Joined",
                      c.joinedOn && monthYear(new Date(`${c.joinedOn}T12:00`))
                    )}
                    <Separator className="my-1" />
                    {row("Chair time", c.minutes ? duration(c.minutes) : "")}
                    {row(
                      "Bookings",
                      `${c.today} today · ${c.tomorrow} tomorrow`
                    )}
                    {row(
                      "In the diary",
                      `${c.diary} ${c.diary === 1 ? "booking" : "bookings"}`
                    )}
                  </dl>
                </section>
              </div>
            )}
          </SheetBody>
          <SheetFooter>
            <Button
              variant="outline"
              className="me-auto"
              disabled={!c}
              onClick={() => setConfirming(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              Delete
            </Button>
            <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
            <Button disabled={!c} onClick={() => setEditing(true)}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </Button>
          </SheetFooter>
        </>
      )}
      {c && (
        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogContent size="sm">
            {c.diary > 0 ? (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Move their bookings first</AlertDialogTitle>
                  <AlertDialogDescription>
                    <span className="font-medium text-foreground">
                      {c.name}
                    </span>{" "}
                    still holds {c.diary}{" "}
                    {c.diary === 1 ? "booking" : "bookings"} in the diary.
                    Removing them now would leave them with no chair. Reassign
                    them on the board first.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button
                    onClick={() => {
                      setConfirming(false)
                      closeSheet()
                      router.push("/calendar")
                    }}
                  >
                    Open the board
                  </Button>
                </AlertDialogFooter>
              </>
            ) : (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove clinician?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove{" "}
                    <span className="font-medium text-foreground">
                      {c.name}
                    </span>{" "}
                    from the roster. They hold nothing in the diary, so no
                    appointment changes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    disabled={pending}
                    onClick={remove}
                  >
                    Remove
                  </Button>
                </AlertDialogFooter>
              </>
            )}
          </AlertDialogContent>
        </AlertDialog>
      )}
    </SheetFrame>
  )
}

/** New Clinician: the empty form under its own header */
export function NewClinicianSheet() {
  return (
    <SheetFrame>
      <div className="flex shrink-0 items-center gap-2.5 border-b px-5 py-3.5">
        <Avatar className="size-9">
          <AvatarFallback>?</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <SheetTitle className="truncate text-sm font-medium">
            New Clinician
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Take their name and what they practise.
          </SheetDescription>
        </div>
        <SheetX className="self-start" />
      </div>
      <ClinicianFields initial={EMPTY} onCancel={closeSheet} />
    </SheetFrame>
  )
}

function ClinicianFields({
  id,
  initial,
  onCancel,
}: {
  id?: string
  initial: ClinicianInput
  onCancel: () => void
}) {
  const [d, setD] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()
  const form = useRef<HTMLFormElement>(null)

  function check(draft: ClinicianInput) {
    const parsed = clinicianInput.safeParse(draft)
    if (parsed.success) return {}
    const found: Record<string, string> = {}
    for (const i of parsed.error.issues) found[String(i.path[0])] ??= i.message
    return found
  }
  const set = (patch: Partial<ClinicianInput>) => {
    const next = { ...d, ...patch }
    setD(next)
    // A message clears once its field is fixed; others wait for the next Save
    if (Object.keys(errors).length) {
      const now = check(next)
      setErrors(
        Object.fromEntries(
          Object.keys(errors).flatMap((k) => {
            const message = now[k]
            return message ? [[k, message]] : []
          })
        )
      )
    }
  }

  function save() {
    const found = check(d)
    if (Object.keys(found).length) {
      setErrors(found)
      const first = Object.keys(found)[0]
      form.current
        ?.querySelector<HTMLInputElement>(`#clinician-${first}`)
        ?.focus()
      return
    }
    startTransition(async () => {
      const result = outcome(await saveClinician({ id: id ?? null, input: d }))
      if (!result.ok) {
        toast.add({ type: "error", title: result.error })
        return
      }
      closeSheet()
      toast.add({
        type: "success",
        title: id ? "Clinician updated" : "Clinician added",
        description: result.message,
      })
    })
  }

  const text = (
    key: keyof ClinicianInput,
    label: string,
    placeholder: string,
    className?: string
  ) => (
    <Field className={className} data-invalid={errors[key] ? true : undefined}>
      <FieldLabel htmlFor={`clinician-${key}`}>{label}</FieldLabel>
      <Input
        id={`clinician-${key}`}
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
          id="staff-sheet-form"
          ref={form}
          noValidate
          className="p-5"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <FieldGroup className="gap-3">
            {text("name", "Name", "Dr. Iris Bellweather")}
            {text("specialty", "Specialty", "Endodontics")}
            {text(
              "qualification",
              "Qualification",
              "BDS, MClinDent Endodontics"
            )}
            <div className="flex gap-3">
              {text("phone", "Phone", "+1 (555) 0000", "min-w-0 flex-1")}
              {text("joinedOn", "Joined", "2024-05-06", "min-w-0 flex-1")}
            </div>
            {text("email", "Email", "name@clinic.example.com")}
            {text("photoUrl", "Photo URL", "https://example.com/photo.jpg")}
          </FieldGroup>
        </form>
      </SheetBody>
      <SheetFooter className="justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" form="staff-sheet-form" disabled={pending}>
          Save
        </Button>
      </SheetFooter>
    </>
  )
}
