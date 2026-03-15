# Patientupplevelse via SMS: SQL-spec för enkätmigreringar

> Databasspecifikation för första versionen av enkätmodulen i SHARP.
>
> Syftet är att definiera tabeller, constraints, index, RLS och hjälpfunktioner innan själva migreringen skrivs.

---

## 1. Mål med migreringen

Migreringarna `supabase/migrations/023-enkat.sql` och `supabase/migrations/025-enkat-installningar.sql` ska skapa den databasgrund som krävs för att:

- skapa enkätkampanjer
- hantera importerade utskick
- ta emot enkätsvar
- logga SMS-leveransstatus
- stödja dashboard per vårdgivare
- skydda patientintegritet

Målet är inte att bygga all framtida analys i SQL från start, men datamodellen ska vara tillräckligt stabil för att:

- stödja V1
- kunna utökas i V2/V3 utan att behöva göras om från grunden

---

## 2. Övergripande datamodell

### Relationer

```text
profiles/auth.users
    ↓
enkat_kampanjer
    ↓
enkat_utskick
    ↓
enkat_svar

enkat_kampanjer
    ↓
enkat_delivery_log

enkat_utskick
    ↓
enkat_delivery_log

auth.users
    ↓
enkat_installningar
```

### Designprincip

- `enkat_kampanjer` beskriver en körning / batch
- `enkat_utskick` beskriver en unik patientlänk och utskicksrad
- `enkat_svar` beskriver ett faktiskt svar
- `enkat_delivery_log` beskriver varje SMS-försök
- `enkat_installningar` beskriver den gemensamma klinikmallen för auto-exkludering av bokningstyper

---

## 2A. Tabell: `enkat_installningar`

### Syfte

Lagrar en gemensam standardmall för bokningstyper som aldrig ska följas upp i patientupplevelseflödet.

### Kolumner

| Kolumn | Typ | Null | Beskrivning |
|---|---|---|---|
| `id` | TEXT | Nej | Singleton-id, normalt `standard` |
| `exkludera_bokningstyper` | TEXT[] | Nej | Lista med regler/mönster som ska sorteras bort före preview |
| `updated_by` | UUID | Ja | FK till `auth.users(id)` för senaste sparning |
| `created_at` | TIMESTAMPTZ | Nej | Skapad |
| `updated_at` | TIMESTAMPTZ | Nej | Senast uppdaterad |

### Designregel

- tabellen ska normalt bara innehålla en rad
- klientåtkomst bör gå via server-side API så att endast admin kan spara
- om raden saknas ska applikationen kunna falla tillbaka till inbyggda standardvärden

---

## 3. Tabell: `enkat_kampanjer`

### Syfte

Representerar en administrativ kampanj där en CSV importerats och ett antal patienter valts ut för enkätutskick.

### Kolumner

| Kolumn | Typ | Null | Beskrivning |
|---|---|---|---|
| `id` | UUID | Nej | Primärnyckel |
| `skapad_av` | UUID | Nej | FK till `auth.users(id)` |
| `status` | TEXT | Nej | Kampanjstatus |
| `namn` | TEXT | Ja | Valfritt namn för kampanjen |
| `csv_filnamn` | TEXT | Ja | Ursprungligt filnamn |
| `total_importerade` | INTEGER | Nej | Antal rader från fil |
| `total_giltiga` | INTEGER | Nej | Efter validering |
| `total_dubletter` | INTEGER | Nej | Antal bortvalda dubletter |
| `total_ogiltiga` | INTEGER | Nej | Antal felrader |
| `total_skickade` | INTEGER | Nej | Antal faktiskt skickade första SMS |
| `total_svar` | INTEGER | Nej | Antal svarade enkäter |
| `global_bokningstyp` | TEXT | Ja | Legacyfält från tidigare UI-flöde, används inte längre i aktiv import |
| `sms_mall` | TEXT | Ja | Använd SMS-mall |
| `skicka_paminnelse` | BOOLEAN | Nej | Om påminnelse ska användas |
| `paminnelse_efter_timmar` | INTEGER | Ja | T.ex. 48 |
| `skicka_nu` | BOOLEAN | Nej | Om direktutskick önskas |
| `planerad_skicktid` | TIMESTAMPTZ | Ja | Om schemalagt utskick |
| `created_at` | TIMESTAMPTZ | Nej | Skapad |
| `updated_at` | TIMESTAMPTZ | Nej | Senast uppdaterad |

