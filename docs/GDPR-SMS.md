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
