// The practice the seed lays around today: a nine-dentist practice in Denver, its rooms and fee schedule, 21 patients
// and the story of each one's care, today's day as the desk sees it at 11:24, and the week's work beyond the chairs.
// Synthetic people only. Days are business days from today (Monday to Friday; today is always a working day), so the
// same practice lands on whatever date the seed runs.
import type {
  Attendee,
  BookingStatus,
  ChairColor,
  TaskCategory,
} from "./schema"

/** Weekdays numbered from Sunday (0), as `weekday()` in src/lib/dates.ts counts them */
const MON = 1
const TUE = 2
const WED = 3
const THU = 4
const FRI = 5
const WEEKDAYS = [MON, TUE, WED, THU, FRI]

export const PRACTITIONERS: {
  id: string
  name: string
  specialty: string
  qualification: string
  phone: string
  email: string
  joinedOn: string
  color: ChairColor
  chairGroup: "daily" | "relief"
  /** Where they work */
  room: string
  /** The weekdays they're in (today they always are, when the day below books them) */
  days: number[]
  /** What they do: the procedures a booking with them can be */
  procedures: string[]
  /** When their lunch starts, minutes after midnight */
  lunch: number
}[] = [
  {
    id: "chen",
    name: "Dr. Amara Chen",
    specialty: "Restorative",
    qualification: "DDS, University of Colorado",
    phone: "(303) 555-0150",
    email: "a.chen@larkspur.example",
    joinedOn: "2018-03-05",
    color: "peacock",
    chairGroup: "daily",
    room: "op-1",
    days: WEEKDAYS,
    procedures: ["checkup", "filling", "crown", "whitening"],
    lunch: 12 * 60,
  },
  {
    id: "menon",
    name: "Dr. Ravi Menon",
    specialty: "Endodontics",
    qualification: "DDS, MS Endodontics",
    phone: "(303) 555-0151",
    email: "r.menon@larkspur.example",
    joinedOn: "2019-09-16",
    color: "grape",
    chairGroup: "daily",
    room: "op-3",
    days: WEEKDAYS,
    procedures: ["root-canal", "checkup"],
    lunch: 12 * 60,
  },
  {
    id: "novak",
    name: "Dr. Elena Novak",
    specialty: "Orthodontics",
    qualification: "DMD, MS Orthodontics",
    phone: "(303) 555-0152",
    email: "e.novak@larkspur.example",
    joinedOn: "2017-01-09",
    color: "tangerine",
    chairGroup: "daily",
    room: "op-4",
    days: [MON, TUE, WED, THU],
    procedures: ["braces", "ortho-consult"],
    lunch: 12 * 60 + 30,
  },
  {
    id: "reyes",
    name: "Dr. Tomas Reyes",
    specialty: "Oral Surgery",
    qualification: "DDS, MD, Oral & Maxillofacial Surgery",
    phone: "(303) 555-0153",
    email: "t.reyes@larkspur.example",
    joinedOn: "2015-06-22",
    color: "basil",
    chairGroup: "daily",
    room: "surgery",
    days: [MON, TUE, THU],
    procedures: ["extraction", "implant-place", "implant"],
    lunch: 12 * 60 + 30,
  },
  {
    id: "sato",
    name: "Hana Sato",
    specialty: "Hygiene",
    qualification: "RDH, BS Dental Hygiene",
    phone: "(303) 555-0154",
    email: "h.sato@larkspur.example",
    joinedOn: "2020-02-17",
    color: "lavender",
    chairGroup: "daily",
    room: "op-2",
    days: WEEKDAYS,
    procedures: ["scaling", "whitening"],
    lunch: 12 * 60,
  },
  {
    id: "weber",
    name: "Dr. Noah Weber",
    specialty: "Periodontics",
    qualification: "DDS, MS Periodontics",
    phone: "(303) 555-0155",
    email: "n.weber@larkspur.example",
    joinedOn: "2021-08-30",
    color: "flamingo",
    chairGroup: "relief",
    room: "op-5",
    days: [TUE, THU],
    procedures: ["srp", "perio-maint"],
    lunch: 12 * 60,
  },
  {
    id: "raman",
    name: "Dr. Priya Raman",
    specialty: "Cosmetic",
    qualification: "DMD, AACD Accredited",
    phone: "(303) 555-0156",
    email: "p.raman@larkspur.example",
    joinedOn: "2022-04-11",
    color: "sage",
    chairGroup: "relief",
    room: "op-6",
    days: [WED, FRI],
    procedures: ["veneer", "whitening"],
    lunch: 12 * 60,
  },
  {
    id: "falk",
    name: "Dr. Jonas Falk",
    specialty: "Implants",
    qualification: "DDS, Fellow, AAID",
    phone: "(303) 555-0157",
    email: "j.falk@larkspur.example",
    joinedOn: "2019-11-04",
    color: "blueberry",
    chairGroup: "relief",
    room: "op-6",
    days: [TUE, THU],
    procedures: ["implant-place", "implant"],
    lunch: 12 * 60 + 30,
  },
  {
    id: "duarte",
    name: "Dr. Ines Duarte",
    specialty: "Prosthodontics",
    qualification: "DMD, MS Prosthodontics",
    phone: "(303) 555-0158",
    email: "i.duarte@larkspur.example",
    joinedOn: "2023-01-23",
    color: "tomato",
    chairGroup: "relief",
    room: "op-5",
    days: [MON, WED],
    procedures: ["crown", "denture"],
    lunch: 12 * 60 + 30,
  },
]

