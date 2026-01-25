# Specifikation: Prediktioner för Kort varsel-SMS

> **Status:** Koncept / Framtida utveckling  
> **Beroenden:** Minst 200-500 utskick för tillförlitliga prediktioner  
> **Senast uppdaterad:** 2026-01-24

---

## 1. Övergripande vision

### Problemet vi löser

Idag startar personalen ett utskick och hoppas att någon svarar JA. De vet inte:
- Hur många SMS som troligen behövs för att fylla tiden
- Om de borde vänta till imorgon för bättre chanser
- Vilka patienter som har störst chans att tacka ja

### Lösningen

Ett prediktionssystem som **innan utskicket startas** kan säga:

> *"Baserat på historisk data: För att fylla denna tid med **90% säkerhet** behöver du kontakta **5 patienter**. Med nuvarande patientpool (3 AKUT, 2 Sjukskrivna) uppskattar vi **85% chans** att fylla tiden."*

---

## 2. Grundläggande matematik

### 2.1 JA-sannolikhet per kategori

Från historisk data kan vi beräkna:

| Kategori | JA-rate (av svar) | Svarsfrekvens | **Effektiv JA-rate** |
|----------|-------------------|---------------|----------------------|
| AKUT | 75% | 80% | **60%** |
| Sjukskriven | 65% | 70% | **45.5%** |
| Mycket ont | 55% | 65% | **35.75%** |
| Normal | 40% | 50% | **20%** |

**Effektiv JA-rate** = JA-rate × Svarsfrekvens

### 2.2 Sannolikhet att få minst ett JA

Om vi skickar till N patienter med individuella JA-sannolikheter p₁, p₂, ..., pₙ:

```
P(minst ett JA) = 1 - (1-p₁)(1-p₂)...(1-pₙ)
```

**Exempel:**
- Patient 1: AKUT (60% chans) → (1-0.60) = 0.40
- Patient 2: Sjukskriven (45.5%) → (1-0.455) = 0.545
- Patient 3: Normal (20%) → (1-0.20) = 0.80

```
P(minst ett JA) = 1 - (0.40 × 0.545 × 0.80) = 1 - 0.1744 = 82.56%
```

### 2.3 Hur många SMS för X% säkerhet?

**Formel för homogen grupp (samma kategori):**
```
N = ln(1 - målsannolikhet) / ln(1 - effektiv_ja_rate)
```

**Exempel: 90% säkerhet med Normal-patienter (20% JA-rate):**
```
N = ln(1 - 0.90) / ln(1 - 0.20) = ln(0.10) / ln(0.80) = -2.303 / -0.223 ≈ 10.3
```
→ **11 SMS behövs**

**Samma beräkning med AKUT-patienter (60% JA-rate):**
```
N = ln(0.10) / ln(0.40) = -2.303 / -0.916 ≈ 2.5
```
→ **3 SMS behövs**

---

## 3. Prediktionsmodell

### 3.1 Inputdata

För varje utskick samlar vi:

```typescript
interface PrediktionInput {
  // Patientpool
  patienter: {
    kategori: 'AKUT' | 'Sjukskriven' | 'Mycket ont' | 'Normal';
    opStorlek: 'liten' | 'stor';
    sida: 'höger' | 'vänster' | null;
    dagarTillPlaneradOp: number;
  }[];
  
  // Utskicksparametrar
  dagarTillUtskickDatum: number;
  tidPaDagen: number; // timme (8-18)
  lakare: string;
  onskatSida: 'höger' | 'vänster' | null;
}
```

### 3.2 Outputdata

```typescript
interface PrediktionOutput {
  // Huvudprediktion
  chansAttFylla: number; // 0-100%
  antalSmsForMal: {
    mal90: number; // SMS för 90% säkerhet
    mal95: number; // SMS för 95% säkerhet
    mal99: number; // SMS för 99% säkerhet
  };
  
  // Tidsuppskattning
  forvantatTidTillFylld: {
    minuter: number;
    konfidensintervall: [number, number]; // [min, max]
  };
  
  // Rekommendationer
  rekommendationer: string[];
  
  // Patientranking
  patientRanking: {
    patientIndex: number;
    jaSannolikhet: number;
    bidragTillMal: number; // Hur mycket ökar chansen?
  }[];
}
```

### 3.3 Viktade faktorer

Utöver kategori påverkar flera faktorer JA-sannolikheten:

| Faktor | Påverkan på JA-rate | Källa |
|--------|---------------------|-------|
| Tid på dagen | ±15% | Historisk data |
| Veckodag | ±10% | Historisk data |
| Dagar till planerad op | ±20% | Korrelationsanalys |
| Matchande sida | +10% | Hypotes (behöver valideras) |
| Matchande läkare | +5% | Hypotes |

**Justerad sannolikhet:**
```
p_justerad = p_bas × faktor_tid × faktor_veckodag × faktor_vantetid × ...
```

---

## 4. Användargränssnitt

### 4.1 Innan utskicksstart

