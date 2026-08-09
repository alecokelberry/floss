import { SearchXIcon } from "lucide-react"
import Link from "next/link"

import { BrandMark } from "@/components/shared/brand-mark"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty"

/** An address the app doesn't have, outside the clinic shell */
export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-5 py-10">
      <BrandMark />
      <Empty className="max-w-sm border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <h1 className="text-lg font-medium tracking-tight">No page here</h1>
          <EmptyDescription>
            Check the address, or start from the Dashboard.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm" nativeButton={false} render={<Link href="/" />}>
            Go to Dashboard
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
