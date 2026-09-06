"use client"

import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { openSheet } from "@/hooks/use-sheet"
import { atMinute } from "@/lib/dates"

/** New visit: the roster's first practitioner at 9:00, a General Checkup */
export function NewVisitButton({ today }: { today: Date }) {
  const at = atMinute(today, 9 * 60)
  return (
    <Button
      className="has-data-[icon=inline-start]:pl-2.5"
      onClick={() =>
        openSheet({
          kind: "new-booking",
          noun: "visit",
          defaults: { procedureId: "checkup", startsAt: at.getTime() },
        })
      }
    >
      <PlusIcon data-icon="inline-start" />
      New visit
    </Button>
  )
}