export const ROOMS = [
  { id: "op-1", name: "Op 1", kind: "Chairside" },
  { id: "op-2", name: "Op 2", kind: "Chairside" },
  { id: "op-3", name: "Op 3", kind: "Chairside" },
  { id: "op-4", name: "Op 4", kind: "Chairside" },
  { id: "op-5", name: "Op 5", kind: "Chairside" },
  { id: "op-6", name: "Op 6", kind: "Chairside" },
  { id: "surgery", name: "Surgery Suite", kind: "Surgical" },
] as const

/** The fee schedule: each procedure's CDT code, chair time and what a visit bills */
export const PROCEDURES = [
  {
    id: "checkup",
    code: "D0120",
    name: "Exam & X-rays",
    minutes: 30,
    price: 145,
  },
  {
    id: "scaling",
    code: "D1110",
    name: "Hygiene Cleaning",
    minutes: 45,
    price: 135,
  },
  {
    id: "whitening",
    code: "D9972",
    name: "Whitening",
    minutes: 60,
    price: 450,
  },
  {
    id: "filling",
    code: "D2391",
    name: "Composite Filling",
    minutes: 45,
    price: 210,
  },
  {
    id: "root-canal",
    code: "D3330",
    name: "Root Canal",
    minutes: 90,
    price: 1150,
  },
  {
    id: "extraction",
    code: "D7140",
    name: "Extraction",
    minutes: 60,
    price: 325,
  },
  { id: "crown", code: "D2740", name: "Crown", minutes: 60, price: 1250 },
  {
    id: "braces",
    code: "D8670",
    name: "Braces Adjustment",
    minutes: 30,
    price: 150,
  },
  {
    id: "ortho-consult",
    code: "D8660",
    name: "Ortho Consult",
    minutes: 45,
    price: 175,
  },
  {
    id: "implant-place",
    code: "D6010",
    name: "Implant Placement",
    minutes: 90,
    price: 2400,
  },
  {
    id: "implant",
    code: "D0171",
    name: "Implant Review",
    minutes: 30,
    price: 95,
  },
  {
    id: "srp",
    code: "D4341",
    name: "Scaling & Root Planing",
    minutes: 60,
    price: 280,
  },
  {
    id: "perio-maint",
    code: "D4910",
    name: "Perio Maintenance",
    minutes: 60,
    price: 185,
  },
  {
    id: "veneer",
    code: "D2962",
    name: "Porcelain Veneer",
    minutes: 60,
    price: 1350,
  },
  {
    id: "denture",
    code: "D5110",
    name: "Denture Fitting",
    minutes: 60,
    price: 1600,
  },
] as const

