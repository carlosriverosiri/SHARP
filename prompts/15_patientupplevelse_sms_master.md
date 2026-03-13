# Master Prompt: Patientupplevelse via SMS (Astro + Supabase + 46elks)

**Role:** Senior full-stack Astro engineer with deep experience in Supabase, 46elks, Netlify Functions, Tailwind CSS, SSR auth, RLS, and GDPR-aware healthcare tooling in Sweden.

**Task:** Design and implement a new SHARP module for anonymous patient experience surveys via SMS, using the existing SHARP architecture and coding style.

---

## Core Context

This feature is **not** a standalone app and should **not** be built in Next.js unless explicitly requested later.

It should be built as a **new module inside the existing SHARP Astro project**, reusing:

- Astro SSR pages
- Astro API routes under `src/pages/api/**`
- Supabase auth + RLS
- 46elks SMS integration
- Netlify Functions for async/background work
- Tailwind design patterns already used in `/personal/kort-varsel`

The module must also be discoverable from the personal portal. Add a visible navigation link to `/personal/enkat` from the relevant personal portal entry point.

Relevant existing references:

- `src/pages/personal/kort-varsel.astro`
- `netlify/functions/scheduled-sms.mts`
- `src/lib/kryptering.ts`
- `docs/ENKAT-PATIENTUPPLEVELSE.md`
- `docs/ENKAT-IMPLEMENTATIONSPLAN.md`

---

## Product Goal

Build a patient survey system that helps the clinic improve care quality and coach providers over time.

The system must be:

- anonymous for patients
- provider-specific in analysis
- useful for quality improvement
- careful with reminders and patient trust

This is **not** a rating gimmick. It is a structured improvement and coaching tool.

---

## CSV Input Rules

The import file is a semicolon-separated export with this observed structure:

```text
Patient-ID;Mobiltelefon;Vårdgivare;Datum;Bokningstyp;
b5kp8fc;+46707676108;Sophie Lantz;2026-02-02;KuralinkFysiskt;
1293hob;+46706262665;Björn Nordenstedt;2026-02-02;5. OPERATION;
```

Important:

- row numbers shown in PDF/Notepad++ are **not part of the file**
- delimiter is `;`
- phone is already often `+46...`
- date is `YYYY-MM-DD`
- trailing `;` may create an empty final column

Expected columns:

- `Patient-ID`
- `Mobiltelefon`
- `Vårdgivare`
- `Datum`
- `Bokningstyp` (optional but strongly preferred)
- `Starttid` (optional, if available from source system)

Important business rule:

- the truly fixed CSV headers are `Patient-ID`, `Mobiltelefon`, `Vårdgivare`, `Datum`
- `Bokningstyp` is expected to evolve over time and must not be treated as a closed hardcoded list
- provider names must also be treated as dynamic input data, not a fixed hardcoded doctor list

Parser requirements:

- use PapaParse
- support delimiter `;`
- trim whitespace
- ignore empty trailing column
- validate phone and date
- do not rewrite already valid `+46` phone numbers unnecessarily
- allow fallback booking type from admin form
- allow `Starttid` when available and keep it for later analysis
- show invalid rows and duplicate-resolution reasoning in the UI
- be tolerant of minor header/whitespace/encoding variation

---

## Deduplication and visit-priority rules

If the same patient appears more than once:

1. deduplicate primarily by `Patient-ID`
2. fallback to phone if `Patient-ID` is missing

If duplicate rows exist for the same patient:

- prioritize **new visit / remiss** over revisit
- if multiple new visits exist, choose a consistent policy (usually latest date)
- if only revisits exist, choose the latest relevant one

Create a booking-type classifier helper.

Store both:

- raw booking type from CSV
- normalized booking type used for analytics

Suggested normalized groups:

- `nybesok`
- `nybesok_remiss`
- `aterbesok`
- `ssk_besok`
- `telefon`
- `ovrigt`

Suggested text heuristics:

- contains `nybesök` => `nybesok`
- contains `remiss` => `nybesok_remiss`
- contains `åb` or `återbesök` => `aterbesok`
- contains `ssk` => `ssk_besok`
- contains `telefon` => `telefon`
- else => `ovrigt`

These heuristics are an analytics convenience, not a fixed master taxonomy.
New booking types must be able to appear without breaking the system.

The import UI must show:

- total rows
- valid rows
- invalid rows
- duplicate rows
- which row was selected per duplicate patient
- why that row was selected

---

## Survey design

Do **not** build only a single 1-10 score.

Use a short structured survey that supports coaching:

### Required questions

1. `Hur nöjd är du med ditt besök som helhet?`  
   Scale: `1-10`

