"use server"

import { count, eq, sql } from "drizzle-orm"
import { z } from "zod"

import { authUsers, practitioners, procedures, settings } from "@/db/schema"
import { refuse } from "@/lib/action-result"
import { authActionClient } from "@/lib/safe-action"
import {
  DEFAULT_SETTINGS,
  readPrice,
  SETTING_SCHEMAS,
  type SettingKey,
  type Settings,
} from "@/lib/settings"

import { Refused, type Tx, writeAndRefresh } from "./shared"

async function put<K extends SettingKey>(tx: Tx, key: K, value: Settings[K]) {
  await tx
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
}

/** Hours, terms and alerts save the moment they change, with no toast */
export const saveSetting = authActionClient
  .inputSchema(
    z.discriminatedUnion("key", [
      z.object({ key: z.literal("hours"), value: SETTING_SCHEMAS.hours }),
      z.object({ key: z.literal("terms"), value: SETTING_SCHEMAS.terms }),
      z.object({ key: z.literal("alerts"), value: SETTING_SCHEMAS.alerts }),
    ])
  )
  .action(async ({ parsedInput }) =>
    writeAndRefresh(async (tx) => {
      await put(tx, parsedInput.key, parsedInput.value)
      return "Saved"
    })
  )

/** My Profile's Save changes: the name on the account and the public details */
export const saveProfile = authActionClient
  .inputSchema(
    z.object({
      name: z.string().trim().min(1, "Give yourself a name."),
      profile: SETTING_SCHEMAS.profile,
    })
  )
  .action(async ({ parsedInput: { name, profile }, ctx: { user } }) =>
    writeAndRefresh(async (tx) => {
      await tx.update(authUsers).set({ name }).where(eq(authUsers.id, user.id))
      await put(tx, "profile", profile)
      return "Profile saved"
    })
  )

/** Chairs: whether the board draws one; the last one on stays on */
export const setChairShown = authActionClient
  .inputSchema(z.object({ id: z.string(), on: z.boolean() }))
  .action(async ({ parsedInput: { id, on } }) =>
    writeAndRefresh(async (tx) => {
      if (!on) {
        const [shown] = await tx
          .select({ n: count() })
          .from(practitioners)
          .where(eq(practitioners.onBoard, true))
        if ((shown?.n ?? 0) <= 1)
          throw new Refused("One chair stays on the board.")
      }
      await tx
        .update(practitioners)
        .set({ onBoard: on })
        .where(eq(practitioners.id, id))
      return "Saved"
    })
  )

/** Save prices: every typed price checked; the ledger reprices whatever changed */
export const savePrices = authActionClient
  .inputSchema(z.record(z.string(), z.string()))
  .action(async ({ parsedInput: typed }) => {
    const errors: Record<string, string> = {}
    const prices: Record<string, number> = {}
    for (const [id, text] of Object.entries(typed)) {
      const read = readPrice(text)
      if ("error" in read) errors[id] = read.error
      else prices[id] = read.price
    }
    if (Object.keys(errors).length)
      return { ...refuse("Check the prices."), errors }
    return writeAndRefresh(async (tx) => {
      const current = await tx.select().from(procedures)
      let changed = 0
      for (const p of current) {
        const price = prices[p.id]
        if (price === undefined || price === p.price) continue
        changed++
        await tx
          .update(procedures)
          .set({ price })
          .where(eq(procedures.id, p.id))
      }
      return changed === 0
        ? "No prices changed."
        : `${changed} ${changed === 1 ? "price" : "prices"} updated.`
    })
  })

/** Reset to list price: every procedure back to its shipped price */
export const resetPrices = authActionClient.action(async () =>
  writeAndRefresh(async (tx) => {
    await tx.update(procedures).set({ price: sql`${procedures.listPrice}` })
    return "Prices back to the shipped list."
  })
)

/** The panel's reset: hours, terms and prices back to how they shipped */
export const resetToDefaults = authActionClient.action(async () =>
  writeAndRefresh(async (tx) => {
    await put(tx, "hours", DEFAULT_SETTINGS.hours)
    await put(tx, "terms", DEFAULT_SETTINGS.terms)
    await tx.update(procedures).set({ price: sql`${procedures.listPrice}` })
    return "Back to the shipped defaults"
  })
)
