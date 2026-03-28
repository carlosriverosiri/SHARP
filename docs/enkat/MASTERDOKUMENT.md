# Enkät: Masterdokument för extern AI

> Använd detta som bakgrundsunderlag när du frågar externa AI-modeller om `Enkät`-modulen i SHARP.
> Målet är att ge tillräcklig kontext för bra svar utan att behöva bifoga alla dokument varje gång.

---

## 1) Kontext i en mening

`Enkät` är en intern kvalitetsmodul i SHARP där personal importerar CSV, skickar SMS-enkäter via 46elks, samlar anonyma svar och följer resultat per vårdgivare i dashboard/rapport.

### Drifterfarenhet (uppdatering)

Modulen används i skarp drift med gott utfall: **44 svar på 82 utskickna SMS** (ca **54 %** svarsfrekvens) — högre än förväntat. SMS-mallen och länken **ryms i ett enda SMS-segment**, vilket håller **kostnaden till en SMS-avgift per utskick** (plus eventuell påminnelse enligt inställning). **Fritextkommentarerna** har gett stort värde i vardagen och har **redan lett till justerad patientinformation före mottagningsbesök** (stängd kvalitetsloop utan att vänta på större rapporter).

---

## 2) Arkitektur (kort)

- **Frontend/admin:** Astro-sida `src/pages/personal/enkat.astro`
- **Publik enkät:** `src/pages/e/[kod].astro`
- **API:** `src/pages/api/enkat/*`
- **Backendlogik:** `src/lib/enkat-*`
- **Databas:** Supabase (enkätmigreringar)
- **SMS:** 46elks
- **Kö/fördröjt utskick (första SMS):** `netlify/functions/enkat-send-queue.mts`
- **Schemalagd påminnelse:** `netlify/functions/enkat-remind-scheduled.mts` (nästa dag 16:00 Europe/Stockholm)

### Modulkarta (faktisk kod — verifiera mot `src/`)

Använd denna när du promptar extern AI om **befintlig** implementation (så svaren inte hallunicerar filer eller glömmer delar av flödet):

| Område | Huvudsakliga filer |
|--------|---------------------|
| Admin-UI | `src/pages/personal/enkat.astro`, `src/lib/enkat-page-helpers.ts`, `enkat-page-preview.ts`, `enkat-page-sections.ts`, `enkat-page-actions.ts` |
| Publik enkät | `src/pages/e/[kod].astro` |
| API (Astro routes) | `src/pages/api/enkat/upload.ts`, `settings.ts`, `send.ts`, `remind.ts`, `submit.ts`, `dashboard.ts`, `report.ts`, `campaigns.ts` |
| Domänlogik | `enkat-csv-parser.ts`, `enkat-booking-classifier.ts`, `enkat-follow-up-rules.ts`, `enkat-preview-token.ts`, `enkat-sms.ts`, `enkat-queue.ts`, `enkat-remind-runner.ts`, `enkat-reminder-time.ts`, `enkat-stats.ts`, `enkat-free-text-sanitizer.ts`, `enkat-booking-type-filters.ts`, `enkat-provider-scope.ts`, `enkat-api-helpers.ts` |
| Tester | `src/pages/api/enkat/_tests/*`, `src/lib/enkat-*.test.ts`, `enkat-page-*.test.ts` |
| Bakgrundsbatch | `netlify/functions/enkat-send-queue.mts`, `enkat-remind-scheduled.mts` |
| Databas | `supabase/migrations/023-enkat.sql` och senare `024`–`030` med enkätprefix (se `ENKAT-STATUS.md`) |

**SHARP-specifika kopplingar** (måste ersättas eller brytas ut vid egen app): portalinloggning (`src/lib/auth` m.m.), `supabaseAdmin`, rad-/rollstyrning via `enkat-provider-scope.ts` och vårdgivarnamn i profil, temporär kryptering av telefon (`POOL_ENCRYPTION_KEY` i kö/sändning), samt `SITE` / `PUBLIC_SITE_URL` för länkar i SMS.

---

## 3) Aktuella endpoints

- `POST /api/enkat/upload` - parse + validera CSV och returnera preview
- `GET/POST /api/enkat/settings` - läs/spara gemensam lista över bokningstyper som aldrig ska följas upp
- `POST /api/enkat/send` - skapa kampanj + utskick
- `POST /api/enkat/remind` - påminnelse till obesvarade (samma tidsregler som cron; **används inte från personal-UI**, ev. drift/verktyg)
- `POST /api/enkat/submit` - publik submit via kod
- `GET /api/enkat/dashboard` - nyckeltal/analys
- `GET /api/enkat/report` - periodrapport
- `GET /api/enkat/campaigns` - kampanjhistorik

