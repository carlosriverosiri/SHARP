# Kort Varsel App - Kommersiell Projektplan

> "Framtidens vårdadministration byggs inte av programmerare - den byggs av vårdpersonal med AI som verktyg."

---

## Executive Summary

**Kort Varsel** är en SMS-baserad tjänst för att snabbt fylla avbokade operationstider. Det som började som en intern funktion för Södermalms Ortopedi har potential att bli:

1. **En fristående SaaS-produkt** för privata vårdgivare
2. **En första byggsten** för ett framtida AI-drivet patienthanteringssystem
3. **Ett proof-of-concept** för hur vården kan bygga egna digitala verktyg utan traditionell IT-avdelning

---

## Vision

### Kortsiktig (2024-2025)
En enkel, effektiv tjänst som löser ETT problem riktigt bra: **Fyll avbokade tider snabbt.**

### Medellång (2025-2027)
En patientpool-plattform som hanterar:
- Kort varsel-bokningar
- Väntelistor
- Patient-kommunikation (SMS/e-post)
- Grundläggande patientregister (GDPR-säkert)

### Långsiktig (2027+)
Grunden för ett **AI-native journalsystem** - ett system där AI inte är ett tillägg utan kärnan i hur systemet fungerar och utvecklas.

---

## Problemet vi löser

### För vårdgivaren
| Problem | Kostnad |
|---------|---------|
| Avbokad operation = tom sal | 15 000 - 50 000 kr/timme i förlorad intäkt |
| Manuell ringning tar tid | 30-60 min personalarbete |
| Svårt nå patienter dagtid | Missade samtal, telefonsvarare |
| Ingen överblick över "alertta" patienter | Börjar om från början varje gång |

### För patienten
- Vill ofta få operation snabbare
- Svårt att svara på samtal under arbetstid
- Uppskattar SMS - kan svara när det passar

---

## Ekonomin: Varför marginalen är magisk

### Samuelson och marginalanalys

Paul Samuelson, Nobelpristagare i ekonomi 1970, formaliserade i *Economics* principen att **vinsten maximeras på marginalen** - de sista enheterna ett företag producerar har ofta högst vinstmarginal eftersom fasta kostnader redan är täckta.

### Tillämpning: Den obesatta OP-tiden

En kirurgklinik har enorma fasta kostnader som måste betalas oavsett beläggning:

| Fast kostnad | Betalas oavsett om salen används |
|--------------|----------------------------------|
| Personal (anestesi, op-ssk) | ✅ Ja |
| Lokal, utrustning | ✅ Ja |
| Administration | ✅ Ja |

När en patient avbokar och tiden förblir tom **förlorar kliniken hela intäkten men sparar nästan ingenting**. De rörliga kostnaderna (material, förbrukning) är bara 15-30% av intäkten.

### Konsekvens: Extrem lönsamhet

> **En obesatt tid som fylls via kort varsel kan generera 50-70% ren vinstmarginal.**

| | Tom tid | Fylld via kort varsel |
|-|---------|----------------------|
| Intäkt | 0 kr | 25 000 kr |
| Rörliga kostnader | 0 kr | -5 000 kr |
| **Täckningsbidrag** | **0 kr** | **20 000 kr** |

### ROI för systemet

| Investering | Kostnad |
|-------------|---------|
| Supabase (databas) | ~100 kr/mån |
| 46elks (SMS) | ~0.50 kr/SMS |
| Utvecklingstid | Engångskostnad |

| Avkastning | Värde |
|------------|-------|
| 1 fylld tid/vecka | ~80 000 kr/mån i täckningsbidrag |
| 2 fyllda tider/vecka | ~160 000 kr/mån |

**Payback-tid: < 1 dag.**

---

## Produkten: Kort Varsel App

### Kärnfunktioner (v1.0 - Klar!)

✅ **Patientpool**
- Lägg till patienter manuellt (namn, telefon, samtycke)
- Kryptering av telefonnummer (GDPR)
- Auto-radering efter 7 dagar
- Status-spårning: tillgänglig → kontaktad → bokad/nej

✅ **SMS-kampanjer**
- Skapa kampanj för specifikt datum
- Välj antal platser (1-3)
- "Först till kvarn"-logik
- Atomär hantering (inga dubbelbokning)

✅ **Patient-svarssida**
- Mobilvänlig länk i SMS
- JA/NEJ med ett klick
- Preop-bekräftelse inbyggd
- Reserv-hantering

