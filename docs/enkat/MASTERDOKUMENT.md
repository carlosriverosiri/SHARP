# Enkät: Masterdokument för extern AI

> **En fil räcker för kontext:** Bifoga **endast detta dokument** när du diskuterar patientupplevelse-/enkätmodulen med externa AI-modeller (befintlig SHARP-modul eller utbrytning till egen app). Här finns arkitektur, endpoints, datamodell, affärsregler, modulkarta, utbrytningschecklista och promptmallar.
>
> För **kolumn-nivå SQL** eller pixel-exakt UI i SHARP kan du öppna repo-filerna som listas under *Valfri fördjupning* — de behövs normalt **inte** i chatten om du inte felsöker implementation.

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
- **Schemalagd påminnelse:** `netlify/functions/enkat-remind-scheduled.mts` (nästa dag 16:00 Europe/Stockholm; funktionen kan köras t.ex. var 10:e minut)

### Modulkarta (faktisk kod — verifiera mot `src/`)

| Område | Huvudsakliga filer |
|--------|---------------------|
| Admin-UI | `src/pages/personal/enkat.astro`, `src/lib/enkat-page-helpers.ts`, `enkat-page-preview.ts`, `enkat-page-sections.ts`, `enkat-page-actions.ts` |
| Publik enkät | `src/pages/e/[kod].astro` |
| API (Astro routes) | `src/pages/api/enkat/upload.ts`, `settings.ts`, `send.ts`, `remind.ts`, `submit.ts`, `dashboard.ts`, `report.ts`, `campaigns.ts` |
| Domänlogik | `enkat-csv-parser.ts`, `enkat-booking-classifier.ts`, `enkat-follow-up-rules.ts`, `enkat-preview-token.ts`, `enkat-sms.ts`, `enkat-queue.ts`, `enkat-remind-runner.ts`, `enkat-reminder-time.ts`, `enkat-stats.ts`, `enkat-free-text-sanitizer.ts`, `enkat-booking-type-filters.ts`, `enkat-provider-scope.ts`, `enkat-api-helpers.ts` |
| Tester | `src/pages/api/enkat/_tests/*`, `src/lib/enkat-*.test.ts`, `enkat-page-*.test.ts` |
| Bakgrundsbatch | `netlify/functions/enkat-send-queue.mts`, `enkat-remind-scheduled.mts` |
| Databas | `supabase/migrations/023-enkat.sql` och följande enkätrelaterade migreringar upp till bl.a. `030-*` (prefix `enkat` / tabellerna nedan) |

**SHARP-specifika kopplingar** (måste ersättas eller brytas ut vid egen app): portalinloggning (`src/lib/auth` m.m.), `supabaseAdmin`, rad-/rollstyrning via `enkat-provider-scope.ts` och vårdgivarnamn i profil, temporär kryptering av telefon (`POOL_ENCRYPTION_KEY` i kö/sändning), samt `SITE` / `PUBLIC_SITE_URL` för länkar i SMS.

---

## 3) Aktuella endpoints

| Metod | Väg | Syfte |
|-------|-----|--------|
| `POST` | `/api/enkat/upload` | Parse + validera CSV, preview, signerad `previewToken` |
| `GET` | `/api/enkat/settings` | Läs gemensam exkluderingslista (bokningstyper) |
| `POST` | `/api/enkat/settings` | Spara exkluderingslista |
| `POST` | `/api/enkat/send` | Skapa kampanj + utskick (kräver giltig preview-token) |
| `POST` | `/api/enkat/submit` | Publik mottagning av svar (kod i URL) |
| `GET` | `/api/enkat/dashboard` | Nyckeltal / analys |
| `GET` | `/api/enkat/report` | Periodrapport |
| `GET` | `/api/enkat/campaigns` | Kampanjhistorik |
| `POST` | `/api/enkat/remind` | Påminnelse manuellt/drift (samma tidsregler som schemalagt jobb; **ej** knapp i personal-UI) |

**Bakgrund (inte HTTP):** `enkat-send-queue.mts` bearbetar köade första-SMS; `enkat-remind-scheduled.mts` skickar berättigade påminnelser.

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
- unik `preview_token_hash` på kampanj stoppar dubbelskapande från samma preview
- atomärt svar: Postgres-funktion `submit_enkat_response` (transaktion, race-säker)

---

## 5) Affärsregler

