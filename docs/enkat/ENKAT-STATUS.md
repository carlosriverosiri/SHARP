# Enkätmodul: Status och handoff

> Kort handoff-dokument för att snabbt kunna fortsätta arbetet från en annan dator eller i en ny chat.

## Nuvarande läge

Enkätmodulen är inte bara dokumenterad utan till stora delar också implementerad.

### Byggt i kod

#### Migreringar
- `supabase/migrations/023-enkat.sql`
- `supabase/migrations/024-profile-vardgivare.sql`

#### Backend
- `src/lib/enkat-booking-classifier.ts`
- `src/lib/enkat-csv-parser.ts`
- `src/lib/enkat-sms.ts`
- `src/lib/enkat-queue.ts`

#### API-routes
- `src/pages/api/enkat/upload.ts`
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