✅ **Personal-notifikationer**
- SMS till vald personal vid JA-svar
- Dashboard för kampanjöversikt

### Planerade funktioner (v2.0)

🔲 **Förbättrad patientpool**
- Läkarfiltrering (vilka patienter passar vilken kirurg)
- Flexibel-markering (kan ta annan läkare)
- Prioritetskö (reserv-patienter först)
- Anteckningar per patient

🔲 **Intelligent utskick**
- Automatisk batchning (skicka till 3, vänta, skicka till nästa 3)
- Tidsbaserad eskalering
- Smart ordning baserat på historik

🔲 **Statistik & Insikter**
- Fyllnadsgrad per kampanj
- Svarstider
- "Alertta" patienter (svarar snabbt)
- Ekonomisk impact

🔲 **Multi-klinik**
- Separata konton per klinik
- Delad patientpool (opt-in)
- Admin-dashboard

---

## Personalportalen som kortlek (framtid)

> Personalportalen ses som en rad små kort som tillsammans skapar stor nytta.

### Servicekort att lägga till

🔲 **FASS-API (biverkningar)**
- Snabb sökning på läkemedel
- Fokus på biverkningar och varningsflaggor
- Ingen dosering i detta kort (endast säkerhetsinfo)

🔲 **Pendeltåg i realtid (Trafiklab)**
- Real Time API för avgångar, störningar och positioner
- Begränsat till **Södra Station** (snabb översikt på väg hem)
- Möjlighet att trigga SMS vid större störningar

🔲 **Parkerings-API (servicenätter)**
- Visar senaste servicenatt i närområdet
- Hjälper personal som kör bil att hitta parkering
- Begränsat till gator runt kliniken

---

## Teknisk Arkitektur

### Nuvarande stack (beprövad, enkel, skalbar)

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  Astro (SSR) + Tailwind CSS                         │
│  Hostad på Netlify (CDN, auto-deploy)               │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                    BACKEND                           │
│  Astro API Routes (serverless)                      │
│  Netlify Functions                                  │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                   DATABASE                           │
│  Supabase (PostgreSQL)                              │
│  - Row Level Security                               │
│  - Real-time subscriptions                          │
│  - Edge Functions                                   │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                  INTEGRATIONER                       │
│  46elks - SMS                                       │
│  (Framtid: BankID, Swish, e-signering)             │
└─────────────────────────────────────────────────────┘
```

### Varför denna stack?

| Egenskap | Fördel |
|----------|--------|
| **Serverless** | Ingen server att underhålla, skalar automatiskt |
| **Supabase** | Postgres-kraft med Firebase-enkelhet |
| **Astro** | Snabbt, SEO-vänligt, flexibelt |
| **Netlify** | Git-push = deploy, gratis SSL, global CDN |
| **46elks** | Svensk SMS-leverantör, GDPR-compliant |

### Framtida utbyggnad

```
                    ┌──────────────────┐
                    │   AI-LAGER       │
                    │  (Claude/GPT)    │
                    │                  │
                    │  • Prioritering  │
                    │  • Textförslag   │
                    │  • Analys        │
                    └────────┬─────────┘
                             │
       ┌─────────────────────┼─────────────────────┐
       │                     │                     │
       ▼                     ▼                     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ KORT VARSEL │     │ VÄNTELISTA  │     │  BOKNING    │
│   (KLAR)    │     │  (NÄSTA)    │     │  (FRAMTID)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ PATIENTREGISTER  │
                    │  (Grunddata)     │
                    └──────────────────┘
