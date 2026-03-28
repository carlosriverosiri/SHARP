# Patientupplevelse via SMS: Implementationsplan

> Konkret byggplan för första versionen av enkätmodulen i SHARP.

**Aktuell kodöversikt** (filer, endpoints, beroenden): `MASTERDOKUMENT.md`. **Utbrytning till egen applikation:** `ENKAT-UTBRYTNING.md`.

---

## Målbild

Leverera en första produktionsbar version av en enkätmodul som:

- importerar mottagningsdata från CSV
- deduplicerar patienter med prioritet för nybesök/remiss
- skickar ett anonymt SMS med enkätlänk
- tillåter max en påminnelse
- samlar in strukturerade svar
- visar en enkel dashboard per vårdgivare

---

## Principer

### Funktionella principer

- samma plattform som SHARP i övrigt
- enkla flöden för personal
- tydlig skillnad mellan utskick och analys
- vårdgivarspecifik återkoppling
- förbättringsfokus, inte kontrollfokus
- enkel åtkomst från personalportalen

### Tekniska principer

- Astro SSR för adminsidor
- Astro API-routes för CRUD
- Supabase för datalagring
- 46elks för SMS
- Netlify Function för köhantering om batch behövs

### Integritetsprinciper

- ingen långsiktig lagring av onödig patientdata
- all analysdata ska vara patientanonym
- fritext ska hanteras som potentiellt känslig

---

## Etappindelning

## Status just nu

Följande delar är nu implementerade i kod:

- CSV-parser och booking classifier
- `/personal/enkat`
- `/e/[kod]`
- `upload`, `send`, `submit`, `dashboard`, `report`, `campaigns`, `remind`
- delivery log
- köhelper och schemalagd Netlify-funktion för första utskick
- profilkoppling till `vardgivare_namn`
- länk från personalportalen

**Drift:** Modulen används i verklig verksamhet med god svarsfrekvens och tydlig nytta av fritext (se `ENKAT-STATUS.md` / `MASTERDOKUMENT.md`).

Det betyder att dokumentet nedan ska läsas som:

- historisk byggordning
- referens för hur V1 delats upp
- underlag för kvarvarande arbete

## Etapp 1: CSV-import och kampanjskapande

### Leverabler

- `src/pages/personal/enkat.astro`
- `src/lib/enkat-csv-parser.ts`
- `src/lib/enkat-booking-classifier.ts`
- `src/pages/api/enkat/upload.ts`
- länk från personalportalen till `/personal/enkat`

### Funktioner

- ladda upp fil via drag & drop eller knapp
- parsea semikolonseparerad fil
- validera de fasta kärnkolumnerna: `Patient-ID`, `Mobiltelefon`, `Vårdgivare`, `Datum`, `Bokningstyp`, `Diagnoser`, `Starttid`
- behandla tom `Bokningstyp` som ej uppföljningsbar (raden ska bort i preview/utskick)
- sortera bort rader där `Diagnoser` är tom
- tillämpa en gemensam lista för bokningstyper som aldrig ska följas upp, innan deduplicering
- spara den gemensamma listan i Supabase så att den delas mellan datorer och användare
- visa kvarvarande bokningstyper i aktuell fil som kryssrutor för positivt urval
- kräva `Starttid` som kolumn och att varje uppföljningsbar rad har en giltig starttid
- validera telefonnummer utan att onödigt skriva om redan korrekta `+46`-nummer
- deduplicera på `Patient-ID`, fallback telefon
- klassificera bokningstyper
- visa preview med:
  - giltiga rader
  - dubletter
  - ogiltiga telefonnummer
  - valda rader efter prioritering
  - motivering till varför en viss rad valdes

### Godkänd när

- användaren kan ladda en fil och få en korrekt preview
- systemet kan visa vilka patienter som kommer att få SMS
- användaren kan se vilka bokningstyper som sorterades bort av den gemensamma listan
- användaren kan välja bokningstyper i aktuell fil via kryssrutor

### Status

Klar.

---

## Etapp 2: Utskick

### Leverabler

- `src/pages/api/enkat/send.ts`
- `netlify/functions/enkat-send-queue.mts`
- migration `supabase/migrations/023-enkat.sql` (och följande enkätrelaterade migreringar; se `ENKAT-STATUS.md`)
- tabell/logik för `enkat_delivery_log`

### Funktioner

- skapa `enkat_kampanjer`
- skapa `enkat_utskick`
- generera unika koder
- skicka SMS via 46elks
- logga skickstatus
- logga varje faktiskt skickförsök i `enkat_delivery_log`
- stöd för:
  - skicka nu
  - skicka senare
  - påminnelse Ja/Nej

### Beslutspunkt

Här måste implementationen välja en av två modeller:

#### Modell A: direktutskick

- enklare juridiskt
- mindre robust för stora batcher

#### Modell B: kortlivad kö

- bättre driftsäkerhet
- kräver tillfällig hantering av telefonnummer under utskick

### Rekommendation

Bygg **Modell B** men med strikt auto-radering av eventuell temporär kontaktdata.

Om Modell B används ska retention-fönstret definieras explicit i implementationen och vara kopplat till påminnelselogiken.

### Godkänd när

- en kampanj kan skapas och SMS kan skickas till valda mottagare

### Status

Klar i grundform, inklusive delivery log och kömodell för första utskick.

---

## Etapp 3: Patientsida och svar

### Leverabler

- `src/pages/e/[kod].astro`
- `src/pages/api/enkat/submit.ts`

### Funktioner

- visa vårdgivare, datum, bokningstyp
- visa anonymitetstext
- samla in:
  - helhetsbetyg 1-5
  - bemötande 1-5
  - information 1-5
  - lyssnad på 1-5
  - vad var bra
  - vad kunde förbättras
