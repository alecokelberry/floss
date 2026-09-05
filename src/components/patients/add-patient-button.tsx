"use client"

import { UserPlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { openSheet } from "@/hooks/use-sheet"

export function AddPatientButton() {
  return (
    <Button
      className="has-data-[icon=inline-start]:pl-2.5"
      onClick={() => openSheet({ kind: "new-patient" })}
    >
      <UserPlusIcon data-icon="inline-start" />
      Add Patient
    </Button>
  )
}