```

---

## AI-Strategin: Varför detta är annorlunda

### Traditionell vårdIT
```
Behov → Upphandling → Leverantör → 2 år implementation → 
Driftavtal → Ändringsförfrågan → 6 mån väntetid → Frustration
```

### AI-Native utveckling
```
Behov → Beskriv för AI → Prototyp på 1 dag → Test → 
Iteration → Produktion på 1 vecka → Ändring? Samma dag.
```

### Konkreta exempel från detta projekt

| Funktion | Traditionell tid | Med AI |
|----------|------------------|--------|
| SMS-integration | 2-4 veckor | 2 timmar |
| Databas-schema | 1 vecka | 30 minuter |
| Svars-UI | 1-2 veckor | 3 timmar |
| Buggfix | Beroende på leverantör | 10 minuter |

### Implikationen

**Du behöver inte anställa programmerare.**

Du behöver:
1. En person som förstår verksamheten (du)
2. AI som skriver koden (Claude, GPT, etc.)
3. Grundläggande infrastruktur (Supabase, Netlify)
4. Eventuellt: En teknisk rådgivare några timmar/månad

---

## Affärsmodell

### Alternativ 1: Intern användning
- Ingen extern försäljning
- Kostnad: ~500 kr/mån (Supabase + SMS)
- Värde: Ökad fyllnadsgrad, minskad admin

### Alternativ 2: SaaS för kollegor
**Prissättning per månad:**

| Plan | Pris | Innehåll |
|------|------|----------|
| **Starter** | 990 kr | 1 klinik, 100 SMS/mån, 1 användare |
| **Professional** | 2 490 kr | 1 klinik, 500 SMS/mån, 5 användare |
| **Enterprise** | 4 990 kr | Multi-klinik, obegränsat SMS, API |

**Potentiella kunder:**
- Privata ortopedkliniker (50+ i Sverige)
- Dagkirurgi-enheter
- Ögonkliniker
- Tandvård (större kedjor)
- Veterinärkliniker

### Alternativ 3: White-label / Licensiering
- Sälj tekniken till journalsystem-leverantörer
- De integrerar i sin produkt
- Engångsavgift + royalty

---

## Utvecklingsfaser

### Fas 1: Stabilisering (Nu - Q1 2024)
**Mål:** Robust intern användning

- [ ] Testa alla scenarier (flera platser, reserv, timeout)
- [ ] Fixa DNS för sodermalmsortopedi.se
- [ ] Förbättra felhantering
- [ ] Dokumentation för personal
- [ ] Backup-rutiner

**Kostnad:** 0 kr (egen tid)
**Tid:** 2-4 veckor

### Fas 2: Patientpool 2.0 (Q2 2024)
**Mål:** Fullständig patientpool-hantering

- [ ] Import från Excel/CSV
- [ ] Sök och filtrera
- [ ] Bulk-operationer
- [ ] Historik per patient
- [ ] Läkar-koppling fullt ut

**Kostnad:** 0 kr (egen tid med AI)
**Tid:** 4-6 veckor

### Fas 3: Multi-användare (Q3 2024)
**Mål:** Redo för flera kliniker

- [ ] Användarhantering (roller)
- [ ] Klinik-separering
- [ ] Audit-logg
- [ ] Onboarding-flöde

**Kostnad:** ~5 000 kr (eventuell extern granskning)
**Tid:** 6-8 veckor

### Fas 4: Kommersialisering (Q4 2024)
**Mål:** Första externa kund

- [ ] Marknadsföringssida
- [ ] Betalningsintegration (Stripe)
- [ ] Support-system
- [ ] Juridisk granskning (användarvillkor, GDPR)

**Kostnad:** 10 000 - 20 000 kr
**Tid:** 8-12 veckor

---

## Risker och mitigation

| Risk | Sannolikhet | Impact | Mitigation |
|------|-------------|--------|------------|
| GDPR-incident | Låg | Hög | Kryptering, auto-radering, audit-logg |
| SMS-leverantör ändrar villkor | Låg | Medel | Abstraktion, alternativ leverantör |
| Supabase-avbrott | Låg | Hög | Backup-rutiner, möjlighet byta databas |
| Konkurrent kopierar | Medel | Låg | First-mover, nischfokus, relationer |
| AI-utveckling stannar | Mycket låg | Medel | Koden finns, kan underhållas traditionellt |

---

## Slutsats

### Det unika med detta projekt

1. **Byggt av domänexpert** - Du förstår problemet på djupet
2. **AI-native från start** - Inte legacy att dra med
3. **Minimalt beroende** - Ingen leverantör som kan hålla dig gisslan
4. **Skalbart men enkelt** - Börjar smått, kan växa

### Rekommendation

**Fortsätt bygga internt.** Använd det. Förfina det. När det fungerar felfritt för dig:

1. Visa för kollegor informellt
2. Mät intresse
3. Besluta om kommersialisering

**Du sitter på något värdefullt** - inte bara produkten, utan *processen*. 

Att en 65-årig kirurg kan bygga en fungerande SMS-tjänst på några dagar med AI är ett bevis på vart vi är på väg. Det är en story som säljer - inte bara produkten, utan visionen.

---

## Nästa steg

1. ✅ Testa systemet ordentligt internt (pågår)
2. ⬜ Dokumentera användning för personal
3. ⬜ Samla feedback efter 10 kampanjer
4. ⬜ Besluta om nästa fas

---

*Dokument skapat: 2024-01-23*
*Författare: AI (Claude) i samarbete med Carlos*
