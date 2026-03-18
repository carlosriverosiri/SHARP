# Patientupplevelse via SMS: API-specifikation

> Endpoint-spec för första versionen av enkätmodulen i SHARP.
>
> Fokus: robust V1 med tydlig validering, säker datahantering och förutsägbara svar från API-lagret.

---

## 1. Översikt

### Status just nu

Följande endpoints är nu implementerade i projektet:

- `POST /api/enkat/upload`
- `POST /api/enkat/send`
- `POST /api/enkat/submit`
- `GET /api/enkat/dashboard`
- `GET /api/enkat/report`
- `GET /api/enkat/campaigns`
- `POST /api/enkat/remind`

Dessutom finns en schemalagd Netlify-funktion för första utskick:

- `netlify/functions/enkat-send-queue.mts`

Den första versionen har nu följande API-endpoints:

| Endpoint | Metod | Syfte |
|---|---|---|
| `/api/enkat/upload` | `POST` | Parse, validera och förhandsgranska CSV |
| `/api/enkat/send` | `POST` | Skapa kampanj och utskick |
| `/api/enkat/submit` | `POST` | Ta emot patientsvar |
| `/api/enkat/dashboard` | `GET` | Hämta dashboarddata |
| `/api/enkat/report` | `GET` | Hämta rapportdata per period |
| `/api/enkat/remind` | `POST` | Skicka påminnelser till obesvarade |

Ytterligare endpoint som nu finns:

| Endpoint | Metod | Syfte |
|---|---|---|
| `/api/enkat/campaigns` | `GET` | Lista tidigare kampanjer |

Kommentar:

`/api/enkat/campaigns/[id]` finns ännu inte som separat detaljendpoint.

---

## 2. Gemensamma principer

### Autentisering

Alla admin-endpoints under `/api/enkat/**` kräver inloggad användare via samma auth-modell som resten av personalportalen.

Publik endpoint:

- `POST /api/enkat/submit`

ska inte kräva inloggning, men måste validera unik enkätkod strikt.

### Felmodell

Alla endpoints bör returnera JSON i ett konsekvent format:

#### Vid lyckat svar

```json
{
  "success": true,
  "data": {}
}
```

#### Vid fel

```json
{
  "success": false,
  "error": "Felmeddelande",
  "details": {}
}
```

### Loggning

Server-side loggning bör ske för:

- importfel
- utskicksfel
- påminnelsefel
- svar som nekas p.g.a. ogiltig eller använd kod

### Rätt nivå av ansvar

API-lagret ska vara ansvarigt för:

- validering
- maskning av fritext
- behörighetskontroll
- filtrering av vilka resultat en användare får se

Klienten ska inte få råtabeller direkt.

---

## 3. `POST /api/enkat/upload`

### Syfte

Tar emot en CSV/semikolonseparerad fil, parser den och returnerar en förhandsgranskning.

Detta endpoint ska **inte** skicka SMS.

### Input

Rekommenderat:

- `multipart/form-data`

Fält:

| Fält | Typ | Krav | Beskrivning |
|---|---|---|---|
| `file` | fil | Ja | CSV/TSV-export |
| `excludedBookingTypePatterns` | text | Nej | Radseparerad lista med bokningstyper som alltid ska sorteras bort. Om fältet utelämnas används den sparade gemensamma listan från Supabase |
| `selectedBookingTypes` | JSON-sträng | Nej | Lista över vilka bokningstyper i den aktuella filen som ska ingå i previewn. Om fältet utelämnas väljs alla bokningstyper |

### Förväntade kärnkolumner

- `Patient-ID`
- `Mobiltelefon`
- `Vårdgivare`
- `Datum`
- `Bokningstyp`
- `Diagnoser`

Valfria:

- `Starttid`

### Server-side logik

1. verifiera att användaren är inloggad
2. läs fil
3. parse med semikolonstöd
4. validera kolumnrubriker
5. validera varje rad
6. sortera bort rader där `Diagnoser` är tom
7. sortera bort bokningstyper som finns i den sparade listan över "följ aldrig upp"
8. räkna vilka bokningstyper som återstår i den aktuella filen och returnera dem som checkbox-alternativ
9. om `selectedBookingTypes` skickas in ska bara de bokningstyperna gå vidare till preview
10. klassificera kvarvarande bokningstyper
11. deduplicera kvarvarande rader
12. returnera preview

### Response: lyckad preview