### Rekommenderade statusvärden

`status` bör begränsas via `CHECK`:

- `utkast`
- `redo`
- `skickar`
- `klar`
- `fel`
- `avbruten`

### Constraints

- `PRIMARY KEY (id)`
- `FOREIGN KEY (skapad_av) REFERENCES auth.users(id) ON DELETE CASCADE`
- `CHECK (status IN (...))`
- `CHECK (total_importerade >= 0)`
- `CHECK (total_giltiga >= 0)`
- `CHECK (total_dubletter >= 0)`
- `CHECK (total_ogiltiga >= 0)`
- `CHECK (total_skickade >= 0)`
- `CHECK (total_svar >= 0)`
- `CHECK (paminnelse_efter_timmar IS NULL OR paminnelse_efter_timmar >= 1)`

### Default-värden

- `id DEFAULT gen_random_uuid()`
- `status DEFAULT 'utkast'`
- `total_importerade DEFAULT 0`
- `total_giltiga DEFAULT 0`
- `total_dubletter DEFAULT 0`
- `total_ogiltiga DEFAULT 0`
- `total_skickade DEFAULT 0`
- `total_svar DEFAULT 0`
- `skicka_paminnelse DEFAULT true`
- `skicka_nu DEFAULT true`
- `created_at DEFAULT now()`
- `updated_at DEFAULT now()`

---

## 4. Tabell: `enkat_utskick`

### Syfte

Representerar en vald rad från importen som fått en unik enkätkod och kan få ett eller två SMS.

### Integritetsprincip

Denna tabell ska **inte** långsiktigt användas som patientregister.

Om tillfällig kontaktdata måste lagras för utskick ska den:

- vara krypterad
- ha tydlig retention
- aldrig användas för analys

### Kolumner

| Kolumn | Typ | Null | Beskrivning |
|---|---|---|---|
| `id` | UUID | Nej | Primärnyckel |
| `kampanj_id` | UUID | Nej | FK till kampanj |
| `unik_kod` | TEXT | Nej | Publik enkätkod |
| `patient_id_hash` | TEXT | Ja | Hash/pseudonym för intern dedupspårning |
| `telefon_temp_krypterad` | TEXT | Ja | Endast om modell B används |
| `vardgivare_namn` | TEXT | Nej | Namn från CSV |
| `besoksdatum` | DATE | Nej | Datum från CSV |
| `besoksstart_tid` | TIME | Ja | Starttid om tillgänglig |
| `bokningstyp_raw` | TEXT | Ja | Originalvärde från CSV |
| `bokningstyp_normaliserad` | TEXT | Ja | Klassificerad grupp |
| `forsta_sms_skickad_vid` | TIMESTAMPTZ | Ja | När första SMS gick |
| `paminnelse_skickad_vid` | TIMESTAMPTZ | Ja | När påminnelse gick |
| `svarad_vid` | TIMESTAMPTZ | Ja | När svar registrerades |
| `used` | BOOLEAN | Nej | Om länken redan använts |
| `expires_at` | TIMESTAMPTZ | Nej | När koden slutar gälla |
| `created_at` | TIMESTAMPTZ | Nej | Skapad |

### Constraints

