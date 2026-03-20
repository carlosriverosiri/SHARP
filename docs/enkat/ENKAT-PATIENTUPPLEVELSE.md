# Patientupplevelse via SMS: Teknisk dokumentation

> Teknisk specifikation för en ny modul i SHARP för anonym patientuppföljning, kvalitetsförbättring och vårdgivarspecifik återkoppling.
>
> Rekommenderad implementation: i samma Astro/Supabase/46elks-arkitektur som `Kort varsel`.

**Aktuellt publikt formulär (utseende, mobil, mall för framtida formulär):** `ENKAT-PATIENTFORMULAR-MALL.md`

---

## 1. Syfte

Målet är att bygga ett internt system för att:

- skicka SMS-baserade patientenkäter efter mottagningsbesök
- samla in anonyma svar från patienter
- visa resultat per vårdgivare och över tid
- stödja coachning och förbättringsarbete, inte bara övervakning

Systemet ska vara:

- anonymt för patienten
- tydligt kopplat till vårdgivare och besökstyp
- enkelt att drifta i befintlig SHARP-miljö
- tillräckligt robust för dagliga eller veckovisa utskick

---

## 2. Rekommenderad arkitektur

### Val av plattform

Rekommendationen är att bygga detta i **befintlig Astro-applikation**, inte som en separat Next.js-app.

### Skäl

- samma autentisering som i personalportalen
- samma Supabase- och RLS-modell
- samma 46elks-integration
- samma design- och driftsmiljö
- mindre komplexitet och snabbare iteration

### Synlighet i systemet

Funktionen ska vara lätt att hitta för personalen.

Det bör därför finnas en tydlig länk till enkätmodulen i personalportalen, lämpligen:

- i `/personal/oversikt`
- och vid behov även som relaterad funktion från `Kort varsel`

### Arkitekturöversikt

```text
Personal (/personal/enkat)
  -> Astro SSR-sida
  -> Astro API-routes
  -> Supabase-tabeller för kampanjer, utskick och svar
  -> 46elks för SMS
  -> Patientsida /e/[kod]
  -> Dashboard / rapporter per vårdgivare
```

### Föreslagna filer

```text
src/pages/personal/enkat.astro
src/pages/e/[kod].astro
src/pages/api/enkat/upload.ts
src/pages/api/enkat/send.ts
src/pages/api/enkat/report.ts
src/pages/api/enkat/dashboard.ts
src/lib/enkat-csv-parser.ts
src/lib/enkat-booking-classifier.ts
netlify/functions/enkat-send-queue.mts
supabase/migrations/009-enkat.sql
```

---

## 3. CSV-format

### Observerat format från PDF-exemplet

Det bifogade PDF-exemplet visar att exporten ser ut som en **semicolon-separerad fil**:

```text
Patient-ID;Mobiltelefon;Vårdgivare;Datum;Bokningstyp;
b5kp8fc;+46707676108;Sophie Lantz;2026-02-02;KuralinkFysiskt;
1293hob;+46706262665;Björn Nordenstedt;2026-02-02;5. OPERATION;
7bfj0gn;+46706480983;Björn Nordenstedt;2026-02-02;4a. ÅB OP KNÄ;
```

### Viktigt

- radnumren i PDF/Notepad++ är **inte en del av filen**
- separatorn är `;`
- varje rad verkar ha ett extra avslutande `;`
- telefonnummer är redan i internationellt format `+467...`
- datum är i ISO-format `YYYY-MM-DD`
- de fasta kärnkolumnerna i verklig drift är `Patient-ID`, `Mobiltelefon`, `Vårdgivare`, `Datum`, `Bokningstyp` och `Diagnoser`
- `Bokningstyp` kan ändras över tid och får inte hårdkodas som en sluten lista
- rader utan värde i `Diagnoser` ska inte gå vidare till utskick
- `Starttid` kan förekomma i exporten och bör stödjas när den finns

### Förväntade kolumner

