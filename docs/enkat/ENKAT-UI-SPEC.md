# Patientupplevelse via SMS: UI-specifikation

> UI-spec för V1 av enkätmodulen i SHARP.
>
> Fokus: tydligt personalflöde, enkel patientsida, förbättringsfokus och låg friktion.

---

## 1. Syfte

UI:t ska stödja tre huvudmål:

1. göra det enkelt för personal att importera och skicka enkäter
2. göra det enkelt för patienter att svara
3. göra det enkelt för vårdgivare och chef att förstå resultaten

UI:t ska kännas som en naturlig del av befintliga SHARP och följa samma visuella språk som:

- `/personal/kort-varsel`
- övriga personalsidor

---

## 2. Navigering i personalportalen

### Krav

Det ska finnas en tydlig länk till modulen i personalportalen.

### Rekommenderade placeringar

#### Primär placering

- `Personalöversikt` (`/personal/oversikt`)

#### Sekundär placering

- eventuell relaterad länk från `/personal/kort-varsel`

### Rekommenderad etikett

- `Patientupplevelse`

Alternativ:

- `Patientenkät`
- `Kvalitetsuppföljning`

### Rekommenderad ikon

- pratbubbla
- stapeldiagram
- hjärta/smile endast om tonen ska vara mjukare

Min rekommendation:

- använd en neutral och professionell ikon, t.ex. pratbubbla + diagram

---

## 3. Huvudsida för personal

### Status just nu

`/personal/enkat` innehåller nu redan:

- importpanel
- förhandsgranskning
- kampanjinställningar
- resultatöversikt
- kampanjhistorik
- rapportsektion
- adminfilter för vårdgivare

Det betyder att dokumentet nedan nu beskriver både:

- tänkt UI-struktur
- och den faktiska första implementationen

### URL

`/personal/enkat`

### Sidans struktur

Sidan bör delas i tydliga sektioner, i denna ordning:

1. sidhuvud
2. importpanel
3. förhandsgranskning
4. utskicksinställningar
5. kampanjstatus
6. dashboard
7. rapportsektion

### Sidhuvud

Visar:

- titel: `Patientupplevelse via SMS`
- kort beskrivning
- tillbaka-länk till personalöversikten

Exempeltext:

> Skicka anonyma SMS-enkäter efter mottagningsbesök och följ resultat per vårdgivare över tid.

---

## 4. Importpanel

### Syfte

Låta användaren ladda upp dagens exportfil och förstå om filen är korrekt.

### Innehåll

- en sammanhållen uppladdningsyta som stödjer både drag & drop och klick för filval
- tydlig visning av vald fil i samma block
- informationsruta om förväntat format
- fallback-fält för `Bokningstyp`

### Information som ska visas

- vilka kolumner som är obligatoriska:
  - `Patient-ID`
  - `Mobiltelefon`
  - `Vårdgivare`
  - `Datum`
- vilka som är valfria:
  - `Bokningstyp`
  - `Starttid`

### CTA

- `Ladda och förhandsgranska`

### Felvisning

Om filen inte går att läsa:

- tydlig felbanner
- exakt orsak, t.ex.
  - saknad kolumn
  - ogiltigt telefonnummer
  - tom fil

---

## 5. Förhandsgranskning

### Syfte

Visa vad systemet tänker göra innan något skickas.

### Sammanfattningskort

Överst i previewn:

- antal totala rader
- antal giltiga rader
- antal dubletter
- antal ogiltiga rader
- antal vårdgivare i filen

### Tabell: valda rader

Kolumner:

- Patient-ID
- Vårdgivare
- Datum
- Starttid
- Bokningstyp rå
- Bokningstyp normaliserad
- status

### Tabell: dubletter

Separat sektion:

- vilken rad valdes
- vilka rader valdes bort
- varför

Exempel på motivering:

- `Nybesök/remiss prioriterad över återbesök`
- `Senaste besöket valt inom samma kategori`

### Tabell: felrader

Separat sektion:

- radnummer
- fält
- felmeddelande

Exempel:

- `Mobiltelefon saknas`
- `Ogiltigt datumformat`

### Viktig designprincip

Användaren ska kunna förstå previewn utan att kunna SQL eller teknik.

---

## 6. Utskicksinställningar

### Syfte

Låta användaren välja hur kampanjen ska skickas.

### Fält

- Kampanjnamn
- SMS-mall
- fallback för bokningstyp
- skicka nu / skicka senare
- påminnelse Ja/Nej
- påminn efter antal timmar
- sändningsfönster (valfritt, V1 eller V1.1)

### SMS-mall

Bör visas i ett större textfält.

Systemet bör kunna ersätta:

- `[VÅRDGIVARE]`
- `[DATUM]`
- `[BOKNINGSTYP]`
- `[LÄNK]`

### Preview av SMS

Mycket rekommenderat:

- liten live-preview av hur SMS:et ser ut

Detta minskar risken för fel innan utskick.

### Primär CTA

- `Skapa kampanj och skicka`

Sekundära:

- `Spara som utkast`
- `Avbryt`

---

## 7. Kampanjstatus

### Syfte

Visa vad som faktiskt hänt efter att kampanjen startat.

### Visas per kampanj

- status
- skapad av
- skapad tid
- antal köade
- antal skickade
- antal misslyckade
- antal svar
- antal påminnelser

### Rekommenderade statusetiketter

- `Utkast`
- `Redo`
- `Skickar`
- `Klar`
- `Fel`
- `Avbruten`

### Detaljvy

Vid klick på kampanj:

- utskickslogg
- leveransfel
- antal svar
- vårdgivarfördelning

---

## 8. Dashboard för vårdgivare

### Grundregel

En vårdgivare ska bara se sina egna resultat.

### Översiktskort

Visas överst:

- svarsfrekvens
- helhetsbetyg
- bemötande
- information
- lyssnad på
- plan framåt

### Trender

Visas som enkla grafer:

- senaste 30 dagar
- senaste 90 dagar

### Kommentarer

Sektion för senaste kommentarer:

- `Vad var bra?`
- `Vad hade kunnat vara bättre?`

### Lågt underlag

Om underlaget är mindre än anonymitetströskeln:

- visa inte individkort
- visa neutral text:
  - `För få svar för att visa resultat på ett integritetssäkert sätt`

---

## 9. Dashboard för chef/admin

### Grundregel

Chef/admin ska kunna se alla vårdgivare sida vid sida.

### Vyer

#### A. Jämförelseöversikt

Tabell eller kortgrid med:

- vårdgivare
- antal svar
- svarsfrekvens
- helhetsbetyg
- delskalor
- förändring mot föregående period

#### B. Djupvy per vårdgivare

Klickbar detaljvy:

- trend över tid
- bokningstypsfördelning
- kommentarer
- förbättringsområden

#### C. Mottagningsvy

Aggregerad översikt:

- hela mottagningens nivå
- variation mellan vårdgivare
- svarsfrekvens totalt

### Viktig designprincip

Jämförelsevyn ska vara analytisk, inte “leaderboard”.

Undvik:

- rankingkänsla
- stora gröna/röda topplistor

Fokusera på:

- utveckling
- variation
- förbättringsmöjligheter

---

## 10. Rapportsektion

### Syfte

Stödja återkommande uppföljning, t.ex. månadsvis.

### Filter

- period
- vårdgivare
- bokningstyp

### Innehåll

- antal skickade
- antal svar
- svarsfrekvens
- helhetsnöjdhet
- delskalor
- förbättring mot föregående period
- positiva teman
- förbättringsområden

### CTA

- `Visa rapport`
- senare: `Exportera CSV`
- senare: `Skapa PDF`

---

## 11. Patientsidan

### URL

`/e/[kod]`

### Designmål

- extremt enkel
- mobil först
- trygg ton
- låg friktion

### Innehåll

1. rubrik
2. anonymitetstext
3. frågor
4. skicka-knapp
5. tacksida

### Rubrik

Exempel:

> Enkät om ditt besök hos [Vårdgivare]

### Kontextfält

Visa:

- vårdgivare
- besöksdatum
- bokningstyp om relevant

### Anonymitetstext

Måste vara tydlig och synlig utan scroll om möjligt.

### Svarskomponenter

#### Helhetsbetyg

- stora klickbara knappar 1-10

#### Delskalor

- tydliga femstegsknappar eller radio-knappar

#### Fritext

- två separata textfält:
  - `Vad var bra?`
  - `Vad hade kunnat vara bättre?`

### CTA

- `Skicka svar`

### Efter submit

Visa:

- tackmeddelande
- bekräftelse att svar registrerats

---

## 12. Fel- och tomlägen

### Import

- ingen fil vald
- fel filformat
- saknade kolumner
- inga giltiga rader

### Kampanj

- inget att skicka
- SMS-leverantör svarar inte
- kampanj misslyckades delvis

### Patientsida

- ogiltig kod
- redan använd kod
- utgången kod

### Dashboard

- för få svar
- inga kampanjer ännu
- inga kommentarer ännu

Alla dessa lägen ska ha:

- tydlig text
- lugn ton
- ingen teknisk jargong mot slutanvändaren

---

## 13. Komponenter och återanvändning

### Återanvänd visuella mönster från SHARP

- kortpaneler
- statistikrutor
- banners
- primära och sekundära knappar

### Relevant stöd

Se:

- `docs/UI-KOMPONENTER.md`

### Rekommenderade komponenter

- `UploadDropzone`
- `ImportSummaryCards`
- `DuplicateResolutionTable`
- `SurveySmsPreview`
- `CampaignStatusTable`
- `ProviderStatsCards`
- `CommentsPanel`

Detta kräver inte att de skapas som egna filer direkt, men UI:t bör tänkas komponentiserbart från början.

---

## 14. Mobil och tillgänglighet

### Krav

- hela patientsidan ska fungera bra på mobil
- stora klickytor
- tydlig kontrast
- labels kopplade till inputs
- tangentbordsnavigering på personalsidan

### Rekommendation

Patientsidan ska testas som om användaren:

- är stressad
- har dålig uppkoppling
- sitter med en hand

---

## 15. Definition of done för UI

UI:t är tillräckligt bra för V1 när:

- personal kan importera fil utan instruktion från utvecklare
- previewn tydligt visar vad som kommer att skickas
- kampanjstatus är begriplig
- vårdgivare förstår sina egna resultat
- chef/admin kan jämföra vårdgivare sida vid sida
- patienter kan svara på under en minut från mobilen

---

## 16. Sammanfattning

UI-specen ska stödja:

1. enkel import
2. trygg patientupplevelse
3. förbättringsinriktad återkoppling
4. tydlig rollskillnad mellan vårdgivare och chef

Det viktigaste är att gränssnittet inte känns som:

- ett kontrollsystem
- ett tekniskt verktyg
- en administrativ börda

utan som:

- ett praktiskt förbättringsstöd
- ett enkelt arbetsflöde
- en trygg kanal för patientfeedback