/**
 * `chart|first|last|primary practitioner|stage|phone|patient since (days ago)`; emails are first.last@example.com. Every
 * number is in the 555-01xx range that's never assigned.
 */
export const PATIENTS = `
2041|Ifeoma|Okafor|chen|active|(720) 555-0101|1460
2088|Samir|Haddad|menon|active|(303) 555-0102|820
2113|Elsa|Lindqvist|reyes|in_chair|(720) 555-0103|2190
2156|Mateo|Santos|menon|active|(303) 555-0104|640
2190|Laila|Abadi|novak|active|(720) 555-0105|410
2204|Gregory|Whitfield|menon|in_chair|(303) 555-0106|1825
2231|Wei Ling|Tan|sato|active|(720) 555-0107|3100
2277|Chiara|Novello|novak|active|(303) 555-0108|520
2290|Declan|Brennan|raman|active|(720) 555-0109|930
2312|Yuki|Nakamura|chen|active|(303) 555-0110|1200
2326|Kwame|Osei|duarte|active|(720) 555-0111|760
2334|Irina|Petrova|reyes|active|(303) 555-0112|1550
2347|Nadia|Rahman|chen|active|(720) 555-0113|2600
2355|Bruno|Silva|weber|active|(303) 555-0114|1100
2368|Marta|Kowalski|duarte|active|(720) 555-0115|2950
2371|Dawit|Bekele|menon|active|(303) 555-0116|480
2389|Camille|Fontaine|raman|active|(720) 555-0117|690
2394|Lea|Moreau|novak|new|(303) 555-0118|12
2402|Diego|Ibarra|novak|active|(720) 555-0119|380
2417|Henrik|Olsen|chen|in_chair|(303) 555-0120|3400
2425|Priya|Chowdhury|chen|active|(720) 555-0121|870`

/**
 * The rest of the practice's patients, `chart|first|last|care plan`: the seed turns each plan into visits around today
 * (a hygiene recall, a run of fillings, a root canal and its crown, monthly braces, perio therapy, an implant, veneers,
 * dentures), and gives them the details the ones above spell out. "lapsed" patients haven't been in for over a year;
 * "new" ones have their first visit ahead.
 */
