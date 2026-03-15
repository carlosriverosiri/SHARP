# Enkätmodul: Status och handoff

> Kort handoff-dokument för att snabbt kunna fortsätta arbetet från en annan dator eller i en ny chat.

## Nuvarande läge

Enkätmodulen är inte bara dokumenterad utan till stora delar också implementerad.

### Byggt i kod

#### Migreringar
- `supabase/migrations/023-enkat.sql`
- `supabase/migrations/024-profile-vardgivare.sql`
- `supabase/migrations/025-enkat-installningar.sql`
- `supabase/migrations/026-enkat-increment-svar.sql`

#### Backend
- `src/lib/enkat-booking-classifier.ts`
- `src/lib/enkat-csv-parser.ts`
- `src/lib/enkat-follow-up-rules.ts`
- `src/lib/enkat-sms.ts`
- `src/lib/enkat-queue.ts`
- `src/lib/enkat-api-helpers.ts`
- `src/lib/enkat-stats.ts`

#### API-routes
- `src/pages/api/enkat/upload.ts`
- `src/pages/api/enkat/settings.ts`
- `src/pages/api/enkat/send.ts`
- `src/pages/api/enkat/remind.ts`
- `src/pages/api/enkat/submit.ts`
- `src/pages/api/enkat/dashboard.ts`
- `src/pages/api/enkat/report.ts`
- `src/pages/api/enkat/campaigns.ts`

#### Sidor
- `src/pages/personal/enkat.astro`
- `src/pages/e/[kod].astro`

#### Övrigt
- länk till modulen från `src/pages/personal/oversikt.astro`
- profilkoppling till vårdgivarnamn i `src/pages/personal/profil.astro`
- schemalagd köfunktion:
  - `netlify/functions/enkat-send-queue.mts`

## Det som fungerar nu

- import av CSV (semikolon, tab eller komma -- auto-detect)
- stöd för filer i Latin-1/Windows-1252 (vanligt vid export från journalsystem)
- validering av kärnkolumner
- standardmall för bokningstyper som aldrig ska följas upp
- automatisk bortsortering av bokningstyper som matchar standardmallen
- snabbval med flera förinställningar för olika mottagningsflöden
- preview med felrader och dubletthantering
- klassificering av bokningstyper
- kampanjskapande
- första SMS
- manuell påminnelse
- publik enkätlänk
- submit av svar
- vårdgivarstyrd dashboard
- adminvy sida vid sida
- kampanjhistorik
- periodrapport
- fördröjningsanalys baserat på `Starttid` / tid till första SMS
- patientvänliga bokningstyper i SMS och på enkätsidan
- "Dr." prefix på vårdgivarnamn i patientkommunikation

## Viktiga beroenden

För att systemet ska fungera fullt ut måste följande vara körda i Supabase:

1. `023-enkat.sql`
2. `024-profile-vardgivare.sql`
3. `025-enkat-installningar.sql`
4. `026-enkat-increment-svar.sql`

Dessutom måste användaren välja sitt vårdgivarnamn i:

- `/personal/profil`

Annars kan inte dashboard/report avgöra vilka egna resultat som ska visas för en vanlig vårdgivare.

## Dokumentation att läsa först på nästa dator

1. `docs/enkat/ENKAT-STATUS.md`
2. `docs/enkat/ENKAT-IMPLEMENTATIONSPLAN.md`
3. `docs/enkat/ENKAT-PATIENTUPPLEVELSE.md`
4. `docs/enkat/ENKAT-API-SPEC.md`
5. `docs/enkat/ENKAT-UI-SPEC.md`

## Praktiskt testflöde

1. Starta dev-servern
2. Gå till `/personal/profil`
3. Välj rätt `vårdgivarnamn`
4. Gå till `/personal/enkat`
5. Ladda upp en riktig CSV
6. Kontrollera preview
7. Skapa kampanj
8. Verifiera att SMS går iväg
9. Öppna en publik länk `/e/[kod]`
10. Skicka in ett testsvar
11. Kontrollera dashboard, kampanjhistorik och rapport

## Nyligen genomförd kodgranskning

Följande förbättringar är gjorda efter en samlad kodgranskning:

- **Rollkontroller**: alla API-endpoints använder nu `harMinstPortalRoll()` istället för hård `=== 'admin'`-jämförelse, så att superadmin inte blockeras
- **Krypteringsnyckel**: Netlify-funktionen `enkat-send-queue.mts` har inte längre en hårdkodad fallback-nyckel; saknas `POOL_ENCRYPTION_KEY` returneras 500
- **Atomär svarsräknare**: `total_svar` uppdateras via SQL-funktion `increment_enkat_total_svar` istället för read-then-write
- **Poängvalidering**: `submit.ts` validerar nu helhetsbetyg (1-10) och delbetyg (1-5) server-side
- **Dubbel-submit-skydd**: atomär claim via `UPDATE ... WHERE used = false` innan svaret sparas
- **Classifier-buggar**: duplicerad nybesök-kontroll fixad, `remiss` fångas före `nybesök`, `ab` matchar bara som helt ord, `fysiskt` klassas inte längre som "Digitalt besök"
- **Staging-URL borttagen**: SMS-funktionen saknar inte längre hårdkodad fallback; loggar varning om URL saknas
- **Felhantering i kö**: `enkat-queue.ts` loggar nu fel vid batch-lookups istället för att svälja dem
- **Koddeduplicering**: delad `jsonResponse()` i `enkat-api-helpers.ts`, delad statistiklogik i `enkat-stats.ts`
- **Typning**: `any` ersatt med `SupabaseClient` i `enkat-queue.ts`

## Kvarvarande prioriterade steg

### Högst prioritet
- skarpt test med riktig CSV och riktiga 46elks-utskick
- kontrollera att profilkopplingen fungerar korrekt för vanliga användare
- verifiera att kömodellen beter sig bra vid större batcher

### Nästa rimliga förbättringar
- export av rapport (CSV/PDF)
- bättre visualisering av delay-buckets
- mer polish i adminytan
- eventuell automatisk koppling mellan användare och vårdgivare istället för manuellt profilval

## Viktig teknisk notering

Projektet använder nu `023-enkat.sql` och inte `009-enkat.sql`, eftersom nummerserien i repo:t redan innehöll en `009-ai-council.sql`.

## Kort sammanfattning

Om du öppnar projektet på en ny dator ska du tänka:

- migreringar måste vara körda
- profilkoppling måste vara satt
- `/personal/enkat` är huvudsidan
- nästa fokus är testning och polish, inte grundarkitektur
- previewn använder nu en regelmall för att sortera bort telefon/admin/ssk-liknande bokningstyper innan urvalet visas
- den gemensamma standardmallen för auto-exkludering sparas nu i Supabase och kan uppdateras av admin från `/personal/enkat`