2. `Hur upplevde du bemötandet?`  
   Scale: `1-5`

3. `Hur tydlig var informationen du fick?`  
   Scale: `1-5`

4. `Kände du dig lyssnad på?`  
   Scale: `1-5`

5. `Fick du en tydlig plan framåt?`  
   Scale: `1-5`

6. `Vad var bra?`  
   Optional textarea

7. `Vad hade kunnat vara bättre?`  
   Optional textarea

Keep the UI extremely simple and mobile-first.

---

## Reminder strategy

Patients must not be spammed.

Required default behavior:

- 1 initial SMS
- maximum 1 reminder
- no further reminders

Recommended default:

- first send: same day or day after visit
- reminder: 48 hours later
- no reminder if patient has already answered
- respect a send window if configured

Admin UI should allow:

- `Skicka påminnelse`: Ja/Nej
- `Påminn efter`: number of hours

---

## Privacy and GDPR

The end-user experience should describe the survey as anonymous.

However, implementation must follow this realistic rule:

- no long-term storage of patient phone or patient ID beyond what is necessary for safe dispatch
- analysis data must be anonymous at patient level
- provider-level analysis is allowed and expected

Free text must be treated as potentially sensitive.

Minimum safeguards:

- warning text telling patients not to write personal or medical identifiers
- server-side filtering/redaction for obvious phone numbers, personnummer and emails

---

## Access model

Use a coaching-friendly permission model.

Recommended behavior:

- provider sees only their own results, comments and trends
- admin/chef sees all providers side by side
- wider open visibility only if explicitly requested later

Do not assume full org-wide raw comment visibility by default.

Treat raw comments as more sensitive than aggregate scores.

---

## Technical architecture

### Required implementation paths

- `src/pages/personal/enkat.astro`
- `src/pages/e/[kod].astro`
- `src/pages/api/enkat/upload.ts`
- `src/pages/api/enkat/send.ts`
- `src/pages/api/enkat/submit.ts`
- `src/pages/api/enkat/dashboard.ts`
- `src/lib/enkat-csv-parser.ts`
- `src/lib/enkat-booking-classifier.ts`
- `supabase/migrations/009-enkat.sql`

Optional if needed:

- `netlify/functions/enkat-send-queue.mts`

### Database tables

Create or propose:

- `enkat_kampanjer`
- `enkat_utskick`
- `enkat_svar`
- `enkat_delivery_log`

Use UUIDs.
Use `created_at`.
Use provider name and normalized booking type in persisted analytics rows.
`enkat_delivery_log` should be treated as required in V1, not optional.

---

## Minimum dashboard requirements

Do not ship sending without basic feedback.

The dashboard must show at least:

- number sent
- number answered
- response rate
- response rate per provider
- response rate per booking type
- average overall score
- average sub-scores
- number of reminders sent
- number of failed deliveries
- latest comments

If `Starttid` exists, the system should also preserve enough data to analyze whether response rate correlates with the delay between visit start and first SMS send.

Also show sample-size awareness:

- if a provider has very few answers, indicate that interpretation should be cautious
- hide provider-specific results entirely if sample size is below an anonymity threshold

Recommended starting anonymity threshold:

- fewer than 5 answers in the selected period => do not show provider-specific result cards

---

## UI guidance

### Admin page `/personal/enkat`

Must include:

- CSV upload area
- validation preview
- duplicate resolution summary
- booking-type fallback field
- SMS template field
- send button
- reminder settings
- basic dashboard section
- visible send/delivery status

### Patient page `/e/[kod]`

Must include:

- provider
- visit date
- booking type
- large anonymous notice
- simple rating buttons
- free-text fields
- success/thank-you state

The design must visually align with SHARP and Kort varsel.

---

## Output expectations

When implementing, do not over-engineer.

Preferred delivery order:

1. migration
2. parser and classifier
3. admin upload page
4. send flow
5. patient response page
6. submit endpoint
7. dashboard

If you generate code, keep it production-oriented, readable, and narrow in scope.

Avoid adding AI/ML analysis in V1.
Avoid speculative complexity unless directly justified by the documented requirements.

---

## Anti-patterns to avoid

Do not:

- create a separate Next.js app
- build a complex analytics platform before the basic survey works
- send multiple reminders
- rely only on a single total score
- store unnecessary long-term patient data
- expose raw comments widely without role checks

---

## Definition of a good V1

A good V1 allows the clinic to:

- import daily visit exports
- send a respectful anonymous survey by SMS
- receive answers
- compare providers over time
- identify improvement areas like:
  - bemötande
  - information
  - lyssnad på
  - tydlig plan framåt

This is the success criterion.
