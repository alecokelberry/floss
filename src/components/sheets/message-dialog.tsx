"use client"

import { SendIcon } from "lucide-react"
import { useState } from "react"

import { loadPatient } from "@/app/actions/patients"
import { PatientAvatar } from "@/components/shared/avatars"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import type { DirectoryPatient } from "@/db/queries/patients"
import { useRecord } from "@/hooks/use-record"
import { messageInput } from "@/lib/patients"

/**
 * The message dialog (a row's Send Reminder, the Directory's Message): to the phone, or the email when there's no
 * phone, about the next treatment. Nothing goes out yet: the toast says so.
 */
export function MessageDialog({
  patientId,
  open,
  onOpenChange,
}: {
  patientId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const p = useRecord(loadPatient, patientId)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {p ? (
          <Draft key={p.id} patient={p} close={() => onOpenChange(false)} />
        ) : (
          <DialogHeader>
            <DialogTitle>Message</DialogTitle>
            <DialogDescription>
              {p === null ? "This patient is gone." : "Loading…"}
            </DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Draft({
  patient: p,
  close,
}: {
  patient: DirectoryPatient
  close: () => void
}) {
  const [to, setTo] = useState(p.phone || p.email)
  const [subject, setSubject] = useState(
    p.nextTreatment
      ? `Your ${p.nextTreatment} appointment`
      : "A note from the clinic"
  )
  const [body, setBody] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  function send() {
    const parsed = messageInput.safeParse({ to, subject, body })
    if (!parsed.success) {
      const found: Record<string, string> = {}
      for (const i of parsed.error.issues)
        found[String(i.path[0])] ??= i.message
      setErrors(found)
      return
    }
    close()
    toast.add({
      type: "success",
      title: "Message queued",
      description: `${p.name} will be contacted on ${parsed.data.to}. Connect your messaging provider to send.`,
    })
  }

  return (
    <form
      noValidate
      className="contents"
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2.5">
          <PatientAvatar patient={p} size={28} />
          Message {p.name}
        </DialogTitle>
        <DialogDescription>
          {p.chart} · goes out as a text unless you put an email address in.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-4">
        <Field data-invalid={errors.to ? true : undefined}>
          <FieldLabel htmlFor="message-to">To</FieldLabel>
          <Input
            id="message-to"
            placeholder="+1 (555) 0000"
            value={to}
            aria-invalid={errors.to ? true : undefined}
            onChange={(e) => setTo(e.target.value)}
          />
          {errors.to && <FieldError>{errors.to}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="message-subject">Subject</FieldLabel>
          <Input
            id="message-subject"
            placeholder="Your appointment"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>
        <Field data-invalid={errors.body ? true : undefined}>
          <FieldLabel htmlFor="message-body">Message</FieldLabel>
          <Textarea
            id="message-body"
            name="body"
            rows={6}
            className="max-h-40"
            placeholder="Write your message..."
            value={body}
            aria-invalid={errors.body ? true : undefined}
            onChange={(e) => setBody(e.target.value)}
          />
          {errors.body && <FieldError>{errors.body}</FieldError>}
        </Field>
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Discard</DialogClose>
        <Button type="submit">
          <SendIcon data-icon="inline-start" />
          Send
        </Button>
      </DialogFooter>
    </form>
  )
}
