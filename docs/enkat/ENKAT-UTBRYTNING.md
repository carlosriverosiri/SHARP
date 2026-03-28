# Patientupplevelse / enkät: vägledning vid utbrytning till egen applikation

> Detta dokument beskriver **vad som idag är kopplat till SHARP** och vad som måste **ersättas eller flyttas** om modulen blir en fristående produkt. Det är **inte** en juridisk vägledning om hosting eller personuppgiftsbiträden.

**Börja här för extern AI:** `MASTERDOKUMENT.md` (modulkarta + endpoints) + `ENKAT-SQL-SPEC.md` + `ENKAT-API-SPEC.md` + denna fil.

---

## 1. Nuvarande leverans i SHARP (kort)

| Lager | Implementation |
|--------|----------------|
| Admin-UI | Astro SSR `src/pages/personal/enkat.astro` + klientlogik i `enkat-page-*.ts` |
| Publik svarssida | `src/pages/e/[kod].astro` |
| HTTP-API | Astro routes under `src/pages/api/enkat/*` |
| Affärslogik | `src/lib/enkat-*.ts` (CSV, token, SMS, kö, statistik, m.m.) |
| Databas | Supabase PostgreSQL, migreringar `023`–`030` (enkätrelaterade) |
| Första SMS (kö) | `netlify/functions/enkat-send-queue.mts` |
| Påminnelse | `netlify/functions/enkat-remind-scheduled.mts` (t.ex. var 10:e minut) + delad logik `enkat-remind-runner.ts` |
| SMS-leverantör | 46elks (`ELKS_API_USER` / `ELKS_API_PASSWORD`) |

---

## 2. SHARP-specifika beroenden (måste adresseras vid utbrytning)

| Område | Var i kod / drift | Vid egen app |
|--------|-------------------|--------------|
| Inloggning | `src/lib/auth`, cookies, portalroller | Eget auth-system eller återanvänd gemensam IdP; behåll principen **admin vs vårdgivare** om samma UX önskas |
| API-skydd | Admin-rutter kräver inloggning; `submit` är publik men kodvaliderad | Motsvarande middleware + rate limiting där det saknas idag |
| Vårdgivarfilter | `enkat-provider-scope.ts` + vårdgivarnamn från **profil** (`/personal/profil`) | Ersätt med användar-attribut eller organisationsmodell |
| Supabase-klient | `supabaseAdmin` (service role) i API-rutter | Antingen egen Postgres + ORM, eller ny Supabase-projekt med **egen** RLS-policy |
| Telefon i vila | Krypterad kolumn / `POOL_ENCRYPTION_KEY` i kö och sändvägar | Ny hemlighet + dokumenterad nyckelrotation; alternativ KMS |
| Publik bas-URL | `SITE` / `PUBLIC_SITE_URL` för länkar i SMS | Måste sättas korrekt per miljö |
| Schemaläggning | Netlify Scheduled Functions | Cron, worker, eller managed queue i vald drift |
| Idempotens kampanj | `preview_token_hash` unik på `enkat_kampanjer` | Behåll motsvarande skydd mot dubbelskapande |
| Atomärt svar | SQL `submit_enkat_response` | Porta funktionen eller ersätt med transaktion med samma semantik |

---

## 3. Datagränser som ska bevaras (beteende, inte bara tabellnamn)

- **Ett utskick → max ett svar** (idempotent submit).
- **Max en påminnelse** per utskick; tid **nästa kalenderdag 16:00 Europe/Stockholm** efter första SMS (se `enkat-reminder-time.ts`).
- **Signerad preview** mellan upload och send (signeringsnyckel hämtas i kod från `PERSONAL_SESSION_SECRET`, med fallback till `SUPABASE_SERVICE_ROLE_KEY` — se `enkat-preview-token.ts`; vid utbrytning bör detta bli en **dedikerad** hemlighet).
- **Integritet i dashboard:** tröskel `ANONYMITY_THRESHOLD` (dölja detaljer vid lågt underlag).
- **Fritext:** server-side sanering (`enkat-free-text-sanitizer.ts`).

---

## 4. Miljövariabler (checklista för port eller ny drift)

| Variabel | Syfte |
|----------|--------|
| `ELKS_API_USER`, `ELKS_API_PASSWORD` | 46elks |
| `SITE` / `PUBLIC_SITE_URL` | Enkätlänkar i SMS |
| `PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (nuvarande SHARP) | Server-side DB (ersätts om stack byts) |
| `POOL_ENCRYPTION_KEY` | Dekryptera telefon i kö/sändning |
| Preview-signering | `PERSONAL_SESSION_SECRET` (eller fallback enligt `enkat-preview-token.ts`) |

Exakta namn och fler variabler: se Netlify/`.env`-uppsättning i projektet och `docs/ENV-KONFIGURATION.md` (avsnitt om site URL; komplettera med enkät enligt samma fil).

---

## 5. Föreslagen ordning i ett utbrytningsprojekt (för promptning)

1. **Exportera sanning:** läs `ENKAT-SQL-SPEC.md` + kör diff mot faktiska migreringar i `supabase/migrations/`.
2. **API-kontrakt:** `ENKAT-API-SPEC.md` + faktiska handlers i `src/pages/api/enkat/`.
3. **Bakgrundsbeteende:** dokumentera exakt vad `enkat-send-queue` och `enkat-remind-scheduled` gör (batch-storlek, felhantering).
4. **Beslut ny stack:** först **paritet** med nuvarande beteende, sedan optimering (kön, observability).
5. **Datamigrering:** engångsexport av tabeller eller dual-write — separat plan; inget i denna fil.

---

## 6. Vanliga fallgropar för extern AI

- Anta **Next.js/API** när källan är **Astro endpoints**.
- Glömma **Netlify-funktionerna** som del av produktionsflödet.
- Byta ut **Postgres-funktionen** `submit_enkat_response` utan att bevara låsning/race-säkerhet.
- **Hårdkoda** SMS-leverantör i stället för adapter (befintlig kod anropar 46elks direkt i `enkat-sms.ts` — vid utbrytning bör ett `SmsProvider`-gränssnitt övervägas).

---

## 7. Relaterade dokument

- `MASTERDOKUMENT.md` — översikt, modulkarta, promptmallar  
- `ENKAT-STATUS.md` — vad som är verifierat, migrationslista  
- `ENKAT-PATIENTUPPLEVELSE.md` — domän och ursprunglig design  
- `ENKAT-API-SPEC.md` / `ENKAT-UI-SPEC.md` / `ENKAT-SQL-SPEC.md` — detaljer  
