// The Payments page's read: every billed booking (Completed or Unpaid) with who and what, read as invoices.
import "server-only"
import { asc, inArray } from "drizzle-orm"
import { cache } from "react"

import { db } from "@/db"
import { clinicNow } from "@/db/clock"
import { getSettings } from "@/db/queries/shell"
import { bookings } from "@/db/schema"
import { invoicesFrom } from "@/lib/invoices"
import { requireUser } from "@/lib/session"

export const getLedger = cache(async () => {
  await requireUser()
  const [now, settings, lines] = await Promise.all([
    clinicNow(),
    getSettings(),
    db.query.bookings.findMany({
      where: inArray(bookings.status, ["completed", "unpaid"]),
      orderBy: (b) => [asc(b.startsAt), asc(b.seq)],
      columns: {
        id: true,
        bill: true,
        seq: true,
        startsAt: true,
        status: true,
        fee: true,
      },
      with: {
        patient: {
          columns: {
            id: true,
            chart: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        practitioner: { columns: { id: true, name: true, photoUrl: true } },
        procedure: {
          columns: { id: true, code: true, name: true, price: true },
        },
      },
    }),
  ])
  return invoicesFrom(lines, new Date(now), settings.terms)
})
export type LedgerInvoice = Awaited<ReturnType<typeof getLedger>>[number]