- `PRIMARY KEY (id)`
- `FOREIGN KEY (kampanj_id) REFERENCES enkat_kampanjer(id) ON DELETE CASCADE`
- `UNIQUE (unik_kod)`
- `CHECK (bokningstyp_normaliserad IS NULL OR bokningstyp_normaliserad IN ('nybesok', 'nybesok_remiss', 'aterbesok', 'ssk_besok', 'telefon', 'ovrigt'))`

### Default-värden

- `id DEFAULT gen_random_uuid()`
- `used DEFAULT false`
- `created_at DEFAULT now()`
- `expires_at DEFAULT now() + interval '30 days'`

### Kommentar

`patient_id_hash` är valfritt men rekommenderat om man vill kunna:

- spåra deduplicering
- analysera importkvalitet
- undvika att lagra rått patient-ID

Hashning bör ske innan lagring.

---

## 5. Tabell: `enkat_svar`

### Syfte

Lagrar patientens faktiska svar på enkäten.

### Kolumner

| Kolumn | Typ | Null | Beskrivning |
|---|---|---|---|
| `id` | UUID | Nej | Primärnyckel |
| `kampanj_id` | UUID | Nej | FK till kampanj |
| `utskick_id` | UUID | Nej | FK till utskick |
| `vardgivare_namn` | TEXT | Nej | Duplicerat för enkel analys |
| `besoksdatum` | DATE | Nej | Duplicerat för enkel analys |
| `besoksstart_tid` | TIME | Ja | Duplicerat för tidsanalys |
| `bokningstyp_raw` | TEXT | Ja | Duplicerat för analys |
| `bokningstyp_normaliserad` | TEXT | Ja | Duplicerat för analys |
| `helhetsbetyg` | INTEGER | Nej | 1-10 |
| `bemotande` | INTEGER | Nej | 1-5 |
| `information` | INTEGER | Nej | 1-5 |
| `lyssnad_pa` | INTEGER | Nej | 1-5 |
| `plan_framat` | INTEGER | Nej | 1-5 |
| `kommentar_bra` | TEXT | Ja | Frivillig |
| `kommentar_forbattra` | TEXT | Ja | Frivillig |
| `created_at` | TIMESTAMPTZ | Nej | Skapad |

### Constraints

- `PRIMARY KEY (id)`
- `FOREIGN KEY (kampanj_id) REFERENCES enkat_kampanjer(id) ON DELETE CASCADE`
- `FOREIGN KEY (utskick_id) REFERENCES enkat_utskick(id) ON DELETE CASCADE`
- `UNIQUE (utskick_id)` för att förhindra dubbelsvar
- `CHECK (helhetsbetyg BETWEEN 1 AND 10)`
- `CHECK (bemotande BETWEEN 1 AND 5)`
- `CHECK (information BETWEEN 1 AND 5)`
- `CHECK (lyssnad_pa BETWEEN 1 AND 5)`
- `CHECK (plan_framat BETWEEN 1 AND 5)`

### Duplicerad metadata

Det är medvetet att `vardgivare_namn`, `besoksdatum` och `bokningstyp_*` dupliceras från utskickstabellen.

Skäl:

- snabbare analys
- enklare SQL för dashboard
- mindre beroende av joins i statistikvyer

---

## 6. Tabell: `enkat_delivery_log`

### Syfte

Loggar varje faktiskt SMS-försök och dess status.

Denna tabell ska ses som **obligatorisk i V1**.

### Kolumner

| Kolumn | Typ | Null | Beskrivning |
|---|---|---|---|
| `id` | UUID | Nej | Primärnyckel |
| `kampanj_id` | UUID | Nej | FK till kampanj |
| `utskick_id` | UUID | Ja | FK till utskick |
| `typ` | TEXT | Nej | `forsta_sms` eller `paminnelse` |
| `status` | TEXT | Nej | `queued`, `sent`, `failed`, `delivered` |
| `provider` | TEXT | Nej | T.ex. `46elks` |
| `provider_message_id` | TEXT | Ja | Leverantörens ID |
| `provider_response` | JSONB | Ja | Rådata från leverantören |
| `felkod` | TEXT | Ja | Normaliserad felkod |
| `felmeddelande` | TEXT | Ja | Läsbart fel |
| `created_at` | TIMESTAMPTZ | Nej | Skapad |