export const MORE_PATIENTS = `
2431|Margaret|Hollis|prosth
2436|Jamal|Carter|restor
2438|Sofia|Martinez|hygiene
2442|Owen|Fitzgerald|ortho
2445|Grace|Kim|cosmetic
2449|Luis|Hernandez|endo
2453|Hannah|Schultz|perio
2457|Marcus|Bell|implant
2460|Emily|Tran|hygiene
2464|Robert|Nguyen|restor
2467|Isabella|Romero|ortho
2471|Daniel|Cohen|hygiene
2474|Aaliyah|Johnson|cosmetic
2478|Thomas|Becker|prosth
2481|Mei|Wong|restor
2485|Carlos|Vega|endo
2488|Olivia|Parker|hygiene
2492|Ethan|Brooks|ortho
2495|Fatima|Ali|hygiene
2497|William|Turner|perio
2503|Chloe|Anderson|cosmetic
2506|Anthony|Russo|implant
2509|Ana|Gutierrez|restor
2512|Benjamin|Ward|lapsed
2515|Keisha|Robinson|endo
2518|Samuel|Ortiz|hygiene
2521|Rachel|Goldberg|restor
2524|Kenji|Watanabe|perio
2527|Maya|Patel|ortho
2530|Jack|Morrison|restor
2533|Lucia|Flores|hygiene
2536|George|Papadopoulos|prosth
2539|Zoe|Mitchell|hygiene
2542|Andre|Williams|cosmetic
2545|Linda|Sorensen|implant
2548|Arjun|Shah|endo
2551|Natalie|Ramirez|restor
2554|Tyler|Jensen|ortho
2557|Ruth|Adeyemi|perio
2560|Paul|Kowalczyk|restor
2563|Jasmine|Lee|hygiene
2566|Michael|O'Brien|hygiene
2569|Elena|Vasquez|prosth
2572|David|Friedman|implant
2575|Amara|Okonkwo|ortho
2578|Christopher|Hayes|restor
2581|Valentina|Cruz|cosmetic
2584|Harold|Fischer|prosth
2587|Nia|Thompson|hygiene
2590|Ryan|Castillo|lapsed
2593|Abigail|Stewart|restor
2596|Hassan|Karimi|endo
2599|Lily|Lin|ortho
2602|Frank|Delgado|implant
2605|Megan|Sullivan|hygiene
2608|Kwabena|Mensah|restor
2611|Sarah|Lindgren|perio
2614|Joshua|Rivera|hygiene
2617|Priya|Venkatesan|cosmetic
2620|Walter|Hughes|prosth
2623|Camila|Soto|new
2626|Nathan|Price|ortho
2629|Leila|Farouk|restor
2632|Steven|Clarke|endo
2635|Rosa|Morales|perio
2638|Kevin|Yamamoto|hygiene
2641|Julia|Novotny|restor
2644|Terrence|Washington|implant
2647|Ingrid|Larsen|prosth
2650|Diego|Morales|ortho
2653|Hailey|Brennan|hygiene
2656|Omar|Haddad|restor
2659|Tanya|Petrov|cosmetic
2662|Brian|Kelly|lapsed
2665|Adaeze|Nwosu|hygiene
2668|Richard|Moore|implant
2671|Gabriela|Mendoza|endo
2674|Aiden|Murphy|new-ortho
2677|Yasmin|Rahimi|restor
2680|Patrick|Doyle|perio
2683|Hye-jin|Park|hygiene
2686|Victor|Alvarez|restor
2689|Eleanor|Price|prosth
2692|Malik|Harris|hygiene
2695|Ava|Reynolds|ortho
2698|Jorge|Castaneda|endo
2701|Sienna|Walsh|cosmetic
2704|Wei|Zhang|hygiene
2707|Dolores|Jimenez|prosth
2710|Ahmed|Hassan|implant
2713|Brooke|Nelson|hygiene
2716|Tobias|Weiss|restor
2719|Imani|Jackson|ortho
2722|Raymond|Lopez|perio
2725|Charlotte|Evans|restor
2728|Arash|Tehrani|lapsed`

/**
 * Today, as the desk sees it at 11:24: the morning done, three patients in a chair, two waiting, the afternoon ahead
 * (`start|minutes|chart|procedure|practitioner|status`). Rooms are each practitioner's own.
 */
export const TODAY = `
08:00|30|2041|checkup|chen|completed
08:45|45|2347|filling|chen|completed
09:45|60|2290|crown|chen|completed
11:00|45|2425|filling|chen|arrived
13:00|30|2355|checkup|chen|booked
14:00|45|2088|filling|chen|booked
15:00|30|2204|checkup|chen|cancelled
16:00|45|2417|filling|chen|booked
08:30|90|2156|root-canal|menon|completed
10:15|90|2204|root-canal|menon|in_chair
14:30|90|2371|root-canal|menon|booked
08:30|30|2190|braces|novak|completed
09:00|30|2402|braces|novak|completed
10:00|30|2277|braces|novak|completed
11:15|45|2394|ortho-consult|novak|arrived
09:00|60|2334|extraction|reyes|unpaid
10:30|90|2113|implant-place|reyes|in_chair
14:00|60|2355|extraction|reyes|booked
08:00|45|2231|scaling|sato|completed
09:00|45|2041|scaling|sato|completed
10:00|45|2312|scaling|sato|completed
11:00|45|2417|scaling|sato|in_chair
13:00|45|2389|scaling|sato|booked
15:00|45|2425|scaling|sato|booked
08:30|60|2368|denture|duarte|completed
09:45|60|2326|crown|duarte|completed
11:30|60|2156|crown|duarte|booked`

