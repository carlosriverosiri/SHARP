# GDPR och SMS-hantering

> **Dokument:** Dataskyddsdokumentation för SMS-tjänster  
> **Senast uppdaterad:** 2026-01-24  
> **Ansvarig:** Carlos Rivero Siri, verksamhetschef

---

## SMS-leverantör: 46elks

### Företagsinformation
- **Företag:** 46elks AB
- **Tjänst:** SMS API för patientkommunikation
- **Webbplats:** https://46elks.com
- **Kontakt:** 0766 86 10 04

### Bekräftad efterlevnad (2026-01-24)

Följande bekräftades via e-post från 46elks (Adham):

| Krav | Status | Detaljer |
|------|--------|----------|
| LEK 2022:482 | ✅ Bekräftat | 46elks är registrerad telekomoperatör som följer Lag (2022:482) om elektronisk kommunikation |
| Datalagring | ✅ Sverige | Egna servrar i Stockholm, Uppsala och Göteborg |
| Dataskyddspolicy | ✅ Dokumenterad | https://46elks.com/data-protection |

---

## Vår datahantering

### Vilken data skickas till 46elks?

| Data | Syfte | Lagringstid hos 46elks |
|------|-------|------------------------|
| Telefonnummer | Leverera SMS | Enligt deras policy |
| SMS-innehåll | Meddelandetext | Enligt deras policy |

### Vilken data lagrar vi själva?

| Data | Lagring | Skydd |
|------|---------|-------|
| Telefonnummer | Supabase (krypterat) | AES-256 kryptering |
| Telefon-hash | Supabase | SHA-256 för dubblettdetektering |
| Patientnamn | Supabase | RLS-skyddad |
| SMS-status | Supabase | Skickad/Besvarad/etc |

---

## Rättslig grund för behandling

### Berättigat intresse (Artikel 6.1.f GDPR)

SMS-utskick för kort varsel-bokning baseras på:

1. **Patientens intresse:** Möjlighet att få tidigare operationstid
2. **Klinikens intresse:** Effektivt utnyttjande av OP-kapacitet
3. **Samhällsintresse:** Kortare vårdköer

### Samtycke

- Patienter kan när som helst avregistrera sig genom att svara **STOPP**
- Samtycke registreras i patientpoolen
- Opt-out respekteras omedelbart

---

## Tekniska skyddsåtgärder

### Kryptering
```
Telefonnummer i vila:  AES-256 (ENCRYPTION_KEY i .env)
Telefonnummer i transit: HTTPS/TLS till 46elks API
Databaskommunikation:   TLS till Supabase
```

### Åtkomstkontroll
- Endast inloggad personal kan se patientdata
- Supabase Row Level Security (RLS) aktiverat
- Inga telefonnummer visas i klartext i UI

### Loggning
- SMS-utskick loggas med tidsstämpel
- Svar loggas för spårbarhet
- Ingen känslig data i serverloggar

---

## Patienträttigheter

| Rättighet | Hur vi uppfyller |
|-----------|------------------|
| Rätt till information | Info på hemsidan om SMS-systemet |
| Rätt till tillgång | Patient kan begära registerutdrag |
| Rätt till radering | Svara STOPP eller kontakta kliniken |
| Rätt till invändning | Samtycke kan återkallas när som helst |

---

## Myndighetskontakt

### IMY - Integritetsskyddsmyndigheten

**Status:** Väntar på svar (skickat 2026-01-24)

Vi har begärt vägledning från IMY gällande:

1. **Patientdatalagen vs GDPR** - Eftersom systemet är fristående från journalsystemet och data skrivs in manuellt, omfattas det av PDL eller endast GDPR?
2. **EU-molntjänster** - Är det tillåtet att använda molntjänst inom EU (Frankfurt) för notifieringsdata?
3. **Ytterligare rekommendationer**

#### Skickad förfrågan till IMY