```json
{
  "success": true,
  "data": {
    "totalRows": 73,
    "validRows": 68,
    "invalidRows": 3,
    "autoExcludedRows": 11,
    "duplicateRows": 2,
    "autoExcludedGroups": [
      {
        "label": "9. SSK-BESÖK",
        "reason": "Bokningstyp matchade regeln \"ssk\"",
        "count": 5,
        "rowIndexes": [2, 8, 17, 22, 31]
      }
    ],
    "bookingTypeOptions": [
      {
        "bookingTypeRaw": "3. REMISS AXEL",
        "count": 18,
        "selected": true
      }
    ],
    "previewToken": "signed-preview-token",
    "selectedRows": [
      {
        "patientId": "b5kp8fc",
        "phone": "+46707676108",
        "providerName": "Sophie Lantz",
        "visitDate": "2026-02-02",
        "visitStartTime": "08:40",
        "bookingTypeRaw": "3. REMISS AXEL",
        "bookingTypeNormalized": "nybesok_remiss"
      }
    ],
    "duplicates": [
      {
        "patientId": "7bfj0gn",
        "chosenReason": "Nybesok/remiss prioriterad over aterbesok",
        "keptRowIndex": 12,
        "discardedRowIndexes": [33]
      }
    ],
    "errors": [
      {
        "rowIndex": 14,
        "field": "Mobiltelefon",
        "message": "Ogiltigt telefonnummer"
      }
    ]
  }
}
```

### Viktiga regler

- visa *varför* dubblettrad valdes bort
- skriv inte till databasen här
- om `Starttid` finns ska den returneras i preview
- `Bokningstyp` och `Diagnoser` är obligatoriska kolumner i filen
- rader med tom `Bokningstyp` ska markeras som ogiltiga och inte gå vidare till utskick
- rader med tom `Diagnoser` ska auto-bortsorteras, inte bli en felrad
- bokningstyper som finns i listan över "följs aldrig upp" ska inte bli felrader, utan sorteras bort separat
- checkbox-urvalet för bokningstyper ska tillämpas före deduplicering
- deduplicering ska ske efter att auto-exkludering har tillämpats
- lyckad preview ska returnera en signerad `previewToken` som senare krävs av `/api/enkat/send`

---

## 3A. `GET /api/enkat/settings`

### Syfte

Hämtar den gemensamma listan med bokningstyper som aldrig ska följas upp.

### Response

```json
{
  "success": true,
  "data": {
    "excludedBookingTypePatterns": ["ssk", "suturtagning", "telefon"],
    "patternText": "ssk\nsuturtagning\ntelefon",
    "updatedAt": "2026-01-25T20:10:00.000Z",
    "updatedBy": "uuid",
    "usingFallbackDefaults": false
  }
}
```

### Viktiga regler

- om tabellen ännu inte finns ska endpointen kunna falla tillbaka till inbyggda standardvärden
- endpointen får inte exponera rå Supabase-fel till användaren utan begriplig feltext

---

## 3B. `POST /api/enkat/settings`

### Syfte

Sparar den gemensamma listan i Supabase så att samma "följ aldrig upp"-bokningstyper följer med mellan datorer och användare.

### Input

```json
{
  "excludedBookingTypePatterns": "ssk\nsuturtagning\ntelefon\ntel.tid sll\nadmin\nsll-tel"
}
```

### Viktiga regler

- endast administratör får spara den gemensamma listan
- tom lista ska vara tillåten om verksamheten vill stänga av auto-exkludering
- sparad lista ska returneras normaliserad så att UI:t kan uppdatera textarea och återställ-knapp

---

## 4. `POST /api/enkat/send`

### Syfte

Skapar kampanj och utskick baserat på en signerad preview-token från `/api/enkat/upload`.

Denna endpoint ska:

- skapa `enkat_kampanjer`
- skapa `enkat_utskick`
- skapa första loggrader i `enkat_delivery_log`
- antingen trigga direktutskick eller köa utskicken

### Input

```json
{
  "campaignName": "Patientupplevelse vecka 11",
  "smsTemplate": "Hej! Hur nöjd var du med ditt besök hos [VÅRDGIVARE] den [DATUM]?",
  "sendNow": true,
  "scheduledSendAt": null,
  "sendReminder": true,
  "reminderAfterHours": 48,
  "previewToken": "signed-preview-token"
}
```

### Server-side logik

1. verifiera auth
2. validera payload
3. verifiera `previewToken`
4. säkerställ att token tillhör aktuell användare och inte har gått ut
5. beräkna hash av `previewToken`
6. kontrollera om samma preview redan har skapat en kampanj
7. skapa kampanj
8. skapa utskicksrader
9. om temporär kontaktdata används:
   - kryptera telefonnummer
10. skapa `unik_kod`
11. skapa `delivery_log` med `queued`
12. trigga utskick eller background flow