/**
 * Each patient's care beyond today, in business days from it (`chart|day|procedure|practitioner|status`): the past is
 * Completed unless it says otherwise, the future Booked. A visit on a day its practitioner is out moves to the nearest
 * day they're in, away from today; the seed gives every visit its time.
 */
export const VISITS = `
2041|-38|checkup|chen
2041|-38|scaling|sato
2041|-14|filling|chen
2041|-7|filling|chen
2041|7|filling|chen
2041|60|checkup|chen
2041|60|scaling|sato
2088|-20|checkup|menon
2088|-6|root-canal|menon
2088|2|checkup|menon
2088|5|crown|duarte
2088|12|crown|duarte
2088|45|scaling|sato
2113|-33|extraction|reyes
2113|-32|checkup|chen
2113|-24|implant|reyes
2113|3|implant|reyes
2113|10|implant|falk
2113|30|implant|falk
2113|45|crown|duarte
2156|-22|checkup|chen
2156|-21|scaling|sato
2156|8|crown|duarte
2156|15|checkup|menon
2190|-40|braces|novak
2190|-20|braces|novak
2190|20|braces|novak
2190|40|braces|novak
2204|-15|checkup|chen
2204|-14|scaling|sato
2204|2|checkup|menon
2204|10|crown|chen
2204|16|crown|chen
2231|-32|checkup|chen
2231|-8|whitening|sato
2231|8|filling|chen
2231|12|perio-maint|weber
2231|60|scaling|sato
2277|-41|braces|novak
2277|-21|braces|novak
2277|19|braces|novak|cancelled
2277|21|braces|novak
2277|39|braces|novak
2290|-25|checkup|chen
2290|-24|scaling|sato
2290|-10|whitening|raman
2290|-2|checkup|chen
2290|5|veneer|raman
2290|25|veneer|raman
2312|-28|checkup|chen
2312|-3|filling|chen|cancelled
2312|4|filling|chen
2312|11|filling|chen
2326|-30|checkup|menon|unpaid
2326|-19|root-canal|menon
2326|-9|crown|duarte
2326|2|checkup|chen
2326|30|checkup|chen
2334|-12|checkup|chen
2334|3|implant|reyes
2334|9|implant-place|falk
2334|30|implant|falk
2347|-36|scaling|sato
2347|-35|checkup|chen
2347|-20|checkup|chen|cancelled
2347|5|filling|chen
2347|55|scaling|sato
2355|-26|srp|weber
2355|-16|srp|weber
2355|-4|perio-maint|weber
2355|5|implant|reyes
2355|15|implant-place|falk
2355|30|perio-maint|weber
2368|-30|extraction|reyes
2368|-20|denture|duarte
2368|-15|denture|duarte
2368|-5|denture|duarte|unpaid
2368|5|denture|duarte
2368|10|denture|duarte
2371|-24|checkup|menon
2371|-11|root-canal|menon
2371|-3|crown|chen|unpaid
2371|6|crown|chen
2371|35|scaling|sato
2389|-21|whitening|raman
2389|-7|veneer|raman
2389|3|veneer|raman
2389|25|checkup|chen
2394|-9|checkup|chen
2394|6|braces|novak
2394|26|braces|novak
2402|-38|braces|novak
2402|-18|braces|novak
2402|22|braces|novak
2402|42|braces|novak
2417|-40|checkup|chen
2417|-13|filling|chen
2417|-8|srp|weber
2417|6|perio-maint|weber
2417|14|crown|chen
2417|20|crown|chen
2425|-17|checkup|chen
2425|-16|scaling|sato
2425|-6|extraction|reyes
2425|7|filling|chen
2425|18|whitening|raman
2425|44|scaling|sato`