```
Till: dso@imy.se
Datum: 2026-01-24
Ämne: Vägledning - fristående SMS-notifiering för avbokade operationstider

Hej,

Jag driver en privat ortopedisk specialistklinik och har utvecklat ett 
internt notifieringssystem för att informera patienter om lediga 
operationstider. Jag vill säkerställa att lösningen följer gällande 
lagstiftning och ber om vägledning.

BAKGRUND
När patienter avbokar operationer vill vi kunna informera andra patienter 
på väntelistan om att en tid blivit ledig.

Viktiga avgränsningar:
- Systemet är helt fristående från vårt journalsystem
- Ingen teknisk koppling eller automatisk dataöverföring
- All patientdata skrivs in manuellt av personal
- Detta är inte ett bokningssystem och inte ett tvåvägs-SMS-system

Flödet är:
1. Personal skriver manuellt in patientuppgifter
2. Systemet skickar ett informations-SMS (envägskommunikation)
3. Patienten klickar på en länk och markerar intresse via webbsida
4. Personal kontaktar patienten per telefon för att slutföra bokning

Ingen aktiv SMS-dialog sker mellan patient och system.
All medicinsk dokumentation och tidsbokning sker uteslutande i det 
fristående journalsystemet.

TEKNISK LÖSNING
- Databas: Supabase (servrar i Frankfurt, EU)
- SMS-leverantör: 46elks (svensk operatör, reglerad av LEK)
- Webbhotell: Netlify (EU)

Data som lagras:
- Patientnamn
- Telefonnummer (krypterat med AES-256)
- Prioritetsgrupp (1, 2 eller 3 - inga medicinska detaljer)
- Svarsstatus (intresserad/ej intresserad)

Data raderas automatiskt efter 30 dagar. Personnummer lagras inte.

Säkerhetsåtgärder:
- Kryptering i vila och under transport
- Row Level Security på databasnivå
- Endast behörig personal har åtkomst
- Loggning av alla åtkomster
- Personuppgiftsbiträdesavtal (DPA) med Supabase

SAMTYCKE
SMS skickas endast till patienter som aktivt samtyckt till att kontaktas 
vid lediga operationstider. Samtycket inhämtas via vår digitala 
hälsodeklaration. Patienten kan avregistrera sig via länk i SMS:et.

MINA FRÅGOR
1. Eftersom systemet är helt fristående från journalsystemet, data skrivs 
   in manuellt, och ingen medicinsk information hanteras - omfattas det 
   av Patientdatalagen, eller endast av GDPR?
2. Är det tillåtet att använda en molntjänst inom EU (Frankfurt) för 
   denna typ av notifieringsdata?
3. Finns det ytterligare åtgärder ni rekommenderar?

Jag uppskattar all vägledning ni kan ge.

Med Vänlig Hälsning
Carlos Rivero Siri, verksamhetschef
Södermalms Ortopedi / Siri Stockholm AB
```

#### Svar från IMY

*Väntar på svar - uppdateras när svar inkommer*

---

## Bilagor

### E-postbekräftelse från 46elks

```
Från: Adham, 46elks
Datum: 2026-01-24
Ämne: Re: GDPR-frågor

Hej Carlos,

Kul och välkommen! 

1. Bekräftelse att ni regleras av LEK 2022:482/ePrivacy
Svar: Vi bekräftar att 46elks är en registrerad telekomoperatör som 
följer den svenska Lag (2022:482) om elektronisk kommunikation (LEK).

2. Information om var SMS-data lagras geografiskt
Svar: Vi driftar och äger våra egna servar i Sverige. Servrarna samt 
SMS-data lagras i Stockholm, Uppsala samt Göteborg. 

3. Er dataskyddspolicy/data protection policy
Svar: Jag hänvisar dig till https://46elks.com/data-protection som 
är vår data protection policy. 

Har du några andra frågor eller funderingar är det bara att skriva 
här eller ringa på 0766 86 10 04.

Trevlig helg! 

Hälsningar,
Adham
46elks
```

---

## Länkar

- [46elks Data Protection Policy](https://46elks.com/data-protection)
- [Lag (2022:482) om elektronisk kommunikation](https://www.riksdagen.se/sv/dokument-lagar/dokument/svensk-forfattningssamling/lag-2022482-om-elektronisk-kommunikation_sfs-2022-482)
- [GDPR (EU 2016/679)](https://eur-lex.europa.eu/legal-content/SV/TXT/?uri=CELEX%3A32016R0679)
- [IMY - Integritetsskyddsmyndigheten](https://www.imy.se/)

---

*Detta dokument är en del av Södermalms Ortopedis GDPR-dokumentation.*