### Response

```json
{
  "success": true,
  "data": {
    "campaignId": "uuid",
    "status": "skickar",
    "totalValid": 68,
    "totalQueued": 68,
    "alreadyCreated": false
  }
}
```

### Viktiga regler

- endpoint ska vara idempotent i praktiken så långt det går
- dubbelklick eller dubbel submit får inte skicka allt två gånger
- om utskick misslyckas delvis ska kampanjen ändå kunna spåras
- klienten ska inte få skicka råa `rows` direkt till endpointen
- `previewToken` ska vara signerad server-side och fungera som kontrakt mellan upload och send
- om samma preview skickas igen kan endpointen returnera befintlig kampanj med `alreadyCreated: true`

---

## 5. `POST /api/enkat/remind`

### Syfte

Skickar påminnelser till utskick som:

- inte har svarat
- inte redan fått påminnelse
- fortfarande är giltiga
- tillhör en kampanj där påminnelse är aktiverad

### Input

```json
{
  "campaignId": "uuid"
}
```

Request body måste vara giltig JSON och innehålla `campaignId`. Annars ska endpointen svara med `400 Bad Request`.

Alternativt senare:

```json
{
  "campaignIds": ["uuid1", "uuid2"]
}
```

### Server-side logik

1. auth-kontroll
2. kontrollera att användaren får köra kampanjen
3. hitta kvalificerade utskick
4. filtrera ut redan svarade
5. skicka påminnelse
6. logga i `enkat_delivery_log`
7. uppdatera `paminnelse_skickad_vid`

### Response

```json
{
  "success": true,
  "data": {
    "campaignId": "uuid",
    "eligible": 21,
    "sent": 19,
    "failed": 2
  }
}
```

### Viktiga regler

- max en påminnelse per utskick
- inget utskick om `svarad_vid` finns
- inget utskick om kod passerat `expires_at`

---

## 6. `POST /api/enkat/submit`

### Syfte

Tar emot svar från patientsidan via unik enkätkod.

### Input

```json
{
  "code": "unik-kod",
  "overallScore": 8,
  "bemotande": 5,
  "information": 4,
  "lyssnadPa": 5,
  "planFramat": 4,
  "commentGood": "Bra bemötande.",
  "commentImprove": "Mer tid för frågor."
}
```

### Server-side logik

1. validera kod (minst 12 tecken)
2. validera poäng: helhetsbetyg 1-10 heltal, delbetyg 1-5 heltal
3. maska personuppgifter i fritext före lagring
   - mejladresser
   - svenska telefonnummer, även formaterade med `+46`, mellanslag eller bindestreck
   - sannolika personnummer efter datum- och Luhn-kontroll
4. anropa en databasfunktion som i samma transaktion:
   - verifierar att koden finns
   - verifierar att den inte är använd
   - verifierar att den inte är utgången
   - markerar utskicket som använt
   - sparar rad i `enkat_svar`
   - ökar `enkat_kampanjer.total_svar`

### Response

```json
{
  "success": true,
  "data": {
    "message": "Ditt svar är registrerat anonymt."
  }
}
```

### Felrespons

```json
{
  "success": false,
  "error": "Länken är ogiltig eller har redan använts."
}
```

Implementerad felmappning i V1:

- `400` om kod eller poäng är ogiltiga
- `404` om koden saknas eller är ogiltig
- `409` om länken redan är använd
- `410` om länken har gått ut
- `500` vid oväntat fel eller databasfel

### Viktiga regler

- endpoint är publik men hårt validerad
- ingen rå patientidentifierare ska returneras
- fritextmaskning sker innan lagring och ska bevara omgivande skiljetecken så att kommentarerna förblir läsbara
- dubbel-submit hanteras atomärt i SQL-funktionen `submit_enkat_response`
- poängintervall valideras server-side innan insert
- `total_svar` ökas i samma databastransaktion som svaret sparas
- regressionstester ska täcka både statusmappning och maskning av realistiska svenska telefonformat

---

## 7. `GET /api/enkat/dashboard`

### Syfte

Returnerar dashboarddata för aktuell användare.

### Behörighetslogik

#### Vårdgivare

Ser endast:

- sina egna resultat
- sina egna kommentarer
- sina egna trender

#### Chef/admin

Ser:

- alla vårdgivare
- jämförelse sida vid sida
- aggregerade totaler

### Query-parametrar

| Parameter | Typ | Beskrivning |
|---|---|---|
| `from` | date | Startdatum |
| `to` | date | Slutdatum |
| `provider` | string | Endast för chef/admin |
| `bookingType` | string | Filter |

