"use client"

import {
  ArmchairIcon,
  BanknoteIcon,
  BellIcon,
  ClockIcon,
  ReceiptTextIcon,
  RotateCcwIcon,
  UserIcon,
} from "lucide-react"
import type { Route } from "next"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { resetToDefaults } from "@/app/actions/settings"
import { ContextPanel } from "@/components/shared/context-panel"
import { usePractice } from "@/components/shell/practice"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import { outcome } from "@/lib/action-result"
import { DEFAULT_SETTINGS, type SettingsTab } from "@/lib/settings"

export const TAB_META: Record<
  SettingsTab,
  { label: string; icon: React.ComponentType }
> = {
  profile: { label: "My Profile", icon: UserIcon },
  hours: { label: "Hours", icon: ClockIcon },
  chairs: { label: "Chairs", icon: ArmchairIcon },
  procedures: { label: "Procedures", icon: ReceiptTextIcon },
  billing: { label: "Billing", icon: BanknoteIcon },
  notifications: { label: "Notifications", icon: BellIcon },
}

/**
 * The Configuration panel: the six settings tabs, and a reset that puts hours, terms and prices back to how they
 * shipped (it waits, disabled, until one of them differs).
 */
export function SettingsPanel({ tab }: { tab: SettingsTab }) {
  const router = useRouter()
  const { settings, procedures } = usePractice()
  const [current, setCurrent] = useState(tab)
  const [shownTab, setShownTab] = useState(tab)
  if (shownTab !== tab) {
    setShownTab(tab)
    setCurrent(tab)
  }
  const [pending, startTransition] = useTransition()
  const changed =
    settings.hours.open !== DEFAULT_SETTINGS.hours.open ||
    settings.hours.close !== DEFAULT_SETTINGS.hours.close ||
    settings.terms !== DEFAULT_SETTINGS.terms ||
    procedures.some((p) => p.price !== p.listPrice)

  return (
    <ContextPanel
      title="Configuration"
      action={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Reset to shipped defaults"
          disabled={!changed || pending}
          onClick={() =>
            startTransition(async () => {
              const result = outcome(await resetToDefaults())
              if (!result.ok) toast.add({ type: "error", title: result.error })
            })
          }
        >
          <RotateCcwIcon />
        </Button>
      }
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          <Tabs
            orientation="vertical"
            value={current}
            onValueChange={(v) => {
              setCurrent(v as SettingsTab)
              startTransition(() =>
                router.replace(`/settings?tab=${v}` as Route, { scroll: false })
              )
            }}
          >
            <TabsList className="w-full gap-1 bg-transparent p-0">
              {(Object.keys(TAB_META) as SettingsTab[]).map((t) => {
                const { label, icon: Icon } = TAB_META[t]
                return (
                  <TabsTrigger
                    key={t}
                    value={t}
                    className="w-full justify-start gap-3 rounded-lg px-3 py-1.5 text-muted-foreground data-active:border-input data-active:bg-accent data-active:text-foreground dark:data-active:bg-accent"
                  >
                    <Icon />
                    {label}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </div>
      </ScrollArea>
    </ContextPanel>
  )
}
