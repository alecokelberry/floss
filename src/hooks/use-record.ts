"use client"

import { useEffect, useState } from "react"

/**
 * One record for a sheet, read through its server action (`loadPatient`, `loadInvoice`, …) when the sheet opens:
 * undefined while it loads, null when it's gone (or the read failed). No key, no read (a New form); a new
 * `revision` reads it again.
 */
export function useRecord<K, T>(
  load: (key: K) => Promise<{ data?: T | null } | undefined>,
  key: K | undefined,
  revision = 0
) {
  const [record, setRecord] = useState<T | null | undefined>(undefined)
  useEffect(() => {
    if (key === undefined) return
    let live = true
    void load(key).then((r) => live && setRecord(r?.data ?? null))
    return () => {
      live = false
    }
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- a new revision only asks for the read again
  }, [load, key, revision])
  return record
}
