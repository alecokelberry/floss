"use client"

import {
  CalendarPlusIcon,
  MessageSquareIcon,
  SearchIcon,
  UserPlusIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { PatientAvatar } from "@/components/shared/avatars"
import { ContextPanel } from "@/components/shared/context-panel"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/toast"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { DirectoryPatient } from "@/db/queries/patients"
import type { PatientStage } from "@/db/schema"
import { openSheet } from "@/hooks/use-sheet"
import { PATIENT_STAGE } from "@/lib/tones"

const ORDER: PatientStage[] = ["in_chair", "active", "new", "lapsed"]

/**
 * The Directory: everyone by stage (in the chair first), searchable by name, chart or phone; a row opens the
 * patient, its two buttons message or book them.
 */
export function DirectoryPanel({ patients }: { patients: DirectoryPatient[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const digits = q.replace(/\D/g, "")
  const matches = q
    ? patients.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.chart.toLowerCase().includes(q) ||
          (digits.length > 0 && p.phone.replace(/\D/g, "").includes(digits))
      )
    : patients
  const unpaid = patients.filter((p) => p.unpaid > 0).length

  const row = (p: DirectoryPatient) => (
    // The patient's button stretches over the whole row (its ::after), so the row opens the patient while Message
    // and Book stay buttons of their own beside it, not nested inside it
    <div
      key={p.id}
      className="group relative flex items-center gap-2.5 rounded-md px-3 py-2 hover:bg-accent has-[>button:focus-visible]:ring-2 has-[>button:focus-visible]:ring-ring"
    >
      <button
        type="button"
        onClick={() => openSheet({ kind: "patient", id: p.id })}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left outline-none after:absolute after:inset-0 after:rounded-md"
      >
        <span className="relative shrink-0">
          <PatientAvatar patient={p} size={32} />
          <span
            aria-hidden
            className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-background"
            style={{ backgroundColor: PATIENT_STAGE[p.stage].dot }}
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{p.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {p.chart}
            {p.nextTreatment && ` · ${p.nextTreatment}`}
          </span>
        </div>
      </button>
      <div className="relative flex shrink-0 gap-0.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Message ${p.name}`}
                className="size-6 opacity-60 hover:opacity-100"
                onClick={() => openSheet({ kind: "message", patientId: p.id })}
              />
            }
          >
            <MessageSquareIcon className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>Message</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Book ${p.name}`}
                className="size-6 opacity-60 hover:opacity-100"
                onClick={() => {
                  router.push("/calendar")
                  toast.add({
                    type: "info",
                    title: "Book an appointment",
                    description: `Pick a chair and a time for ${p.name} (${p.chart}).`,
                  })
                }}
              />
            }
          >
            <CalendarPlusIcon className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>Book</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )

  return (
    <ContextPanel
      title="Directory"
      action={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Add patient"
          onClick={() => openSheet({ kind: "new-patient" })}
        >
          <UserPlusIcon />
        </Button>
      }
    >
      <div className="shrink-0 border-b px-3 py-2">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon className="size-3.5 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search patients"
            placeholder="Search patients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-1.5 py-2">
          {q ? (
            matches.length ? (
              matches.map(row)
            ) : (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No patients found.
              </p>
            )
          ) : (
            ORDER.map((stage) => {
              const group = patients.filter((p) => p.stage === stage)
              if (!group.length) return null
              return (
                <div key={stage}>
                  <div className="flex h-9 items-center px-3 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {PATIENT_STAGE[stage].label}
                  </div>
                  {group.map(row)}
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
      <div className="flex h-10 shrink-0 items-center justify-between border-t px-3 text-xs">
        <span className="text-muted-foreground">
          {q
            ? `${matches.length} of ${patients.length}`
            : `${patients.length} patients`}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span aria-hidden className="size-2 rounded-full bg-warning" />
          {unpaid} unpaid
        </span>
      </div>
    </ContextPanel>
  )
}
