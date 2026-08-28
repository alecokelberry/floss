"use client"

import { useOptimistic, useTransition } from "react"

import { showChairs } from "@/app/actions/bookings"
import { PractitionerAvatar } from "@/components/shared/avatars"
import { usePractice } from "@/components/shell/practice"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/toast"
import { outcome } from "@/lib/action-result"

/**
 * Which chairs the board shows, saved to the practice (the toolbar's menu and the panel's My Chairs both change it):
 * the ids now, and a setter that shows the change at once while it saves.
 */
export function useShownChairs() {
  const { practitioners } = usePractice()
  const [shown, setShown] = useOptimistic(
    practitioners.filter((p) => p.onBoard).map((p) => p.id)
  )
  const [, startTransition] = useTransition()
  function show(ids: string[]) {
    startTransition(async () => {
      setShown(ids)
      const result = outcome(await showChairs(ids))
      if (!result.ok) toast.add({ type: "error", title: result.error })
    })
  }
  const toggle = (id: string, on: boolean) =>
    show(
      practitioners
        .map((p) => p.id)
        .filter((x) => (x === id ? on : shown.includes(x)))
    )
  return { shown, show, toggle }
}

/** The toolbar's "5 of 9 Chairs": every chair with its face and specialty, checked when shown; Select All and Reset */
export function ChairMenu({
  trigger,
  chairs,
}: {
  trigger: React.ReactElement
  /** The board's own useShownChairs, so its columns follow the menu at once */
  chairs: ReturnType<typeof useShownChairs>
}) {
  const { practitioners } = usePractice()
  const { shown, show, toggle } = chairs
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className="w-62">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Chairs</DropdownMenuLabel>
        </DropdownMenuGroup>
        <ScrollArea className="h-64">
          <DropdownMenuGroup>
            {practitioners.map((p) => (
              <DropdownMenuCheckboxItem
                key={p.id}
                checked={shown.includes(p.id)}
                closeOnClick={false}
                onCheckedChange={(on) => toggle(p.id, on)}
                className="h-11 gap-2"
              >
                <PractitionerAvatar practitioner={p} size={24} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{p.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {p.specialty}
                  </span>
                </span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="grid grid-cols-2">
          <DropdownMenuItem
            closeOnClick={false}
            className="justify-center"
            onClick={() => show(practitioners.map((p) => p.id))}
          >
            Select All
          </DropdownMenuItem>
          <DropdownMenuItem
            closeOnClick={false}
            className="justify-center"
            onClick={() =>
              show(
                practitioners
                  .filter((p) => p.chairGroup === "daily")
                  .map((p) => p.id)
              )
            }
          >
            Reset
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