### Response för vårdgivare

```json
{
  "success": true,
  "data": {
    "scope": "self",
    "sampleSize": 18,
    "canShowDetails": true,
    "overallAverage": 8.3,
    "subscores": {
      "bemotande": 4.8,
      "information": 4.1,
      "lyssnadPa": 4.6,
      "planFramat": 4.0
    },
    "responseRate": 0.42,
    "reminderResponseRate": 0.11,
    "highScoreShare": 0.56,
    "lowScoreShare": 0.06,
    "latestComments": []
  }
}
```

### Response vid lågt underlag

```json
{
  "success": true,
  "data": {
    "scope": "self",
    "sampleSize": 3,
    "canShowDetails": false,
    "message": "För få svar för att visa resultat på ett integritetssäkert sätt."
  }
}
```

### Viktiga regler

- anonymitetströskel ska tillämpas server-side
- klienten ska inte själv avgöra om data får visas
- chef/admin får ett bredare dataset men ska fortfarande få tydlig sample-size information

---

## 8. `GET /api/enkat/report`

### Syfte

Returnerar rapportdata för periodbaserad uppföljning.

Detta är ett mer sammanfattat format än dashboarden.

### Query-parametrar

| Parameter | Typ | Beskrivning |
|---|---|---|
| `period` | string | `week`, `month`, `quarter` |
| `provider` | string | Valfritt, chef/admin |
| `from` | date | Valfritt |
| `to` | date | Valfritt |

### Response

```json
{
  "success": true,
  "data": {
    "periodLabel": "2026-03",
    "providers": [
      {
        "providerName": "Sophie Lantz",
        "sampleSize": 22,
        "overallAverage": 8.4,
        "responseRate": 0.46,
        "deltaVsPrevious": 0.3
      }
    ],
    "totals": {
      "sent": 112,
      "answered": 48,
      "responseRate": 0.43
    }
  }
}
```

### Viktiga regler

- rapportendpointen ska stödja månadsrapportering
- den ska kunna användas som källa för PDF/CSV-export senare

---

## 9. Roll- och åtkomstkontroll i API-lagret

### Implementerad modell

API-lagret använder `harMinstPortalRoll()` från `src/lib/portal-roles.ts` för att avgöra behörighet. Rollhierarkin:

| Roll | Nivå | Ser |
|---|---|---|
| `personal` | 1 | Egna resultat (kopplat via `profiles.vardgivare_namn`) |
| `admin` | 2 | Alla vårdgivare, alla kampanjer |
| `superadmin` | 3 | Samma som admin + användarhantering |

Alla endpoints som kräver adminbehörighet kontrollerar `harMinstPortalRoll(anvandare.roll, 'admin')`, vilket ger åtkomst för både `admin` och `superadmin`.

### Rekommendation

Exponera aldrig ett “alla resultat”-läge till klienten utan att servern först verifierat att användaren har rätt roll.

---

## 10. Statuskoder

### Rekommenderade HTTP-statuskoder

| Kod | Användning |
|---|---|
| `200` | lyckat GET/POST |
| `201` | resurs skapad |
| `400` | valideringsfel |
| `401` | ej inloggad |
| `403` | saknar behörighet |
| `404` | kampanj/kod saknas |
| `409` | konflikt, t.ex. redan använd kod |
| `410` | resursen är utgången, t.ex. enkätlänk efter `expires_at` |
| `500` | serverfel |

---

## 11. Rekommenderad implementation i API-lagret

### V1-princip

Håll API:erna små och ansvarstydliga.

#### Upload

- bara preview
- ingen databaswrite

#### Send

- skapa kampanj + utskick
- köa eller skicka

#### Submit

- validera kod
- maska fritext
- spara svar

#### Dashboard

- returnera redan filtrerad data beroende på roll

#### Report

- returnera periodsammanfattning

---

## 12. Definition of done för API-lagret

API-lagret är tillräckligt bra för V1 när:

- importpreview fungerar stabilt
- kampanj kan skapas
- SMS kan skickas och loggas
- patient kan svara en gång per kod
- vårdgivare ser bara sina egna resultat
- chef/admin kan se allas resultat sida vid sida
- lågt underlag skyddas av anonymitetströskel
- misslyckade utskick kan spåras

---

## 13. Sammanfattning

API-specen bör stödja tre huvudmål:

1. säker och begriplig import
2. robust och spårbart utskick
3. rollstyrd analys med integritetsskydd

Om denna spec följs kommer nästa steg kunna vara:

- faktisk implementation av Astro API-routes
- konkret UI-spec
- eller direkt arbete med migreringen `009-enkat.sql`