---

## 4) Datamodell (huvudtabeller)

- `enkat_kampanjer`
- `enkat_utskick`
- `enkat_svar`
- `enkat_delivery_log`
- `enkat_installningar`

Nyckelidéer:

- en kampanj innehåller många utskick
- ett utskick kan ge max ett svar
- leveranslogg sparar faktisk skickstatus/fel
- analys ska vara vårdgivarspecifik, patientanonym i rapportering

---

## 5) Affärsregler

- Importen ska tåla vanliga vårdexporter (separator + teckenkodning).
- Bokningstyper som finns i den gemensamma listan "följs aldrig upp" ska sorteras bort innan preview/deduplicering.
- Rader utan värde i `Diagnoser` ska sorteras bort innan preview.
- Den gemensamma listan lagras i Supabase och kan uppdateras av administratör (via `/personal/enkat`; i UI visas ingen ständig informationsruta om lagring — se `ENKAT-UI-SPEC.md`).
- Bokningstyper som finns kvar i den aktuella filen ska visas som kryssrutor så att användaren aktivt väljer vad som ska ingå i utskicket.
- Deduplicering prioriterar nybesök/remiss över återbesök bland de rader som återstår efter filtrering.
- Max en påminnelse per utskick; tidpunkt styrs i servern (nästa kalenderdag 16:00 Europe/Stockholm efter första SMS).
- `submit` är publik men strikt validerad (kod, giltighet, redan använd).
- Dashboard ska skydda integritet vid lågt underlag.
- Profilkoppling till vårdgivarnamn styr vad en vanlig användare får se.

---

## 6) Vad som redan fungerar (V1-läge)

I praktiken bedöms flödet som **stabilt i drift** (import → utskick → svar → dashboard/rapport). Nedan teknisk checklista:

- CSV-import + preview med felrader/dubletter
- gemensam Supabase-lagrad lista för bokningstyper som automatiskt sorteras bort
- `Diagnoser` som hårt urvalskrav i importen
- checkbox-urval av bokningstyper i den aktuella filen
- klassificering av bokningstyper
- kampanjskapande + första utskick
- automatisk påminnelse (schemalagd); ingen påminnelseknapp i portalen
- publik enkätsida och submit
- dashboard + rapport + kampanjhistorik
- dashboard/rapport kan filtreras på rå bokningstyp via snabbval (`Kuralink`, `Knä`, `Axel`, `Armbåge`)
- fördröjningsanalys baserat på besökstid/starttid (medel tid till SMS och fördröjningsfönster; ingen förmiddag/eftermiddag-uppdelning i huvudvyn)
- publikt formulär: se `ENKAT-PATIENTFORMULAR-MALL.md` (layout, mobil, färger)

---

## 7) Kända förbättringsspår

Prioriteten har skiftat: **kärnflödet är verifierat i verklig användning**; listan nedan är främst **vidareutveckling**, inte blockers.

- rapportexport (CSV/PDF)
- bättre visualisering av fördröjningsmått
- polish i adminflödet vid behov
- ev. mer automatiserad profil/vårdgivarkoppling
- fortsatt bevakning vid **mycket stora batcher** (kö/46elks) — inget känt problem i nuvarande volym

---

## 8) Dokument att läsa vid fördjupning

Hela enkätdokumentationen ligger i `docs/enkat/`:

- `ENKAT-STATUS.md`
- `ENKAT-IMPLEMENTATIONSPLAN.md`
- `ENKAT-PATIENTUPPLEVELSE.md`
- `ENKAT-PATIENTFORMULAR-MALL.md` — referens för publikt frågeformulär (mobilgenomgång + mall för nya formulär)
- `ENKAT-API-SPEC.md`
- `ENKAT-UI-SPEC.md`
- `ENKAT-SQL-SPEC.md`
- `ENKAT-UTBRYTNING.md` — SHARP-beroenden, miljövariabler och checklista vid egen applikation

---

## 9) Promptmall till extern AI

**Versionsnot:** Om du klistrar in masterdokumentet i ett AI-verktyg, ange **datum** eller **git-commit** för SHARP så mottagaren kan jämföra mot aktuell kod. Exporterade “AI Council”-körningar kan innehålla en **inbäddad äldre kopia** av detta dokument — lita på filen i repot, inte på citerad text i gamla körloggar.

