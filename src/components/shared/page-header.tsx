import { SidebarTrigger } from "@/components/ui/sidebar"

/**
 * The page header: 50px, sticky at the top of the main column, the page's title (18/600) and its actions at the
 * right (outline first, one primary last). The sidebar's trigger shows only on narrow screens.
 */
export function PageHeader({
  title,
  after,
  children,
}: {
  title: React.ReactNode
  /** Beside the title (the Calendar's chair dots) */
  after?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 flex h-12.5 shrink-0 items-center gap-3 border-b bg-background px-4 py-1.5">
      <SidebarTrigger className="md:hidden" />
      <h1 className="truncate text-lg font-semibold">{title}</h1>
      {after}
      {children && (
        <div className="ms-auto flex shrink-0 items-center gap-2">
          {children}
        </div>
      )}
    </header>
  )
}

/** The scrolling content under the header: 18px in, sections 16px apart */
export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4.5 ${className ?? ""}`}
    >
      {children}
    </div>
  )
}
