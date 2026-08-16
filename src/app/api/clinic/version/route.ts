import { getClinicVersion } from "@/db/queries/shell"

/**
 * `GET /api/clinic/version`: whether anything changed, for LiveRefresh to poll every few seconds. Staff only
 * (`getClinicVersion` checks the session first); the answer is a stamp, never clinic data.
 */
export async function GET() {
  return Response.json(
    { version: await getClinicVersion() },
    { headers: { "Cache-Control": "no-store" } }
  )
}