/** Today's held time beyond lunch: `start|minutes|practitioner|title` */
export const BLOCKS = `
16:00|60|reyes|Post-op Calls
16:30|60|novak|Case Review
16:30|60|sato|Sterilization`

/** Today's board log, oldest first: `time|chart|kind|detail|read` (the rail's bell shows the newest five) */
export const TODAYS_LOG = `
07:52|2041|booked|Scheduled for 8:00 AM|read
08:47|2231|status|Marked Completed|read
09:05|2277|rescheduled|Moved to 10:00 AM|unread
10:38|2204|cancelled|Called to cancel|unread
11:10|2334|status|Marked Unpaid|unread
11:20|2394|status|Marked Arrived|unread`

/** The practice's week of work beyond the chairs (the Appointments page), Monday to Friday */
export const TASKS: {
  title: string
  category: TaskCategory
  day: number
  /** "09:00-10:30"; absent for all day */
  time?: string
  reference?: string
  patient: string
  clinician: string
  attendees: Attendee[]
  attendeeCount: number
  requirement: string
  dueOffset: number
  source?: [title: string, isoDate: string]
  stage?: string
  workstream?: "Tasks" | "Treatment Plan" | "Paperwork"
  work?: [done: number, total: number]
  status?: string
  priority?: "Low" | "Medium" | "High"
  recurring?: boolean
  room?: string
  state: "To Do" | "In Progress" | "Waiting" | "Scheduled"
  checks?: [pass: number, fail: number, pending: number]
  note?: string
  notes?: number
}[] = [
  {
    title: "Elsa Lindqvist (Implant Placement)",
    category: "procedure",
    day: 0,
    reference: "PT-2113",
    patient: "Elsa Lindqvist",
    clinician: "Dr. Tomas Reyes",
    attendees: [
      who("Dr. Tomas Reyes"),
      who("Dr. Jonas Falk"),
      who("Hana Sato"),
    ],
    attendeeCount: 3,
    requirement: "Signed Consent",
    dueOffset: 0,
    source: ["Implant Treatment Plan", "2026-08-04"],
    stage: "5 - Procedure",
    workstream: "Tasks",
    work: [7, 8],
    status: "Ready To Treat",
    priority: "High",
    state: "In Progress",
    checks: [7, 0, 1],
    note: "The surgery suite is hers from 10:30. The lab sent the surgical guide; only the healing abutment size is still open.",
    notes: 24,
  },
  {
    title: "Pre-Authorization: Delta Dental",
    category: "insurance",
    day: 0,
    time: "09:00-10:30",
    patient: "Elsa Lindqvist",
    clinician: "Dana Whitaker",
    attendees: [who("Dana Whitaker"), who("Dr. Tomas Reyes")],
    attendeeCount: 2,
    requirement: "Pre-Authorization",
    dueOffset: 0,
    source: ["Implant Treatment Plan", "2026-08-04"],
    stage: "5 - Procedure",
    workstream: "Paperwork",
    work: [5, 6],
    status: "Awaiting Insurer",
    priority: "High",
    room: "Front Desk",
    state: "In Progress",
    checks: [5, 0, 1],
    note: "Delta Dental has the narrative and the CBCT scan. Waiting on the approval number before she's seated.",
    notes: 9,
  },
  {
    title: "Weekly Clinical Huddle",
    category: "meeting",
    day: 0,
    time: "13:00-14:00",
    patient: "Internal",
    clinician: "Dr. Amara Chen",
    attendees: [
      who("Dr. Amara Chen"),
      who("Dr. Ravi Menon"),
      who("Dr. Elena Novak"),
    ],
    attendeeCount: 9,
    requirement: "Case Review",
    dueOffset: 0,
    room: "Staff Room",
    state: "Scheduled",
  },
  {
    title: "New Patient Call: Lea Moreau",
    category: "call",
    day: 1,
    time: "10:00-11:00",
    patient: "Lea Moreau",
    clinician: "Dr. Elena Novak",
    attendees: [who("Dr. Elena Novak"), who("Dana Whitaker")],
    attendeeCount: 2,
    requirement: "Consultation",
    dueOffset: 18,
    stage: "1 - Consultation",
    status: "Confirmed",
    state: "Scheduled",
    notes: 2,
  },
  {
    title: "Treatment Plan Review: Gregory Whitfield",
    category: "call",
    day: 1,
    time: "10:30-12:00",
    patient: "Gregory Whitfield",
    clinician: "Dr. Ravi Menon",
    attendees: [who("Dr. Ravi Menon"), who("Dr. Amara Chen")],
    attendeeCount: 2,
    requirement: "Treatment Approval",
    dueOffset: 39,
    stage: "3 - Diagnosis",
    status: "Confirmed",
    state: "Scheduled",
    notes: 5,
  },
  {
    title: "Send post-op instructions to Irina",
    category: "task",
    day: 2,
    patient: "Irina Petrova",
    clinician: "Dr. Tomas Reyes",
    attendees: [who("Dr. Tomas Reyes"), who("Dana Whitaker")],
    attendeeCount: 2,
    requirement: "Aftercare Sheet",
    dueOffset: 2,
    source: ["Extraction Consent", "2026-09-14"],
    stage: "6 - Aftercare",
    workstream: "Treatment Plan",
    work: [1, 5],
    status: "Requested",
    priority: "Low",
    state: "To Do",
    checks: [1, 0, 4],
    notes: 4,
  },
  {
    title: "Hygiene Recall Calls",
    category: "recall",
    day: 2,
    time: "09:00-10:00",
    patient: "Internal",
    clinician: "Hana Sato",
    attendees: [who("Hana Sato"), who("Dana Whitaker")],
    attendeeCount: 2,
    requirement: "Recall List",
    dueOffset: 5,
    status: "Overdue Risk",
    priority: "High",
    state: "Waiting",
    note: "Twelve patients are past their six-month cleaning. Call them before October's hygiene book fills.",
    notes: 6,
  },
  {
    title: "Case Review: Full Dentures",
    category: "call",
    day: 2,
    time: "15:00-16:45",
    patient: "Marta Kowalski",
    clinician: "Dr. Ines Duarte",
    attendees: [who("Dr. Ines Duarte"), who("Dr. Tomas Reyes")],
    attendeeCount: 2,
    requirement: "Chart Review",
    dueOffset: 11,
    stage: "3 - Diagnosis",
    room: "Op 5",
    state: "Scheduled",
    notes: 3,
  },
  {
    title: "Irina Petrova insurance claim",
    category: "insurance",
    day: 3,
    patient: "Irina Petrova",
    clinician: "Dana Whitaker",
    attendees: [who("Dana Whitaker"), who("Dr. Tomas Reyes")],
    attendeeCount: 2,
    requirement: "Insurance Claim",
    dueOffset: 12,
    source: ["Extraction Consent", "2026-09-14"],
    workstream: "Paperwork",
    work: [4, 9],
    status: "Claim Returned",
    priority: "High",
    recurring: true,
    state: "To Do",
    checks: [4, 3, 2],
    note: "Aetna returned the claim without a tooth number. Resubmit with the periapical X-ray attached.",
    notes: 12,
  },
  {
    title: "Sterilization Log Audit",
    category: "task",
    day: 3,
    time: "10:00-11:15",
    patient: "Internal",
    clinician: "Hana Sato",
    attendees: [who("Hana Sato"), who("Dana Whitaker")],
    attendeeCount: 2,
    requirement: "Compliance Check",
    dueOffset: 3,
    workstream: "Tasks",
    work: [3, 6],
    status: "In Review",
    priority: "Medium",
    state: "In Progress",
    checks: [3, 1, 2],
    notes: 5,
  },
  {
    title: "Monthly Case Review",
    category: "meeting",
    day: 3,
    time: "13:30-15:30",
    patient: "Internal",
    clinician: "Dr. Amara Chen",
    attendees: [
      who("Dr. Amara Chen"),
      who("Dr. Noah Weber"),
      who("Dr. Priya Raman"),
    ],
    attendeeCount: 12,
    requirement: "Case Review",
    dueOffset: 3,
    room: "Staff Room",
    state: "Scheduled",
    notes: 1,
  },
  {
    title: "Braces Kickoff: Lea Moreau",
    category: "meeting",
    day: 4,
    time: "09:00-10:15",
    patient: "Lea Moreau",
    clinician: "Dr. Elena Novak",
    attendees: [who("Dr. Elena Novak"), who("Dana Whitaker"), who("Hana Sato")],
    attendeeCount: 3,
    requirement: "Consultation",
    dueOffset: 4,
    stage: "1 - Consultation",
    room: "Op 4",
    state: "Scheduled",
    notes: 2,
  },
  {
    title: "Lab Follow-Up: Crown Shade",
    category: "recall",
    day: 4,
    time: "11:30-12:45",
    patient: "Samir Haddad",
    clinician: "Dr. Ines Duarte",
    attendees: [who("Dr. Ines Duarte"), who("Dana Whitaker")],
    attendeeCount: 2,
    requirement: "Lab Turnaround",
    dueOffset: 7,
    source: ["Crown Lab Prescription", "2026-09-21"],
    stage: "4 - Lab Work",
    status: "Waiting On Lab",
    priority: "Medium",
    state: "Waiting",
    checks: [3, 1, 2],
    notes: 7,
  },
  {
    title: "Aftercare Check: Elsa Lindqvist",
    category: "call",
    day: 4,
    time: "15:00-16:15",
    patient: "Elsa Lindqvist",
    clinician: "Dr. Jonas Falk",
    attendees: [
      who("Dr. Jonas Falk"),
      who("Dr. Tomas Reyes"),
      who("Hana Sato"),
    ],
    attendeeCount: 3,
    requirement: "Aftercare Handover",
    dueOffset: 18,
    source: ["Implant Treatment Plan", "2026-08-04"],
    stage: "6 - Aftercare",
    workstream: "Paperwork",
    work: [2, 4],
    status: "Follow-Up Due",
    priority: "Medium",
    room: "Op 6",
    state: "To Do",
    checks: [2, 0, 2],
    notes: 3,
  },
]

function who(name: string): Attendee {
  const words = name.replace(/^Dr\.\s+/, "").split(" ")
  return {
    name,
    initials: `${words[0]?.[0] ?? ""}${words.at(-1)?.[0] ?? ""}`,
  }
}

/** A booking line, parsed: a business day from today and a time */
export type BookingLine = {
  day: number
  start: string
  minutes: number
  chart: number
  procedure: string
  practitioner: string
  status: BookingStatus
}

/** A table row: `N` cells, and any optional ones after them */
type Row<N extends number, R extends string[] = []> = R["length"] extends N
  ? [...R, ...(string | undefined)[]]
  : Row<N, [...R, string]>

/** The non-empty lines of a `|` table, split; a line with fewer than `width` cells is a typo in the seed */
export function rows<N extends number>(lines: string, width: N): Row<N>[] {
  return lines
    .trim()
    .split("\n")
    .map((line) => {
      const cells = line.split("|")
      if (cells.length < width)
        throw new Error(`Seed row "${line}" has fewer than ${width} cells`)
      return cells as Row<N>
    })
}
