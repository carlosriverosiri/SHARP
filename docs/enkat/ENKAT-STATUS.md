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
- `supabase/migrations/027-enkat-robusthet.sql`

#### Backend
- `src/lib/enkat-booking-classifier.ts`
- `src/lib/enkat-csv-parser.ts`
- `src/lib/enkat-free-text-sanitizer.ts`
- `src/lib/enkat-follow-up-rules.ts`
- `src/lib/enkat-sms.ts`
- `src/lib/enkat-queue.ts`
- `src/lib/enkat-api-helpers.ts`
- `src/lib/enkat-stats.ts`
- `src/lib/enkat-preview-token.ts`
- `src/lib/enkat-provider-scope.ts`

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
- klientmoduler för `/personal/enkat` i:
  - `src/lib/enkat-page-helpers.ts`
  - `src/lib/enkat-page-preview.ts`
  - `src/lib/enkat-page-sections.ts`
  - `src/lib/enkat-page-actions.ts`
- schemalagd köfunktion:
  - `netlify/functions/enkat-send-queue.mts`

## Det som fungerar nu

- import av CSV (semikolon, tab eller komma -- auto-detect)
- stöd för filer i Latin-1/Windows-1252 (vanligt vid export från journalsystem)
- validering av kärnkolumner
- gemensam sparad lista för bokningstyper som aldrig ska följas upp
- automatisk bortsortering av bokningstyper som matchar den sparade listan
- kolumnen `Diagnoser` krävs i importfilen och tom cell auto-bortsorterar raden före preview
- checkbox-lista över bokningstyper i aktuell fil för positivt urval inför varje utskick
- preview med felrader och dubletthantering
- signerad preview-token mellan upload och send
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
5. `027-enkat-robusthet.sql`

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

0. Kör `npm test`
1. Starta dev-servern
2. Gå till `/personal/profil`
3. Välj rätt `vårdgivarnamn`
4. Gå till `/personal/enkat`
5. Börja gärna med `docs/enkat/ENKAT-SMOKE-TEST.csv` och följ `docs/enkat/ENKAT-SMOKE-TEST.md`
6. Kontrollera preview
7. Sätt `SITE` och `PUBLIC_SITE_URL` till aktuell publik domän innan du testar länken i SMS. Just nu kan `https://sodermalm.netlify.app` användas tills `https://specialist.se` är klar
8. Gör fullt kampanj-/SMS-test först när du kör i en säker miljö med avsiktligt valda testmottagare
9. Öppna en publik länk `/e/[kod]`
10. Skicka in ett testsvar
11. Kontrollera dashboard, kampanjhistorik och rapport

## Senast verifierat manuellt

- `docs/enkat/ENKAT-SMOKE-TEST.csv` fungerade i riktigt UI
- första testutskick nådde testmobil via 46elks
- kvar att verifiera i nästa pass är publik enkätlänk, testsvar och att hela flödet landar rätt i dashboard/rapport med korrekt `SITE`/`PUBLIC_SITE_URL`

## Nyligen genomförd kodgranskning

Följande förbättringar är gjorda efter en samlad kodgranskning:

