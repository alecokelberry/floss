"use client"

import { PlusIcon, PrinterIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { openSheet } from "@/hooks/use-sheet"
import { atMinute } from "@/lib/dates"

/** The Calendar's header actions: print the sheet, and New Booking on the day in view at 9:00 */
export function CalendarActions({ date }: { date: Date }) {
  return (
    <>
      <Button
        variant="outline"
        aria-label="Print the day sheet"
        className="has-data-[icon=inline-start]:pl-2.5"
        onClick={() => window.print()}
      >
        <PrinterIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Print</span>
      </Button>
      <Button
        aria-label="New booking"
        className="has-data-[icon=inline-start]:pl-2.5"
        onClick={() =>
          openSheet({ kind: "new-booking", defaults: newAt(date) })
        }
      >
        <PlusIcon data-icon="inline-start" />
        <span className="hidden sm:inline">New Booking</span>
      </Button>
    </>
  )
}

/** New Booking's defaults on a day: a General Checkup at 9:00 */
export function newAt(date: Date) {
  return { procedureId: "checkup", startsAt: atMinute(date, 9 * 60).getTime() }
}