### Constraints

- `PRIMARY KEY (id)`
- `FOREIGN KEY (kampanj_id) REFERENCES enkat_kampanjer(id) ON DELETE CASCADE`
- `FOREIGN KEY (utskick_id) REFERENCES enkat_utskick(id) ON DELETE SET NULL`
- `CHECK (typ IN ('forsta_sms', 'paminnelse'))`
- `CHECK (status IN ('queued', 'sent', 'failed', 'delivered'))`

### Syfte i praktiken

Tabellen behövs för att:

- felsöka leveransproblem
- räkna misslyckade utskick
- se om påminnelser faktiskt gick ut
- kunna analysera svarsfrekvens mot faktisk leverans

---

## 7. Index

### Rekommenderade index

#### `enkat_kampanjer`

- `idx_enkat_kampanjer_skapad_av` på `(skapad_av)`
- `idx_enkat_kampanjer_status` på `(status)`
- `idx_enkat_kampanjer_created_at` på `(created_at DESC)`

#### `enkat_utskick`

- `idx_enkat_utskick_kampanj` på `(kampanj_id)`
- `idx_enkat_utskick_unik_kod` på `(unik_kod)`
- `idx_enkat_utskick_vardgivare` på `(vardgivare_namn)`
- `idx_enkat_utskick_besoksdatum` på `(besoksdatum DESC)`
- `idx_enkat_utskick_svarad` på `(svarad_vid)`
- `idx_enkat_utskick_expires_at` på `(expires_at)`

#### `enkat_svar`

- `idx_enkat_svar_kampanj` på `(kampanj_id)`
- `idx_enkat_svar_utskick` på `(utskick_id)`
- `idx_enkat_svar_vardgivare` på `(vardgivare_namn)`
- `idx_enkat_svar_besoksdatum` på `(besoksdatum DESC)`
- `idx_enkat_svar_bokningstyp` på `(bokningstyp_normaliserad)`
- `idx_enkat_svar_created_at` på `(created_at DESC)`

#### `enkat_delivery_log`

- `idx_enkat_delivery_log_kampanj` på `(kampanj_id)`
- `idx_enkat_delivery_log_utskick` på `(utskick_id)`
- `idx_enkat_delivery_log_status` på `(status)`
- `idx_enkat_delivery_log_created_at` på `(created_at DESC)`

---

## 8. RLS och behörighet

### Grundprincip

Datamodellen måste stödja följande:

- vårdgivare ser bara sina egna resultat
- chef/admin ser alla resultat
- patientsvar är inte öppna generellt för alla inloggade användare

### Rekommenderad strategi

RLS bör vara strikt i tabellerna, och bredare åtkomst för chef/admin bör styras via:

- Supabase auth
- app metadata / roll
- server-side API-routes

### Praktisk rekommendation för V1

#### `enkat_kampanjer`

- skapare kan läsa sina kampanjer
- admin/chef kan läsa alla

#### `enkat_utskick`

- inte direkt exponerad till vanliga klienter
- läses via server-side routes

#### `enkat_svar`

- vårdgivare ska bara få ut sina egna svar via API
- admin/chef får ut alla via API

#### `enkat_delivery_log`

- endast admin/chef och server-side bör se denna fullt ut

### Viktig designprincip

Det är bättre att göra de publika Astro API-routes ansvariga för filtrering än att försöka exponera råa tabeller direkt till klienten.

---

## 9. Triggers och hjälpfunktioner

### `updated_at` trigger för kampanjer

Rekommenderas på `enkat_kampanjer`.

### Auto-markering av utskick som besvarat

När rad skapas i `enkat_svar` bör systemet också uppdatera:

- `enkat_utskick.used = true`
- `enkat_utskick.svarad_vid = now()`
- `enkat_kampanjer.total_svar = total_svar + 1`

Detta kan göras:

- antingen i API-lagret
- eller via en trigger

### Rekommendation

För V1 är det rimligt att göra detta i API-lagret för att hålla SQL enklare.

### Auto-radering / retention

Om `telefon_temp_krypterad` används bör en retentionfunktion finnas som:

- tar bort eller nullar telefonuppgift efter att utskicket inte längre behövs
- senast när `expires_at` passerat

Detta kan göras i:

- Netlify Function
- schemalagd serverfunktion
- eller senare via databasjobb om tillgängligt

---

## 10. Dashboard-vyer och SQL-stöd

### Rekommenderad V1

Det är inte nödvändigt att skapa avancerade SQL-vyer i första migreringen, men följande aggregeringar bör vara enkla att uttrycka:

- svarsfrekvens per kampanj
- svarsfrekvens per vårdgivare
- svarsfrekvens per bokningstyp
- genomsnitt för delskalor
- andel höga/låga svar
- andel svar efter påminnelse
- andel svar beroende på fördröjning efter besöksstart

### Viktig framtida analys

Om `besoksstart_tid` sparas kan man senare beräkna:

```text
fördröjning = forsta_sms_skickad_vid - (besoksdatum + besoksstart_tid)
```

Det möjliggör analys av om t.ex.:

- SMS samma kväll
- SMS nästa morgon
- SMS 48 timmar senare

ger olika svarsfrekvens.

---

## 11. Kommentarsfält och PII

### SQL-nivå

Fritext ska lagras som textfält i `enkat_svar`, men SQL-migreringen ska inte försöka maska data.

Maskning bör ske i API-lagret innan insert.

### Rekommenderad regel

Inga råa patientidentifierare ska finnas i:

- `enkat_svar`
- `enkat_kampanjer`
- `enkat_delivery_log`

Undantaget är tillfällig krypterad telefon i `enkat_utskick` om modell B används.

---

## 12. Rekommenderade kommentarer i migreringen

Migreringen bör innehålla `COMMENT ON TABLE` och `COMMENT ON COLUMN` för:

- `enkat_kampanjer`
- `enkat_utskick`
- `enkat_svar`
- `enkat_delivery_log`

Särskilt viktigt att kommentera:

- att systemet inte är avsett som långsiktigt patientregister
- att kontaktdata är temporär om den används
- att analysen sker på anonym patientnivå men identifierbar vårdgivarnivå

---

## 13. Rekommenderad genomförandeordning

När själva `009-enkat.sql` skrivs bör den byggas i denna ordning:

1. skapa tabeller
2. skapa constraints
3. skapa index
4. aktivera RLS
5. skapa policies
6. skapa `updated_at`-trigger
7. lägga till kommentarer

---

## 14. Minsta acceptabla V1 i databasen

För att V1 ska vara tillräckligt stark bör migreringen minst innehålla:

- `enkat_kampanjer`
- `enkat_utskick`
- `enkat_svar`
- `enkat_delivery_log`
- index på kampanj, vårdgivare, datum och status
- RLS
- stöd för `besoksstart_tid`
- stöd för både `bokningstyp_raw` och `bokningstyp_normaliserad`

---

## 15. Sammanfattning

SQL-specen bör utformas för att stödja fyra saker samtidigt:

1. robust drift av utskick
2. patientintegritet
3. vårdgivarspecifik förbättringsanalys
4. framtida vidareutveckling utan ombyggnad

Det viktigaste designvalet i datamodellen är att:

- patientens identitet inte ska leva vidare i analyslagret
- vårdgivare och bokningstyp ska göra det
- leveranslogg ska finnas från dag 1
- `Starttid` ska sparas när den finns, eftersom det ger reell framtida analysnytta