- **Rollkontroller**: alla API-endpoints använder nu `harMinstPortalRoll()` istället för hård `=== 'admin'`-jämförelse, så att superadmin inte blockeras
- **Sessionsäkerhet**: portalen accepterar inte längre `sb-access-token` bara för att JWT-payloaden ser giltig ut lokalt; användare och roll verifieras server-side mot Supabase och sessionen refreshas via `sb-refresh-token` vid behov
- **Krypteringsnyckel**: Netlify-funktionen `enkat-send-queue.mts` har inte längre en hårdkodad fallback-nyckel; saknas `POOL_ENCRYPTION_KEY` returneras 500
- **Atomär svarsräknare**: `total_svar` uppdateras i samma SQL-transaktion som svaret sparas
- **Poängvalidering**: `submit.ts` validerar nu helhetsbetyg (1-5) och delbetyg (1-5) server-side
- **Fritextsanering i submit**: `submit.ts` maskar nu uppenbara mejladresser, svenska telefonnummer även med `+46`, mellanslag eller bindestreck, samt sannolika personnummer innan lagring
- **Verifierad preview**: `send.ts` accepterar nu signerad `previewToken` från upload i stället för råa klientrader
- **Idempotent kampanjskapande**: `enkat_kampanjer.preview_token_hash` används för att stoppa dubbelsubmit av samma preview
- **Atomar svarsinlämning**: `submit.ts` använder SQL-funktionen `submit_enkat_response` så att claim, svar och `total_svar` sker i samma transaktion
- **Tidigare dataskopning**: `dashboard.ts` och `report.ts` filtrerar nu på vårdgivare redan i databasanropen för självvy och adminfilter, i stället för att läsa in alla rader först
- **Mindre logglookup i dashboard**: leveransloggen mappar nu bara de `enkat_utskick` som faktiskt förekommer i aktuell loggperiod, inte hela tabellen
- **Smalare kampanjhistorik**: `campaigns.ts` använder nu tre riktade statistikfrågor för påminnelser, möjliga påminnelser och köade förstautskick i stället för att läsa in alla utskick/loggar för kampanjerna
- **Classifier-buggar**: duplicerad nybesök-kontroll fixad, `remiss` fångas före `nybesök`, `ab` matchar bara som helt ord, `ssk` prioriteras nu före generiskt `återbesök`, och `fysiskt` klassas inte längre som "Digitalt besök"
- **Staging-URL borttagen**: SMS-funktionen saknar inte längre hårdkodad fallback; loggar varning om URL saknas
- **Felhantering i kö**: `enkat-queue.ts` loggar nu fel vid batch-lookups istället för att svälja dem
- **Koddeduplicering**: delad `jsonResponse()` i `enkat-api-helpers.ts`, delad statistiklogik i `enkat-stats.ts`
- **Klientstädning**: `enkat.astro` kör nu bundlad script-modul och delar upp klientlogiken i `enkat-page-helpers.ts`, `enkat-page-preview.ts`, `enkat-page-sections.ts` och `enkat-page-actions.ts` i stället för att ha nästan allt inline
- **Utökade automatiska tester**: `npm test` kör nu Vitest för preview-token, submit-sanering, `upload`-, `send`-, `settings`-, `remind`-, `campaigns`-, `report`- och `dashboard`-flödet, statistik, bokningstypklassning, CSV-parsning, centrala page-helpers samt DOM-baserade klienttester för `enkat-page-preview.ts` och `enkat-page-sections.ts`
- **Auth-regressionstester**: `src/lib/auth.test.ts` fångar nu förfalskade access tokens, verifierad användarhämtning och refresh av utgången Supabase-session
- **Typning**: `any` ersatt med `SupabaseClient` i `enkat-queue.ts`

## Kvarvarande prioriterade steg

### Högst prioritet
- verifiera publik enkätlänk och testsvar end-to-end med korrekt `SITE`/`PUBLIC_SITE_URL`
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
- `npm test` finns nu och bör köras före större manuella testpass; sviten täcker även klientmodulerna med `jsdom`
- `docs/enkat/ENKAT-SMOKE-TEST.md` och `docs/enkat/ENKAT-SMOKE-TEST.csv` finns för ett snabbt, säkert preview-pass utan att direkt trigga riktiga SMS
- `SITE` och `PUBLIC_SITE_URL` ska peka på aktuell publik domän. Under test kan `https://sodermalm.netlify.app` användas tills `https://specialist.se` är klar
- profilkoppling måste vara satt
- `/personal/enkat` är huvudsidan
- nästa fokus är testning och polish, inte grundarkitektur
- nästa fokus efter det är mer verklig testning, eventuellt ett separat export-/visualiseringspass och bara därefter ytterligare polish av återstående wiring i `enkat.astro`
- previewn kräver nu `Diagnoser`, sorterar bort tomma diagnoser automatiskt och visar bokningstyperna i filen som kryssrutor
- den gemensamma listan över bokningstyper som aldrig ska följas upp sparas i Supabase och kan uppdateras av admin från `/personal/enkat`
- `submit` sanerar nu fritext server-side innan lagring och har regressionstester för både statusmappning och maskning av mejl, telefon och personnummer