- Importen ska tåla vanliga vårdexporter (separator + teckenkodning).
- Bokningstyper som finns i den gemensamma listan "följs aldrig upp" ska sorteras bort innan preview/deduplicering.
- Rader utan värde i `Diagnoser` ska sorteras bort innan preview.
- Den gemensamma listan lagras i Supabase (`enkat_installningar`) och uppdateras av administratör via `/personal/enkat`.
- Bokningstyper som finns kvar i den aktuella filen visas som kryssrutor — användaren väljer aktivt vad som ska ingå i utskicket.
- Deduplicering prioriterar nybesök/remiss över återbesök bland de rader som återstår efter filtrering.
- Max en påminnelse per utskick; tidpunkt: **nästa kalenderdag 16:00 Europe/Stockholm** efter första SMS.
- `submit` är publik men strikt validerad (kod, giltighet, redan använd).
- Dashboard skyddar integritet vid lågt underlag (tröskel `ANONYMITY_THRESHOLD` i kod).
- Profilkoppling till vårdgivarnamn styr vad en vanlig användare får se jämfört med admin.
- Publik enkät: strukturerade betyg (1–5) + valfria fritextfält; mobilanpassad (detaljerad layout beskrivs i repo under `ENKAT-PATIENTFORMULAR-MALL.md` om du behöver pixel-nivå).

---

## 6) Vad som redan fungerar (V1-läge)

- CSV-import + preview med felrader/dubletter
- gemensam lista för bokningstyper som automatiskt sorteras bort
- `Diagnoser` som hårt urvalskrav; `Starttid` krävs för utskick
- checkbox-urval av bokningstyper i aktuell fil
- klassificering av bokningstyper
- kampanjskapande + första utskick (upp till ca 50 SMS direkt, resten kö)
- automatisk påminnelse (schemalagd); ingen påminnelseknapp i portalen
- publik enkätsida `/e/[kod]` och submit
- dashboard + rapport + kampanjhistorik
- filter på rå bokningstyp (`Kuralink`, `Knä`, `Axel`, `Armbåge`)
- fördröjningsanalys: medel tid till SMS + tidsfönster (ingen förmiddag/eftermiddag-panel i huvudvyn)

---

## 7) Kända förbättringsspår

- rapportexport (CSV/PDF)
- bättre visualisering av fördröjningsmått
- polish i adminflödet vid behov
- ev. mer automatiserad profil/vårdgivarkoppling
- bevakning vid **mycket stora batcher** (kö/46elks)

---

## 8) Fristående applikation — utbrytning från SHARP

*Använd detta avsnitt när du frågar extern AI hur man bygger **motsvarande system** utanför SHARP. Allt nedan ingår i **denna enda fil** — du behöver inte bifoga `ENKAT-UTBRYTNING.md` eller API/SQL-spec om du inte vill gräva på kolumnnivå.*

### 8.1 Nuvarande leverans per lager

| Lager | Implementation i SHARP |
|--------|-------------------------|
| Admin-UI | Astro SSR `enkat.astro` + `enkat-page-*.ts` |
| Publik svar | `e/[kod].astro` |
| HTTP-API | Astro routes `api/enkat/*` |
| Affärslogik | `enkat-*.ts` |
| DB | PostgreSQL via Supabase; migreringar från `023-enkat.sql` + uppföljare |
| Första SMS-kö | Netlify `enkat-send-queue.mts` |
| Påminnelse | Netlify `enkat-remind-scheduled.mts` + `enkat-remind-runner.ts` |
| SMS | 46elks |

### 8.2 SHARP-specifikt som måste ersättas

| Område | I SHARP | Vid egen app |
|--------|---------|--------------|
| Inloggning | Portal auth, cookies, roller | Eget auth / IdP; behåll **admin vs vårdgivare** om samma UX |
| API-skydd | Inloggning på admin-rutter; `submit` publik men kodstyrd | Motsvarande + ev. rate limiting |
| Vårdgivarfilter | `enkat-provider-scope.ts` + profilfält vårdgivarnamn | Organisation/användarattribut |
| Databasåtkomst | `supabaseAdmin` (service role) | Egen Postgres + ORM eller ny Supabase med **nya** RLS-policies |
| Telefon | Krypterad lagring / `POOL_ENCRYPTION_KEY` | Ny hemlighet, rotationsrutin eller KMS |
| Publik URL i SMS | `SITE`, `PUBLIC_SITE_URL` | Korrekt bas-URL per miljö |
| Schemaläggning | Netlify Scheduled Functions | Cron, worker eller kö i er drift |
| Idempotent kampanj | Unik `preview_token_hash` | Behåll samma idé |
| Svar | SQL `submit_enkat_response` | Porta eller ersätt med transaktion med **samma** semantik (ett svar per utskick, race-säkert) |

### 8.3 Beteenden som ska bevaras (oavsett stack)

- Ett utskick → **högst ett** accepterat svar.
- **Högst en** påminnelse per utskick; klocka 16:00 **nästa kalenderdag** Europe/Stockholm efter första SMS.
- **Signerad preview** mellan upload och send (i SHARP: `PERSONAL_SESSION_SECRET`, fallback `SUPABASE_SERVICE_ROLE_KEY` i `enkat-preview-token.ts` — i ny app: **dedikerad** hemlighet).
- Dashboard: dölj känslig detalj vid för få svar (motsvarande `ANONYMITY_THRESHOLD`).
- Fritext: server-side sanering mot identifierare (motsvarande `enkat-free-text-sanitizer.ts`).

### 8.4 Miljövariabler (checklista)