- tacksida efter submit
- förhindra dubbelsvar per kod

### Godkänd när

- patient kan svara via unik länk
- svar sparas korrekt och kan kopplas till vårdgivare och bokningstyp

### Status

Klar.

---

## Etapp 4: Enkel dashboard

### Leverabler

- `src/pages/api/enkat/dashboard.ts`
- dashboard-del i `/personal/enkat`

### Funktioner

- antal skickade
- antal svar
- svarsfrekvens
- snittbetyg totalt
- delskalor
- per vårdgivare
- per bokningstyp
- senaste kommentarer
- antal misslyckade utskick

### Viktiga nyckeltal

- total svarsfrekvens
- svarsfrekvens efter påminnelse
- andel låga svar
- andel höga svar
- antal kommentarer
- antal svar per vårdgivare
- korrelation mellan svarsfrekvens och tid från besök till första SMS när `Starttid` finns

### Integritetsregel i dashboard

Inför anonymitetströskel i första versionen:

- visa inte individresultat om underlaget är mindre än 5 svar i vald period
- visa neutral varning i stället

### Analys av utskickstid

Om `Starttid` finns i CSV ska första versionen förbereda för att kunna analysera:

- hur lång tid efter besöket första SMS skickades
- om olika fördröjning påverkar svarsfrekvens

Detta behöver inte bli en full graf i första iterationen, men datamodellen bör stödja det direkt.

### Godkänd när

- användaren kan förstå både svarskvalitet och utskickseffektivitet

### Status

Klar i första version, inklusive anonymitetströskel och rollstyrning.

---

## Etapp 5: Rapportering

### Leverabler

- `src/pages/api/enkat/report.ts`
- månadsrapport / veckorapport

### Funktioner

- periodfilter
- rapport per vårdgivare
- förändring mot föregående period
- utvalda kommentarer
- export till CSV eller PDF senare

### Status

Rapportendpoint och rapportsektion finns nu. Export återstår.

---

## Databasförslag

### Tabeller

- `enkat_kampanjer`
- `enkat_utskick`
- `enkat_svar`

### Eventuella hjälptabeller senare

- `enkat_report_cache`
- `enkat_comment_tags`
- `enkat_delivery_log`

Kommentar:

`enkat_delivery_log` är inte längre en framtida hjälptabell utan en faktisk del av implementationen.

---

## Behörighet

### Roller

- vårdgivare: ser sin egen dashboard, sina egna kommentarer och sina egna trender
- chef/admin: ser alla vårdgivare, inklusive jämförelsevy sida vid sida
- övrig personal: endast enligt beslutad policy

### Rekommenderad första implementation

- admin och chef ser allt
- vårdgivare ser endast sig själva
- länken till modulen ska vara synlig i personalportalen utan att användaren behöver känna till direkt-URL

---

## Påminnelselogik

### Grundregel

- 1 initialt SMS
- max 1 påminnelse
- ingen ytterligare kontakt

### Implementerat beteende (produktion)

- initialt utskick: enligt kampanj (direkt eller kö)
- påminnelse: **nästa kalenderdag kl 16:00 (Europe/Stockholm)** efter `forsta_sms_skickad_vid`, om obesvarat och kampanjen tillåter påminnelse
- automatisk utskickning via `netlify/functions/enkat-remind-scheduled.mts` (gemensam logik med `src/lib/enkat-remind-runner.ts`)
- ingen påminnelse om svar redan finns

---

## Risker

### Tekniska risker

- dålig CSV-kvalitet
- för många specialfall i bokningstyper
- osäkerhet kring temporär hantering av telefonnummer
- för svag första dashboard

### Organisatoriska risker

- kollegor upplever systemet som kontrollverktyg
- för små datamängder feltolkas
- fritextkommentarer upplevs hårda eller orättvisa

### Motåtgärder

- tydlig förbättringspositionering
- visa alltid antal svar
- märk data med “tolka försiktigt” vid lågt underlag
- håll första enkäten kort
- använd anonymitetströskel för vårdgivarspecifika vyer
- bygg `enkat_delivery_log` från start så att utskicksproblem kan felsökas

---

## Definition of done för V1

V1 är klar när följande fungerar i produktion:

- CSV importeras korrekt
- dubbletter hanteras med rätt prioritet
- SMS skickas med unik enkätlänk
- patienten kan svara anonymt
- svar syns i enkel dashboard per vårdgivare
- max en påminnelse kan skickas
- datamodellen är stabil nog för vidare analys
- misslyckade utskick kan spåras i delivery log
- dashboarden skyddar integritet vid lågt underlag

---

## Rekommenderat nästa steg efter V1

- månadsrapport
- kommentarsummering
- trendvarningar
- AI-stödd tematisk analys av fritext

## Faktiska nästa steg nu

- skarpt test med riktig CSV
- skarpt test av 46elks-utskick
- verifiera profilkoppling för vanliga användare
- export av rapport
- förbättrad visualisering av fördröjningsanalys

## Faktiskt nuläge i implementationen

Följande finns nu i kod:

- migreringar för enkättabeller och profilkoppling
- CSV-parser och bokningstypklassificering
- upload-preview
- kampanjskapande
- första utskick
- kömodell för första batch och schemalagd Netlify-funktion (`enkat-send-queue`)
- automatisk påminnelse via `enkat-remind-scheduled` (ingen påminnelseknapp i UI; `POST /api/enkat/remind` finns för ev. drift)
- publik enkätlänk och submit
- dashboard
- kampanjhistorik
- periodrapport
- adminfilter för vårdgivare
- fördröjningsanalys baserad på `Starttid`

Det innebär att nästa arbete främst är:

- skarp testning
- polish
- export
- eventuell finare visualisering
