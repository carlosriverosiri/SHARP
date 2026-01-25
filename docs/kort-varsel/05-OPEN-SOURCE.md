# Open Source-plan: Kort varsel-SMS

> **Status:** Planering  
> **Målgrupp:** Ortopedkliniker, dagkirurgi, andra vårdgivare med schemalagda ingrepp  
> **Problemet vi löser:** Fylla luckor i operationsschemat med minimal administration

---

## Bakgrund

Alla ortopedkliniker har samma problem: patienter avbokar, och tomma OP-tider kostar pengar och förlänger köer. Detta system automatiserar processen att hitta ersättare via SMS.

### Varför open source?

- Löser ett universellt problem inom vården
- Ingen kommersiell produkt gör detta bra idag
- Kan anpassas till lokala behov (språk, prioriteringslogik, SMS-leverantör)
- Bygger goodwill och kan leda till samarbeten

---

## Kärnfunktioner att inkludera

### Måste ha (MVP)
- [ ] Patientpool med prioriteringssystem
- [ ] SMS-utskick med gradvis eskalering
- [ ] Svarshantering (JA/NEJ/STOPP)
- [ ] Kampanjhantering (skapa, avsluta, historik)
- [ ] Grundläggande statistik

### Trevligt att ha
- [ ] Operationsstorlek (liten/stor)
- [ ] Sida (HÖ/VÄ) med prioritering
- [ ] Pensionärsprioritering (flexibla tider)
- [ ] Flera läkare per patient
- [ ] Schemalagda utskick

### Kan utelämnas (klinikspecifikt)
- Specifika operationstyper
- Integration med journalsystem
- Avancerad rapportering

---

## Teknisk arkitektur

### Stack
```
Frontend:    Astro (SSR)
Backend:     Astro API routes + Supabase
Databas:     PostgreSQL (via Supabase)
SMS:         46elks (eller konfigurerbar)
Hosting:     Netlify / Vercel
```

### Miljövariabler som behövs
```env
# Databas
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# SMS (46elks eller annan leverantör)
SMS_PROVIDER=46elks          # 46elks | twilio | mock
ELKS_API_USER=
ELKS_API_PASSWORD=

# Kryptering
ENCRYPTION_KEY=              # 32 tecken för AES-256

# Klinikinfo (konfigurerbar)
CLINIC_NAME="Min Klinik"
SMS_SENDER_NAME="MinKlinik"  # Max 11 tecken
```

---

## Förenklingar för open source

### 1. Demo-läge
```typescript
// Om SMS_PROVIDER=mock, logga istället för att skicka
if (process.env.SMS_PROVIDER === 'mock') {
  console.log(`[DEMO] SMS till ${telefon}: ${meddelande}`);
  return { success: true, demo: true };
}
```

### 2. Seed-data
```sql
-- demo-data.sql
INSERT INTO kort_varsel_patienter (namn, telefon_hash, ...) VALUES
  ('Demo Patient 1', 'xxx', ...),
  ('Demo Patient 2', 'xxx', ...);
```

### 3. One-click deploy
- Netlify Deploy-knapp i README
- Supabase-projekt med färdiga migrations
- Steg-för-steg guide med skärmdumpar

---

## Dokumentation som behövs

```
/docs/
  README.md                 # Översikt + snabbstart
  INSTALLATION.md           # Detaljerad setup-guide
  SUPABASE-SETUP.md         # Skapa projekt, köra migrations
  SMS-PROVIDERS.md          # Konfigurera 46elks/Twilio/etc
  DEPLOYMENT.md             # Netlify/Vercel deployment
  CUSTOMIZATION.md          # Ändra texter, prioriteringslogik
  GDPR.md                   # Dataskydd och kryptering
  CONTRIBUTING.md           # Hur man bidrar
```

---

## Vad som behöver anonymiseras/generaliseras

| Nuvarande | Open source |
|-----------|-------------|
| "Södermalms Ortopedi" | `${CLINIC_NAME}` |
| Specifika läkarnamn | Konfigurerbar lista |
| Svenska texter | i18n-redo (sv som default) |
| 46elks | Abstrakt SMS-interface |

---

## Licensval

**Rekommendation: MIT eller Apache 2.0**

- Tillåter kommersiell användning
- Kräver inte att ändringar delas
- Enkelt för sjukhus/kliniker att använda

---

## Roadmap

### Fas 1: Stabilisera (nu)
- [x] Kärnfunktionalitet klar
- [ ] Testa i produktion
- [ ] Fixa buggar som upptäcks
- [ ] Dokumentera kända begränsningar

### Fas 2: Förbereda (senare)
- [ ] Extrahera till eget repo
- [ ] Ta bort klinikspecifik kod
- [ ] Skapa demo-läge
- [ ] Skriva dokumentation

### Fas 3: Publicera
- [ ] Skapa GitHub-repo
- [ ] Deploy-knapp i README
- [ ] Skriv blogginlägg / LinkedIn
- [ ] Kontakta ortopedföreningar?

---

## Potentiella samarbetspartners

- Sveriges Ortopedingenjörers Förening
- Privata vårdgivare (Capio, Aleris, etc.)
- Regioner med köproblem
- Nordiska motsvarigheter

---

## Risker och utmaningar

| Risk | Mitigation |
|------|------------|
| GDPR-oro | Tydlig dokumentation om kryptering |
| Teknisk komplexitet | Bra installationsguide |
| Support-börda | FAQ + GitHub Discussions |
| Ingen använder det | Marknadsför via rätt kanaler |

---

## Nästa konkreta steg

1. **Kortsiktigt:** Fortsätt utveckla och testa i produktion
2. **Mellanterm:** Skriv ner alla konfigurationer som behövs
3. **Långsiktigt:** Extrahera, dokumentera, publicera

---

*Senast uppdaterad: 2026-01-24*
