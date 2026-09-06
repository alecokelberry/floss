"use client"

import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { openSheet } from "@/hooks/use-sheet"

export function NewInvoiceButton() {
  return (
    <Button
      className="has-data-[icon=inline-start]:pl-2.5"
      onClick={() => openSheet({ kind: "new-invoice" })}
    >
      <PlusIcon data-icon="inline-start" />
      New invoice
    </Button>
  )
}
