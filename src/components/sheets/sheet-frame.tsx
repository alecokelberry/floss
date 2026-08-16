"use client"

import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

/**
 * The sheet frame: a card floating 16px in from the right, top and bottom,
 * 480 wide and rounded, over a lightly blurred page. A header, a scrolling body, a muted footer.
 */
export function SheetFrame({ children }: { children: React.ReactNode }) {
  return (
    <SheetContent
      side="right"
      showCloseButton={false}
      className="inset-y-4! right-4! left-auto flex h-[calc(100svh-2rem)]! w-[min(30rem,calc(100vw-2rem))]! max-w-none! flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 outline-none"
    >
      {children}
    </SheetContent>
  )
}

/** The close button every sheet header ends with */
export function SheetX({ className }: { className?: string }) {
  return (
    <SheetClose
      render={
        <Button
          variant="ghost"
          size="icon"
          className={cn("-me-1 shrink-0", className)}
        />
      }
    >
      <XIcon />
      <span className="sr-only">Close</span>
    </SheetClose>
  )
}

/** A form sheet's header: its title (16/600), a description for screen readers, the close button */
export function SheetFormHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b px-5 py-3">
      <SheetTitle className="flex-1 text-base font-semibold">
        {title}
      </SheetTitle>
      <SheetDescription className="sr-only">{description}</SheetDescription>
      <SheetX />
    </div>
  )
}

export function SheetBody({ children }: { children: React.ReactNode }) {
  return <ScrollArea className="min-h-0 flex-1">{children}</ScrollArea>
}

export function SheetFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 border-t bg-muted px-5 py-3",
        className
      )}
    >
      {children}
    </div>
  )
}

/** A detail row: a 16px muted icon, then its content */
export function SheetRow({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
        <Icon />
      </span>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  )
}