När användaren fyller i utskicksformuläret visas en prediktionspanel:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔮 PREDIKTION                                                  │
│                                                                 │
│  Med nuvarande urval (12 patienter):                           │
│                                                                 │
│  ┌───────────────────────────────────────┐                     │
│  │  ████████████████████░░░░  82%        │  Chans att fylla    │
│  └───────────────────────────────────────┘                     │
│                                                                 │
│  📊 För att nå 90% säkerhet:                                   │
│     • Behöver kontakta: 5 patienter                            │
│     • Du har: 12 matchande (tillräckligt ✅)                    │
│                                                                 │
│  ⏱️ Uppskattad tid till fylld:                                 │
│     • ~45 minuter (30-75 min)                                  │
│                                                                 │
│  💡 Rekommendationer:                                          │
│     • Starta före kl 14 för bäst svarsfrekvens                │
│     • 3 AKUT-patienter finns - hög chans att fylla snabbt     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Patientranking

Visa en rankad lista med bidrag till målet:

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 OPTIMAL ORDNING                                             │
│                                                                 │
│  #  Patient       Kategori     JA-chans   Kumulativ chans     │
│  ─────────────────────────────────────────────────────────────  │
│  1  Anna S.       🚨 AKUT       58%        58%                 │
│  2  Erik L.       📋 Sjukskr.   42%        76%                 │
│  3  Maria K.      🚨 AKUT       55%        89%                 │
│  4  Johan B.      🔥 Ont        33%        93% ← 90% uppnått   │
│  5  Lisa A.       ⏰ Normal     18%        94%                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ℹ️ Med 4 patienter når du 93% chans att fylla tiden.         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Dashboard-widget

På översiktssidan, en snabb indikator:

```
┌─────────────────────────────────────┐
│  Senaste 30 dagarna                 │
│                                     │
│  🎯 Prediktionsnoggrannhet: 87%     │
│     (Systemet förutsåg rätt i 87%   │
│      av fallen)                     │
│                                     │
│  📈 Trend: Förbättras (+3%)         │
└─────────────────────────────────────┘
```

---

## 5. Teknisk implementation

### 5.1 Databasändringar

```sql
-- Tabell för att lagra prediktioner (för validering)
CREATE TABLE sms_prediktioner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kampanj_id UUID REFERENCES sms_kampanjer(id),
  
  -- Prediktion vid start
  prediktion_chans DECIMAL(5,2),      -- Förutsagd chans (0-100)
  prediktion_antal_sms INTEGER,       -- Förväntat antal SMS
  prediktion_tid_minuter INTEGER,     -- Förväntad tid
  
  -- Utfall (fylls i när utskicket avslutas)
  faktiskt_antal_sms INTEGER,
  faktisk_tid_minuter INTEGER,
  kampanj_fylld BOOLEAN,
  
  -- Metadata
  skapad_vid TIMESTAMPTZ DEFAULT NOW()
);

-- Index för analys
CREATE INDEX idx_prediktioner_kampanj ON sms_prediktioner(kampanj_id);
```

### 5.2 API-endpoint

```typescript
// POST /api/statistik/prediktion
interface PrediktionRequest {
  patientIds: string[];           // Valda patienter
  kampanjDatum: string;           // YYYY-MM-DD
  startTid: number;               // Timme (8-18)
  lakare?: string;
  onskatSida?: 'höger' | 'vänster';
}

interface PrediktionResponse {
  chansAttFylla: number;
  antalSmsFor90: number;
  antalSmsFor95: number;
  forvantatTidMinuter: number;
  konfidensintervall: [number, number];
  patientRanking: PatientRank[];
  rekommendationer: string[];
  dataunderlag: {
    antalHistoriskaUtskick: number;
    senastUppdaterad: string;
  };
}
```

### 5.3 Beräkningslogik

```typescript
function beraknaPredikion(
  patienter: Patient[],
  historiskData: HistoriskData
): PrediktionOutput {
  
  // 1. Hämta basfrekvenser från historisk data
  const basfrekvenser = hamtaBasfrekvenser(historiskData);
  
  // 2. Beräkna justerad JA-sannolikhet per patient
  const patientSannolikheter = patienter.map(p => {
    let sannolikhet = basfrekvenser[p.kategori].effektivJaRate;
    
    // Justera för tid på dagen
    sannolikhet *= tidPaDagenFaktor(utskickStartTid);
    
    // Justera för väntetid
    sannolikhet *= vantetidFaktor(p.dagarTillPlaneradOp);
    
    // Justera för matchande sida
    if (p.sida === onskatSida) {
      sannolikhet *= 1.10; // +10%
    }
    
    return Math.min(sannolikhet, 0.95); // Cap vid 95%
  });
  
  // 3. Sortera patienter efter sannolikhet (högst först)
  const rankadiePatienter = sorteraEfterSannolikhet(
    patienter, 
    patientSannolikheter
  );
  
  // 4. Beräkna kumulativ sannolikhet
  let kumulativChans = 0;
  let antalFor90 = 0;
  
  for (let i = 0; i < rankadiePatienter.length; i++) {
    const p = patientSannolikheter[rankadiePatienter[i].index];
    kumulativChans = 1 - (1 - kumulativChans) * (1 - p);
    
    if (kumulativChans >= 0.90 && antalFor90 === 0) {
      antalFor90 = i + 1;
    }
  }
  
  // 5. Uppskatta tid baserat på historiska svarstider
  const forvantatTid = beraknaForvantatTid(
    rankadiePatienter.slice(0, antalFor90),
    historiskData
  );
  
  return {
    chansAttFylla: kumulativChans * 100,
    antalSmsFor90: antalFor90,
    forvantatTidMinuter: forvantatTid,
    // ...
  };
}
```

