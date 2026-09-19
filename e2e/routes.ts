// Every page the app serves, with the h1 each must show: the routes and layout specs walk it. The calendar and
// planner are titled by their date, which changes daily.
const DATED = /\d/

export const ROUTES: { path: string; heading: string | RegExp }[] = [
  { path: "/dashboard", heading: "Clinic Dashboard" },
  { path: "/calendar", heading: DATED },
  { path: "/calendar?view=week", heading: DATED },
  { path: "/appointments", heading: DATED },
  { path: "/appointments?view=week", heading: DATED },
  { path: "/appointments?view=day", heading: DATED },
  { path: "/appointments?view=agenda", heading: DATED },
  { path: "/patients", heading: "Patients" },
  { path: "/staff", heading: "Staff" },
  { path: "/payments", heading: "Payments" },
  ...[
    "profile",
    "hours",
    "chairs",
    "procedures",
    "billing",
    "notifications",
  ].map((tab) => ({ path: `/settings?tab=${tab}`, heading: "Settings" })),
]
