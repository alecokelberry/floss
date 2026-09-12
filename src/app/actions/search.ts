"use server"

import { asc } from "drizzle-orm"

import { db } from "@/db"
import { getDirectory } from "@/db/queries/patients"
import { getLedger } from "@/db/queries/payments"
import { getPractitioners } from "@/db/queries/shell"
import { getTasks } from "@/db/queries/tasks"
import { searchStamp } from "@/lib/dates"
import { INVOICE_STATUS, money } from "@/lib/invoices"
import { patientPhoto, practitionerPhoto } from "@/lib/portraits"
import { authActionClient } from "@/lib/safe-action"
import type { Hit } from "@/lib/search"
import {
  BOOKING_STATUS,
  INVOICE_TONE,
  PATIENT_STAGE,
  STAGE_TONE,
  TASK_CATEGORY,
} from "@/lib/tones"

/** Everything Search can find beyond the pages: clinicians, the planner, patients, bookings and invoices */
export const loadSearchIndex = authActionClient.action(
  async (): Promise<Hit[]> => {
    const [clinicians, tasks, patients, invoices, bookings] = await Promise.all(
      [
        getPractitioners(),
        getTasks(),
        getDirectory(),
        getLedger(),
        db.query.bookings.findMany({
          orderBy: (b) => [asc(b.startsAt), asc(b.seq)],
          columns: { id: true, startsAt: true, status: true },
          with: {
            patient: {
              columns: { chart: true, firstName: true, lastName: true },
            },
            practitioner: { columns: { name: true } },
            procedure: { columns: { name: true } },
            room: { columns: { name: true } },
          },
        }),
      ]
    )
    return [
      ...clinicians.map((c): Hit => ({
        kind: "clinician",
        key: `clinician-${c.id}`,
        title: c.name,
        meta: [c.specialty, c.qualification].filter(Boolean),
        avatar: {
          src: c.photoUrl ?? practitionerPhoto(c.id),
          name: c.name,
        },
        open: { kind: "clinician", id: c.id },
      })),
      ...tasks.map((t): Hit => ({
        kind: "task",
        key: `task-${t.id}`,
        title: t.title,
        meta: [TASK_CATEGORY[t.category].label, t.patient, t.clinician],
        trailing: searchStamp(t.startsAt),
        tile: t.category,
        open: { kind: "task", id: t.id },
      })),
      ...patients.map((p): Hit => ({
        kind: "patient",
        key: `patient-${p.id}`,
        title: p.name,
        badge: {
          tone: STAGE_TONE[p.stage],
          label: PATIENT_STAGE[p.stage].label,
        },
        meta: [p.practitioner?.name ?? "Unassigned", p.nextTreatment].filter(
          (m): m is string => Boolean(m)
        ),
        trailing: p.chart,
        avatar: { src: patientPhoto(p.chart), name: p.name },
        open: { kind: "patient", id: p.id },
      })),
      ...bookings.map((b): Hit => {
        const name = `${b.patient.firstName} ${b.patient.lastName}`
        return {
          kind: "booking",
          key: `booking-${b.id}`,
          title: name,
          badge: {
            tone: BOOKING_STATUS[b.status].badge,
            label: BOOKING_STATUS[b.status].label,
          },
          meta: [b.procedure.name, b.practitioner.name, b.room?.name].filter(
            (m): m is string => Boolean(m)
          ),
          trailing: searchStamp(b.startsAt),
          avatar: { src: patientPhoto(b.patient.chart), name },
          open: { kind: "booking", id: b.id },
        }
      }),
      ...invoices.map((i): Hit => {
        const [line] = i.lines
        const name = `${line.patient.firstName} ${line.patient.lastName}`
        return {
          kind: "invoice",
          key: `invoice-${i.key}`,
          title: i.number,
          badge: {
            tone: INVOICE_TONE[i.status],
            label: INVOICE_STATUS[i.status],
          },
          meta: [name, i.treatment, line.practitioner.name],
          trailing: money(i.amount),
          avatar: { src: patientPhoto(line.patient.chart), name },
          open: { kind: "invoice", key: i.key },
        }
      }),
    ]
  }
)
