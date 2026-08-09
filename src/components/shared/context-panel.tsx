import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * The context panel (302px beside the rail, page background): a 50px header with the panel's name and one icon
 * button, then a scrolling body. Sections, lists and footers are the parts below.
 */
export function ContextPanel({
  title,
  action,
  children,
}: {
  title: string
  /** A 28px ghost icon button at the header's right */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <div className="flex h-12.5 shrink-0 items-center justify-between gap-2 border-b px-3">
        <span className="text-sm font-semibold">{title}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

/** A bordered section: `py-2`, a 28px uppercase label row with a count badge, then its rows */
export function PanelSection({
  label,
  count,
  children,
  className,
}: {
  label: string
  count?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("border-b py-2", className)}>
      <div className="flex h-7 items-center justify-between px-3 py-1">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        {count !== undefined && <CountBadge>{count}</CountBadge>}
      </div>
      {children}
    </section>
  )
}

/** The outline count badge ("18 slots", "5 of 9") */
export function CountBadge({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn("text-muted-foreground tabular-nums", className)}
    >
      {children}
    </Badge>
  )
}
