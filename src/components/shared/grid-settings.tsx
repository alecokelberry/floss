"use client"

import { CheckIcon, Settings2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Toggle } from "@/components/ui/toggle"

export type GridLayout = {
  dense: boolean
  resizable: boolean
  movable: boolean
}

/**
 * The table Settings (Patients, Payments): density, resizable and movable columns, and a toggle chip per
 * column that can hide.
 */
export function GridSettings({
  layout,
  onLayoutChange,
  columns,
  visibility,
  onVisibilityChange,
}: {
  layout: GridLayout
  onLayoutChange: (layout: GridLayout) => void
  columns: readonly (readonly [id: string, label: string])[]
  visibility: Record<string, boolean>
  onVisibilityChange: (visibility: Record<string, boolean>) => void
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" aria-label="Table settings" />}
      >
        <Settings2Icon data-icon="inline-start" />
        Settings
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex w-80 flex-col gap-3 px-3.5 py-3"
      >
        <span className="text-xs font-medium text-muted-foreground">Table</span>
        <div className="flex h-9 items-center justify-between gap-3 text-sm">
          Density
          <Select
            items={[
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Comfortable" },
            ]}
            value={layout.dense ? "compact" : "comfortable"}
            onValueChange={(v) =>
              onLayoutChange({ ...layout, dense: v === "compact" })
            }
          >
            <SelectTrigger size="sm" className="w-33">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex h-9 items-center justify-between gap-3 text-sm">
          <label htmlFor="grid-resizable">Resizable columns</label>
          <Switch
            id="grid-resizable"
            size="sm"
            checked={layout.resizable}
            onCheckedChange={(resizable) =>
              onLayoutChange({ ...layout, resizable })
            }
          />
        </div>
        <div className="flex h-9 items-center justify-between gap-3 text-sm">
          <label htmlFor="grid-movable">Movable columns</label>
          <Switch
            id="grid-movable"
            size="sm"
            checked={layout.movable}
            onCheckedChange={(movable) =>
              onLayoutChange({ ...layout, movable })
            }
          />
        </div>
        <Separator />
        <span className="text-xs font-medium text-muted-foreground">
          Display properties
        </span>
        <div className="flex flex-wrap gap-1.5">
          {columns.map(([id, label]) => {
            const on = visibility[id] !== false
            return (
              <Toggle
                key={id}
                variant="outline"
                size="sm"
                pressed={on}
                onPressedChange={(p) =>
                  onVisibilityChange({ ...visibility, [id]: p })
                }
                className="h-6 gap-1 rounded-full px-2 text-xs"
              >
                {on && <CheckIcon className="size-3.5" />}
                {label}
              </Toggle>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