---

## 6. Validering och förbättring

### 6.1 Mätning av noggrannhet

Efter varje utskick jämför vi prediktion med utfall:

```typescript
interface PrediktionValidering {
  // Var prediktionen rätt?
  predikteradChans: number;    // T.ex. 85%
  faktisktUtfall: boolean;     // Fylldes tiden?
  
  // Avvikelse
  predikteratAntalSms: number; // T.ex. 4
  faktisktAntalSms: number;    // T.ex. 6
  avvikelse: number;           // +2 SMS (50% mer)
}
```

### 6.2 Kontinuerlig förbättring

Systemet förbättras över tid genom:

1. **Bayesiansk uppdatering** - Justera basfrekvenser med nya data
2. **Anomalidetektering** - Flagga utskick som avviker kraftigt
3. **A/B-testning** - Testa olika viktningar av faktorer

### 6.3 Krav på dataunderlag

| Mått | Minimum | Rekommenderat |
|------|---------|---------------|
| Totalt antal utskick | 100 | 500+ |
| Utskick per kategori | 20 | 100+ |
| Tidsperiod | 3 månader | 12 månader |

---

## 7. Exempel på rekommendationer

Systemet kan ge kontextuella rekommendationer:

### Vid låg chans (<50%)

> *"⚠️ Låg chans att fylla (42%). Överväg att:*
> - *Utöka patienturvalet (ta med fler kategorier)*
> - *Vänta till imorgon (bättre svarsfrekvens på måndagar)*
> - *Starta tidigare på dagen (bäst före kl 11)"*

### Vid hög chans men få patienter

> *"✅ Hög chans (88%) men tunn marginal. Du har exakt 3 AKUT-patienter - om alla säger NEJ finns inga fler. Överväg att inkludera Sjukskrivna som backup."*

### Vid optimal situation

> *"🎯 Utmärkt utgångsläge! Med 8 patienter (3 AKUT, 2 Sjukskrivna) förväntar vi att tiden fylls inom 30 minuter med 95% säkerhet."*

---

## 8. Framtida utökningar

### 8.1 Maskininlärning

Med tillräckligt med data kan vi träna en ML-modell:

- **Features:** Alla patientegenskaper, tid, veckodag, läkare, etc.
- **Target:** Binärt (fylld/ej fylld) eller antal SMS till fylld
- **Modell:** Logistisk regression → Random Forest → Gradient Boosting

### 8.2 Realtidsjustering

Under pågående utskick:

> *"📊 Uppdaterad prediktion: Efter 2 NEJ-svar har chansen sjunkit till 65%. Överväg att utöka med 2 patienter för att nå 90% igen."*

### 8.3 Simulering

"Vad händer om"-scenarier:

> *"Om du lägger till 2 Sjukskrivna patienter ökar chansen från 72% till 89%."*

---

## 9. Implementationsordning

### Fas 1: Grundläggande prediktion (MVP)
- [ ] Beräkna basfrekvenser från historisk data
- [ ] Enkel sannolikhetsberäkning per patient
- [ ] Visa chans att fylla i utskicksformuläret
- [ ] Uppskattad tid till fylld

### Fas 2: Patientranking
- [ ] Optimal ordning baserat på sannolikhet
- [ ] Kumulativ chans-visualisering
- [ ] "Antal SMS för 90%"-indikator

### Fas 3: Rekommendationer
- [ ] Kontextuella tips baserat på situation
- [ ] Varningar vid låg chans
- [ ] Förslag på förbättringar

### Fas 4: Validering & förbättring
- [ ] Lagra prediktioner i databas
- [ ] Jämför med utfall
- [ ] Beräkna och visa noggrannhet
- [ ] Justera modellen baserat på feedback

---

## 10. Sammanfattning

Ett prediktionssystem ger personalen **förhandsinformation** som hjälper dem:

1. **Fatta bättre beslut** - Ska vi starta nu eller vänta?
2. **Optimera patienturval** - Vilka ska vi kontakta först?
3. **Sätta realistiska förväntningar** - Hur lång tid tar det troligen?
4. **Förbättra över tid** - Lära av historiska mönster

Det viktigaste är att börja samla data nu, så att vi har tillräckligt underlag när vi implementerar prediktionerna.