| Kolumn | Obligatorisk | Exempel | Kommentar |
|---|---|---|---|
| `Patient-ID` | Ja | `b5kp8fc` | Pseudonymt eller internt patient-ID |
| `Mobiltelefon` | Ja | `+46707676108` | Svenskt mobilnummer |
| `Vårdgivare` | Ja | `Sophie Lantz` | Den behandlande personen |
| `Datum` | Ja | `2026-02-02` | Besöksdatum |
| `Bokningstyp` | Ja | `3. REMISS AXEL` | Fri text från källsystem |
| `Diagnoser` | Ja | `M75.1` | Tom cell betyder att raden ska sorteras bort före preview |
| `Starttid` | Nej | `08:40` | Starttid för besöket, om tillgänglig i exporten |

### Parserkrav

Parsern ska:

- auto-detektera separator (`;`, tab, `,`)
- hantera filer i Latin-1/Windows-1252 (vanligt vid export från svenska journalsystem)
- tåla avslutande tom kolumn
- trimma whitespace
- acceptera svenska tecken
- validera datum
- validera telefonnummer
- inte ändra redan korrekta nummer i `+46`-format i onödan
- kräva `Bokningstyp` och `Diagnoser` som kolumner i filen
- sortera bort rader där `Diagnoser` är tom
- hantera saknad `Starttid` utan att flödet bryts
- visa felrader tydligt i preview
- vara tolerant mot mindre variationer i rubriker, whitespace och teckenkodning

---

## 4. Deduplikering och urval

### Problem

Samma patient kan förekomma flera gånger, t.ex.:

- först som nybesök
- senare som återbesök

För kvalitetsuppföljning är det oftast viktigare att fånga **nybesök** än återbesök.

### Rekommenderad dedup-logik

Primär dedup:

1. deduplicera på `Patient-ID`
2. om `Patient-ID` saknas eller är tomt, fallback på telefonnummer

### Rekommenderad prioritetsregel vid dubletter

När samma patient förekommer flera gånger:

1. välj nybesök/remiss före återbesök
2. om flera nybesök finns:
   - välj senaste besöket eller första raden enligt vald policy
3. om bara återbesök finns:
   - välj senaste återbesöket

### Rekommenderad klassificering av bokningstyp

Eftersom `Bokningstyp` är fri text bör systemet klassificera den i enklare grupper:

| Regel | Klass |
|---|---|
| innehåller `nybesök` | `nybesok` |
| innehåller `remiss` | `nybesok_remiss` |
| innehåller `åb` eller `återbesök` | `aterbesok` |
| innehåller `ssk` | `ssk_besok` |
| innehåller `telefon` | `telefon` |
| annars | `ovrigt` |

Detta är en **normalisering för analys och urval**, inte en fast lista över tillåtna bokningstyper.
Originalvärdet från CSV ska alltid kunna sparas som `bokningstyp_raw`.

### Rekommenderad prioritet

| Prioritet | Klass |
|---|---|
| 1 | `nybesok` |
| 2 | `nybesok_remiss` |
| 3 | `aterbesok` |
| 4 | `ssk_besok` |
| 5 | `telefon` |
| 6 | `ovrigt` |

### UI-beteende vid dubletter

Importvyn ska visa:

- antal totala rader
- antal giltiga rader
- antal dubletter
- vilka rader som valdes bort
- varför en viss rad valdes framför en annan

### Rekommenderad vidareutveckling

Om exportformatet varierar i verklig drift bör systemet senare kunna stödja:

- alias-hantering för vårdgivarnamn
- konfigurerbara klassificeringsregler för `Bokningstyp`
- konfigurerbar mappning av nya bokningstyper utan kodändring
- fri hantering av nya vårdgivare utan att de måste läggas in manuellt i förväg

Detta är inte ett krav för första versionen, men bör hållas i åtanke för att minska framtida underhåll.

---

## 5. Utskicksstrategi

### Grundprincip

Systemet ska inte spamma patienter.

### Rekommenderad standard

- **1 initialt SMS**
- **max 1 påminnelse**
- ingen ytterligare uppföljning

### Rekommenderad timing

| Typ | Tidpunkt |
|---|---|
| Första SMS | samma dag efter besöket eller dagen efter |
| Påminnelse | 48-72 timmar senare |
| Stopp | senast 5-7 dagar efter besöket |

### Rekommenderad logik

Påminnelse skickas bara om:

- patienten inte redan svarat
- kampanjen tillåter påminnelse
- utskicket inte är äldre än definierad maxperiod
- aktuell tid ligger inom definierat sändningsfönster

### Admininställningar

I `/personal/enkat` bör det finnas:

- `Skicka nu` / `Skicka senare`
- `Skicka påminnelse` Ja/Nej
- `Påminn efter` antal timmar eller dagar
- valfritt sändningsfönster, t.ex. vardagar dagtid

---

## 6. Enkätens innehåll

### Rekommenderad V1

För coachning räcker det inte med bara ett totalbetyg.

### Föreslagna frågor

#### Del 1: Helhetsomdöme

- `Hur nöjd är du med ditt besök som helhet?`
- skala 1-5 (1 = Instämmer inte alls, 5 = Instämmer helt)

#### Del 2: Strukturerade delområden

- `Bemötande`
- `Tydlighet i informationen`
- `Kände du dig lyssnad på?`

Rekommenderad skala: **1-5**

#### Del 3: Fritext

- `Vad var bra?`
- `Vad hade kunnat vara bättre?`

### Varför detta är bättre

Det möjliggör coachning på rätt nivå:

- inte bara att någon får låga betyg
- utan *varför* betygen blir låga

---

## 7. Patientflöde

### Rekommenderad URL

```text
/e/[kod]
```

Det är enklare än `/e/[kampanj_id]/[unik_kod]` och ligger nära det befintliga mönstret `/s/[kod]`.

### Sida för patienten

Visar:

- vårdgivare
- datum
- bokningstyp
- anonymitetstext
- enkätfrågor
- tacksida efter submit

### Obligatorisk anonymitetstext

```text
Denna enkät är anonym för vårdgivaren på individnivå. 
Vi använder svaren för kvalitetsförbättring i mottagningen. 
Skriv inte personnummer, diagnoser eller andra känsliga personuppgifter i fritext.
```

### Viktig notering

Fritext kan ändå innehålla personuppgifter. Därför bör systemet:

- visa tydlig varning till patienten
- automatiskt maska uppenbara personnummer, telefonnummer och mejladresser server-side

---

## 8. Dashboard och rapportering

### Miniminivå för V1

Systemet behöver rudimentär analys direkt från dag 1 för att utskicksstrategin ska kunna utvärderas.

### Dashboard bör visa

- antal skickade
- antal svar
- svarsfrekvens
- svarsfrekvens per vårdgivare
- svarsfrekvens per bokningstyp
- snittbetyg totalt
- snittbetyg per delområde
- antal påminnelser
- andel svar efter påminnelse
- antal misslyckade utskick
- svarsfrekvens relaterad till tid mellan besök och första SMS

### Viktiga mått

Utöver medelvärde bör systemet visa:

- andel höga svar
- andel låga svar
- antal kommentarer

Om `Starttid` finns tillgänglig bör systemet även kunna beräkna:

- tid från besöksstart till första utskick
- svarsfrekvens per fördröjningsintervall
- om tidig eller sen kontakt verkar påverka svarsviljan

### Rekommenderad visualisering

Per vårdgivare:

- helhetsnöjdhet senaste 30/90 dagar
- bemötande
- tydlighet
- lyssnad på
- trendlinje

Dashboarden bör i första hand lyfta **utveckling över tid** och förbättringsområden, inte skapa en känsla av ranking mellan kollegor.

### Anonymitetströskel

Resultat för en enskild vårdgivare bör inte visas om underlaget är för litet.

Rekommenderad startregel:

- visa inte individresultat om antal svar i vald period är mindre än 5
- visa i stället en neutral text, t.ex. `För få svar för att visa resultat på ett integritetssäkert sätt`

Tröskelvärdet kan justeras senare om verksamheten bedömer att ett annat gränsvärde fungerar bättre.

### Månadsrapport

Automatisk rapport kan innehålla:

- antal svar
- svarsfrekvens
- helhetsnöjdhet
- delskalor
- förändring mot föregående period
- vanliga positiva teman
- vanliga förbättringsområden

---

## 9. Behörighetsmodell

### Rekommenderad modell

Systemet är anonymt för patienten, men **inte anonymt på vårdgivarnivå**.

### Hybridmodell