### A) Förändringar inom SHARP

Kopiera och fyll i:

```text
Jag arbetar i SHARP (Astro + Supabase + 46elks) med en intern enkätmodul.

Bakgrund:
- Adminflöde: importera CSV -> preview -> skapa kampanj -> skicka SMS; påminnelse 16:00 följande dag automatiskt om aktiverat
- Publik sida: /e/[kod] för anonymt svar
- API: upload/settings/send/remind/submit/dashboard/report/campaigns
- Databas: enkat_kampanjer, enkat_utskick, enkat_svar, enkat_delivery_log, enkat_installningar
- Verifiera modulkarta och filvägar mot docs/enkat/MASTERDOKUMENT.md (avsnitt Modulkarta)

Repo-referens: branch/commit […]

Mål:
[Beskriv exakt vad du vill förbättra]

Krav:
- Behåll nuvarande arkitektur (Astro/Supabase/46elks) såvida jag inte skriver annat
- Föreslå konkreta kodnära steg (filer/funktioner), inte bara teori
- Nämn risker, testplan och migrationspåverkan

Fråga:
[Din specifika fråga]
```

### B) Utbrytning till fristående applikation (greenfield eller migrering)

Använd när målet är **egen produkt** eller **annan stack** — då ska AI **inte** utgå från att allt är Astro routes, utan först återge nuvarande beteende och sedan föreslå motsvarighet.

```text
Utgå från befintlig funktion i SHARP (Patientupplevelse/enkät) dokumenterad i docs/enkat/.
Bifogat: MASTERDOKUMENT.md + ENKAT-SQL-SPEC.md + ENKAT-API-SPEC.md + ENKAT-UTBRYTNING.md (eller peka på repo/commit).

Uppgift:
1) Sammanfatta nuvarande beteende och datamodell utifrån dokumentation + typiska kodvägar (upload, previewToken, send, kö, remind, submit, dashboard).
2) Lista SHARP-specifika antaganden som måste ersättas (auth, RLS, Netlify-funktioner, krypteringsnyckel, miljövariabler).
3) Föreslå arkitektur för en fristående app — men märk tydligt vad som är **ny design** vs **1:1-port** av nuvarande flöde.
4) Peka ut juridik/hosting som **egen** bedömning (jurist/DPN); dokumentera inte lagpåståenden som fakta.

Mål för nya systemet:
[…]
```

---

## 10) Hur dokumentet används bäst

- Skicka detta masterdokument först till extern AI.
- Lägg sedan till relevant underdokument från `docs/enkat/` beroende på frågan:
  - API-fråga -> `ENKAT-API-SPEC.md`
  - UI-fråga -> `ENKAT-UI-SPEC.md` + vid behov `ENKAT-PATIENTFORMULAR-MALL.md`
  - databasfråga -> `ENKAT-SQL-SPEC.md`
  - plan/prioritering -> `ENKAT-STATUS.md` + `ENKAT-IMPLEMENTATIONSPLAN.md`
  - utbrytning / egen produkt -> `ENKAT-UTBRYTNING.md` + `ENKAT-SQL-SPEC.md` + promptmall B) i detta dokument
- **Råd från “AI Council” eller andra modeller** om t.ex. Next.js, Inngest, molnleverantör är ofta **greenfield**-rekommendationer. Jämför alltid mot tabellen *Modulkarta* och faktiska API-rutter ovan innan du ändrar SHARP.

Det ger snabbare och mer träffsäkra svar än att skicka allt varje gång.

---

## 11) Om AI-svar om “bästa stack” (t.ex. körning #27)

Vid frågor som *“bygg om som fristående system med maximal stabilitet”* brukar modeller föreslå **generiska** arkitekturer (NestJS/Fastify, Prisma, BullMQ, Docker, EU-VPS m.m.). Det är användbart som **idébank**, men:

- Det speglar **inte** den nuvarande SHARP-koden (Astro SSR/API routes, Supabase-klient, Netlify Scheduler).
- **Juridiska** slutsatser om hosting (Cloud Act, Schrems II, “måste vara EU”) måste verifieras för **ert** avtal och **er** data — dokumenteras inte här som krav.
- För utbrytning: be AI att först **kartlägga nuvarande gränssnitt** (API + tabeller + bakgrundsjobb), sedan föreslå ny stack — annars riskerar ni att tappa dolda beroenden (preview-signering, idempotent kampanjskapande, `submit_enkat_response`, m.m.).

Se promptmall B) ovan.