| Variabel | Syfte |
|----------|--------|
| `ELKS_API_USER`, `ELKS_API_PASSWORD` | 46elks |
| `SITE` / `PUBLIC_SITE_URL` | Länkar i SMS |
| `PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Nuvarande SHARP-backend (ersätts om ni byter DB-lager) |
| `POOL_ENCRYPTION_KEY` | Dekryptering av telefon i kö/sändning (saknas → kö kan returnera 500) |
| Preview-signering | Se 8.3 (`PERSONAL_SESSION_SECRET` i SHARP) |

### 8.5 Rekommenderad ordning i ett utbrytningsprojekt (för promptning)

1. Återskapa **datamodell + constraints** (utgå från tabellerna i §4 och migreringar i repo).
2. Specificera **HTTP-kontrakt** enligt §3 (eller medvetet förenkla).
3. Beskriv **bakgrundsjobb** motsvarande send-queue och remind-scheduler (batch-storlek, felhantering).
4. Välj **ny stack** först när beteendet ovan är frys — märk i svaret vad som är *paritet* vs *förbättring*.
5. **Juridik/hosting/personuppgiftsbiträde:** egen bedömning med jurist/DPN — inte som hårda fakta i AI-svar.

### 8.6 Vanliga fel hos extern AI

- Anta Next.js när referensen är **Astro API routes**.
- Glömma **Netlify-funktionerna** i produktionsflödet.
- Ersätta `submit_enkat_response` utan **transaktion/idempotens**.
- Hårdkoda 46elks utan **abstraktion** (i ny kod: överväg `SmsProvider`-interface).

**Juridik om “bästa moln”:** AI som föreslår EU-only, Cloud Act m.m. ger **idéer** — verifiera alltid mot ert avtal och er datakälla; detta dokument förutsätter inget specifikt hostingkrav.

---

## 9) Valfri fördjupning i repot (behövs sällan i chatten)

Övriga filer under `docs/enkat/` finns för **underhåll av SHARP** eller om du behöver exakt SQL/UI-text:

- **Kort varsel-SMS** (lediga operationstider, `/personal/kort-varsel`, `/s/[kod]`) är en **annan** modul — masteröversikt: `docs/kort-varsel/MASTER.md` (gemensamt med enkät: 46elks, `SITE`/`PUBLIC_SITE_URL`, ofta `POOL_ENCRYPTION_KEY`).
- `ENKAT-SQL-SPEC.md`, `ENKAT-API-SPEC.md`, `ENKAT-UI-SPEC.md`
- `ENKAT-STATUS.md`, `ENKAT-IMPLEMENTATIONSPLAN.md`, `ENKAT-PATIENTUPPLEVELSE.md`
- `ENKAT-PATIENTFORMULAR-MALL.md` — publikt formulär pixel för pixel
- `ENKAT-UTBRYTNING.md` — kort pekare; innehållet är sammanslaget i **§8** ovan

---

## 10) Promptmall till extern AI

**Versionsnot:** Ange **datum** eller **git-commit** för SHARP när du klistrar in detta dokument. Gamla “AI Council”-exporter kan innehålla **föråldrade** kopior — lita på filen i repot.

### A) Förändringar inom SHARP

```text
Bifogat: MASTERDOKUMENT.md (hela filen). Repo: [branch/commit].

Jag arbetar i SHARP (Astro + Supabase + 46elks) med enkätmodulen enligt dokumentet.

Mål:
[…]

Krav:
- Följ arkitektur i dokumentet såvida jag inte skriver annat
- Konkreta fil-/funktionssteg, risker, tester, migrationspåverkan

Fråga:
[…]
```

### B) Utbrytning / ny applikation med samma funktion

```text
Bifogat: endast MASTERDOKUMENT.md (hela filen). Repo valfritt: [branch/commit].

Uppgift:
1) Sammanfatta nuvarande beteende utifrån dokumentet (§2–§6 och §8).
2) Föreslå arkitektur för en fristående app; märk **paritet** vs **ny design**.
3) Lista vad som måste ersättas enligt §8.2–§8.4.
4) Juridik/hosting: endast som “egen kontroll”, inte som fakta.

Mål för nya systemet:
[…]
```

---

## 11) Hur dokumentet används bäst

- **Standard:** bifoga **bara** denna fil till extern AI.
- Lägg till **repo-URL eller zip** endast om modellen ska läsa faktisk kod/SQL.
- **Greenfield-stackförslag** (NestJS, BullMQ, Docker, …) från modeller är ofta **generiska** — jämför mot §2–§3 och §8 innan du ändrar SHARP eller låser arkitektur.

---

## 12) Kort om “bästa stack”-svar från AI

Modeller som svarar på *“bygg om som fristående med maximal stabilitet”* ger ofta **generiska** ramverk. Det speglar **inte** automatiskt Astro + Netlify Functions + nuvarande Supabase-upplägg. Använd **§8** som sanningskälla för vad som måste finnas; stack är sekundär tills beteendet är definierat.