| Roll | Ser |
|---|---|
| Vårdgivare | endast sina egna resultat, sina egna kommentarer och sina egna trender |
| Chef/verksamhetsansvarig | alla vårdgivares resultat sida vid sida, inklusive jämförelser och aggregerad översikt |
| Grupp/kollegor | aggregerade resultat, eventuellt begränsad insyn i kommentarer |

### Motiv

Detta stödjer förbättring utan att skapa onödigt defensiv kultur.

Råkommentarer bör vara mer restriktivt skyddade än aggregerade nyckeltal.

### Praktisk standard för denna modul

Första versionen bör implementera följande standard:

- enskild vårdgivare ser bara sitt eget material
- verksamhetsansvarig/chef ser alla vårdgivare sida vid sida
- övriga kollegor ser inte andra individers detaljresultat som default

---

## 10. Datamodell

### Rekommenderad V1

#### `enkat_kampanjer`

| Kolumn | Typ | Beskrivning |
|---|---|---|
| `id` | UUID | Primärnyckel |
| `skapad_av` | UUID | FK till användare |
| `status` | TEXT | `utkast`, `skickar`, `klar`, `fel` |
| `total_importerade` | INTEGER | Totalt i fil |
| `total_giltiga` | INTEGER | Efter validering |
| `total_skickade` | INTEGER | Faktiskt skickade |
| `global_bokningstyp` | TEXT | Fallback från UI |
| `sms_mall` | TEXT | Använd mall |
| `skicka_paminnelse` | BOOLEAN | Ja/nej |
| `paminnelse_efter_timmar` | INTEGER | Standard 48-72 |
| `created_at` | TIMESTAMPTZ | Skapad |

#### `enkat_utskick`

| Kolumn | Typ | Beskrivning |
|---|---|---|
| `id` | UUID | Primärnyckel |
| `kampanj_id` | UUID | FK till kampanj |
| `unik_kod` | TEXT | Unik publik kod |
| `vardgivare_namn` | TEXT | Vårdgivare |
| `besoksdatum` | DATE | Datum för besök |
| `besoksstart_tid` | TIME | Starttid för besöket, om tillgänglig |
| `bokningstyp_raw` | TEXT | Originalvärde från fil |
| `bokningstyp_normaliserad` | TEXT | Klassificerad grupp |
| `skickad_vid` | TIMESTAMPTZ | Första SMS skickat |
| `paminnelse_skickad_vid` | TIMESTAMPTZ | Påminnelse, om skickad |
| `svarad_vid` | TIMESTAMPTZ | När svar kom |
| `expires_at` | TIMESTAMPTZ | T.ex. +30 dagar |

#### `enkat_svar`

| Kolumn | Typ | Beskrivning |
|---|---|---|
| `id` | UUID | Primärnyckel |
| `utskick_id` | UUID | FK till utskick |
| `kampanj_id` | UUID | FK till kampanj |
| `helhetsbetyg` | INTEGER | 1-5 |
| `bemotande` | INTEGER | 1-5 |
| `information` | INTEGER | 1-5 |
| `lyssnad_pa` | INTEGER | 1-5 |
| `plan_framat` | INTEGER | 1-5 |
| `kommentar_bra` | TEXT | Frivillig |
| `kommentar_forbattra` | TEXT | Frivillig |
| `created_at` | TIMESTAMPTZ | Skapad |

#### `enkat_delivery_log`

| Kolumn | Typ | Beskrivning |
|---|---|---|
| `id` | UUID | Primärnyckel |
| `kampanj_id` | UUID | FK till kampanj |
| `utskick_id` | UUID | FK till utskick |
| `typ` | TEXT | `forsta_sms` eller `paminnelse` |
| `status` | TEXT | `queued`, `sent`, `failed`, `delivered` |
| `provider` | TEXT | T.ex. `46elks` |
| `provider_response` | JSONB | Råstatus från leverantören |
| `created_at` | TIMESTAMPTZ | Skapad |

Denna tabell bör betraktas som **nödvändig redan i V1**, inte som en senare förbättring.

### PII-princip

Rekommendation: ingen långsiktig lagring av patient-ID eller telefon i slutmodellen.

Om driftssäker kö krävs kan telefonnummer lagras:

- tillfälligt
- krypterat
- med strikt auto-radering

Telefonnummer som behövs under utskicksfasen får aldrig återanvändas för analys eller rapportering.

---

## 11. GDPR och integritet

### Rekommenderad princip

Systemet ska vara:

- anonymt i patientkommunikationen
- pseudonymt eller temporärt under utskicksfasen
- aggregerat i analysfasen

### Viktiga regler

- spara inte mer patientdata än nödvändigt
- radera tillfällig utskicksdata så snart den inte längre behövs
- spara bara det som krävs för analys:
  - vårdgivare
  - datum
  - bokningstyp
  - anonymt enkätsvar

### Fritext

Fritext måste betraktas som potentiellt känslig.

Åtgärder:

- tydlig varning till patient
- enkel automatisk maskning av personnummer, telefon och mejl
- begränsad åtkomst till råkommentarer

### Litet underlag

Små datamängder är inte bara ett statistikproblem utan också ett integritetsproblem.

Därför bör systemet kombinera:

- anonymitetströskel i dashboarden
- tydlig märkning av lågt underlag
- försiktig användning av råkommentarer när få svar inkommit

---

## 12. API-design

### Rekommenderade endpoints

| Endpoint | Funktion |
|---|---|
| `POST /api/enkat/upload` | parse, validera, deduplicera fil |
| `POST /api/enkat/send` | skapa kampanj och utskick |
| `POST /api/enkat/remind` | skicka påminnelser |
| `POST /api/enkat/submit` | ta emot svar från patientsidan |
| `GET /api/enkat/dashboard` | dashboarddata |
| `GET /api/enkat/report` | rapportdata per period |

### Background job

Om större batcher ska skickas bör Netlify Function användas:

- `netlify/functions/enkat-send-queue.mts`

Den kan återanvända logik från:

- `netlify/functions/scheduled-sms.mts`

---

## 13. UI-design

### Adminsida `/personal/enkat`

Bör innehålla:

Överst bör sidan ha en kort informationsruta som förklarar arbetsflödet: importera fil, granska urvalet och skapa kampanj innan SMS skickas.

1. importsektion
2. förhandsgranskning
3. filter och urval
4. SMS-mall
5. utskicksinställningar
6. kampanjstatus
7. dashboard

### Viktiga paneler

#### Import

- drag & drop
- välj fil
- visa antal rader
- visa fel

#### Urval

- inkludera/exkludera bokningstyper
- prioritera nybesök
- visa dubletter

#### Utskick

- skicka nu
- skicka senare
- påminnelse ja/nej

#### Resultat

- total svarsfrekvens
- per vårdgivare
- senaste kommentarer

---

## 14. Föreslagen utvecklingsordning

### Steg 1: Utskick + enkel svarsvy

- CSV-parser
- dedup- och klassificeringslogik
- kampanjskapande
- SMS-utskick
- patientsida med enkät
- lagring av svar

### Steg 2: Dashboard

- total svarsfrekvens
- vårdgivarvy
- bokningstypsfilter
- kommentarer
- månadsrapport

### Steg 3: Förbättringsstöd

- temaextraktion ur kommentarer
- AI-sammanfattning
- förbättringsförslag
- trendvarningar

---

## 15. Rekommenderat MVP-beslut

### Bygg nu

- i Astro
- i samma repo som SHARP
- med Supabase + 46elks
- med 1 påminnelse max
- med strukturerad enkät, inte bara totalbetyg
- med enkel dashboard från dag 1

### Bygg inte nu

- separat Next.js-app
- avancerad AI-analys i första versionen
- fler än en påminnelse
- för komplex enkät

---

## 16. Sammanfattande rekommendation

Detta bör byggas som en **egen kvalitetsmodul i SHARP**, inte som ett separat system.

Nyckelprinciper:

- patienten ska känna att enkäten är trygg och anonym
- vårdgivaren ska få konkret förbättringsbar återkoppling
- ledningen ska kunna följa utveckling över tid
- systemet ska vara återhållsamt med påminnelser
- nybesök ska prioriteras i urvalet

Det gör modulen lämplig både för:

- individuell coachning
- kvalitetsutveckling på mottagningsnivå
- framtida AI-stödd analys av kommentarer

