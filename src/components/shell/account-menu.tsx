"use client"

import { LogOutIcon } from "lucide-react"
import { useTransition } from "react"

import { signOut } from "@/app/actions/auth"
import { Portrait } from "@/components/shared/avatars"
import { usePractice } from "@/components/shell/practice"
import { RailLabel } from "@/components/shell/rail-label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "@/components/ui/sidebar"
import { DEMO_STAFF } from "@/lib/demo-account"

const photo = DEMO_STAFF[0].photo

/**
 * The account menu from the rail's foot: who's signed in and Sign Out, in red. Profile, notifications and billing live
 * in Settings, the theme on the rail.
 */
export function AccountMenu() {
  const { me } = usePractice()
  const { isMobile } = useSidebar()
  const [pending, startTransition] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Open profile for ${me.name}`}
        className="mx-auto flex size-7 items-center justify-center gap-2 rounded-lg text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-sidebar-ring in-data-[mobile=true]:mx-0 in-data-[mobile=true]:h-10 in-data-[mobile=true]:w-full in-data-[mobile=true]:justify-start in-data-[mobile=true]:px-2 aria-expanded:bg-muted"
      >
        <Portrait src={photo} name={me.name} size={24} />
        <RailLabel>{me.name}</RailLabel>
      </DropdownMenuTrigger>
      {/* Beside the rail on a desktop; above the name in the phone's full-width sheet, where there's no room beside */}
      <DropdownMenuContent
        side={isMobile ? "top" : "right"}
        align={isMobile ? "start" : "end"}
        className="min-w-52"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2.5 px-1.5 py-2 font-normal">
            <Portrait src={photo} name={me.name} size={30} />
            <span className="grid min-w-0 leading-tight">
              <span className="truncate text-sm font-semibold text-foreground">
                {me.name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {me.email}
              </span>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await signOut()
              })
            }
          >
            <LogOutIcon />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
