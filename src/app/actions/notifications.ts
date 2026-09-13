"use server"

import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"

import { clinicNow } from "@/db/clock"
import { bookingEvents } from "@/db/schema"
import { authActionClient } from "@/lib/safe-action"

import { writeAndRefresh } from "./shared"

/** One notification read (clicked in the bell) */
export const markNotificationRead = authActionClient
  .inputSchema(z.number().int())
  .action(async ({ parsedInput: id }) => {
    const now = new Date(await clinicNow())
    return writeAndRefresh(async (tx) => {
      await tx
        .update(bookingEvents)
        .set({ readAt: now })
        .where(and(eq(bookingEvents.id, id), isNull(bookingEvents.readAt)))
      return "Read"
    })
  })

/** Every notification read (the bell's check) */
export const markAllNotificationsRead = authActionClient.action(async () => {
  const now = new Date(await clinicNow())
  return writeAndRefresh(async (tx) => {
    await tx
      .update(bookingEvents)
      .set({ readAt: now })
      .where(isNull(bookingEvents.readAt))
    return "All read"
  })
})
