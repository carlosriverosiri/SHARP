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

## Ekonomisk bakgrund: Marginalintäktens kraft

### Samuelson och marginalekonomi

Paul Samuelson, Nobelpristagare i ekonomi 1970, formaliserade i sin klassiska lärobok *Economics* (1948) principerna för **marginalanalys** - hur företag maximerar vinst genom att analysera kostnaden och intäkten för varje ytterligare enhet.

Kärninsikten: **När fasta kostnader redan är täckta, genererar ytterligare försäljning exceptionellt hög vinstmarginal.**

### Tillämpning på operationsverksamhet

En operationssal har stora **fasta kostnader** som måste betalas oavsett beläggning:

| Kostnad | Typ | Betalas oavsett om salen används |
|---------|-----|----------------------------------|
| Personal (anestesi, op-ssk, undersköterska) | Fast | ✅ Ja |
| Lokalhyra | Fast | ✅ Ja |
| Utrustning, avskrivningar | Fast | ✅ Ja |
| Försäkringar, administration | Fast | ✅ Ja |

När dessa kostnader redan är täckta av planerade operationer, blir **marginalkostnaden** för en extra operation mycket låg:

| Kostnad | Typ | Ungefärlig andel av intäkt |
|---------|-----|----------------------------|
| Förbrukningsmaterial (suturer, implantat) | Rörlig | ~10-20% |
| Läkemedel | Rörlig | ~5-10% |
| Städning | Rörlig | ~1-2% |
| **Totalt rörlig kostnad** | | **~15-30%** |

### Konsekvens: Extremt hög vinstmarginal

> *"En obesatt operationstid som fylls via kort varsel kan generera **50-70% ren vinstmarginal** eftersom de fasta kostnaderna redan är täckta av det ordinarie schemat."*

**Räkneexempel:**
```
Intäkt för en knäartroskopi:        25 000 kr
- Rörliga kostnader (material):     - 5 000 kr
= Täckningsbidrag:                  20 000 kr (80%)

Om salen annars stått tom:
- Förlorad intäkt:                  25 000 kr
- Sparade rörliga kostnader:        + 5 000 kr
= Förlorat täckningsbidrag:         20 000 kr
```

### Varför detta motiverar systemet

1. **ROI på minuter:** Ett SMS-utskick kostar ~0.50 kr och tar 30 sekunder att initiera. Potentiell vinst: 20 000 kr.

2. **Varje fylld tid räknas:** Till skillnad från "vanliga" patienter där marginalerna är lägre, ger kort varsel-patienter nästan maximal vinst.

3. **Dubbel effekt:** Förutom direkt vinst kortas kön, vilket förbättrar patientnöjdhet och minskar risk för komplikationer av fördröjd vård.

### Sammanfattning

Samuelson visade att rationella företag fokuserar på marginalen - där varje ytterligare enhet ger högst avkastning. För en operationsklinik är **den obesatta tiden som fylls via kort varsel** exakt en sådan marginalenhet: låg kostnad, hög intäkt, maximal vinst.

Detta gör ett välfungerande kort varsel-system till en av de mest lönsamma investeringarna en klinik kan göra.

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
