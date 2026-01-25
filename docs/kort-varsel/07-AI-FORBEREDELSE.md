# AI-förberedelse för Kort varsel-SMS

> **Status:** Förberedande datasamling aktiv  
> **Datum:** 2026-01-25  
> **Mål:** Samla data för framtida ML-modeller

---

## 1. Översikt

Detta dokument beskriver de tekniska förberedelserna för att kunna integrera AI/ML i kort varsel-systemet i framtiden.

### Vad samlas nu?

| Data | Var | Syfte |
|------|-----|-------|
| Svarstid per patient | `sms_kampanj_mottagare.svarstid_sekunder` | Prediktera hur snabbt olika grupper svarar |
| Utskickstimme | `sms_kampanj_mottagare.utskick_timme` | Analysera optimal tid på dagen |
| Veckodag | `sms_kampanj_mottagare.utskick_veckodag` | Analysera bästa veckodag |
| Patienthistorik | `patient_svarshistorik` | Individuell JA-sannolikhet |
| Prediktioner | `sms_prediktioner` | Validera modellnoggrannhet |

---

## 2. Databasschema

### 2.1 Nya kolumner i `sms_kampanj_mottagare`

```sql
utskick_timme INTEGER           -- 0-23
utskick_veckodag INTEGER        -- 1=mån, 7=sön
patient_tidigare_forfragan INT  -- Antal tidigare förfrågningar
patient_tidigare_ja INT         -- Antal tidigare JA-svar
patient_tidigare_nej INT        -- Antal tidigare NEJ-svar
```

### 2.2 Ny tabell: `patient_svarshistorik`

Aggregerad statistik per patient (telefon_hash):

```sql
antal_forfragan INT
antal_ja INT
antal_nej INT
medel_svarstid_sekunder INT
historisk_ja_rate DECIMAL(5,4)  -- 0.0000 - 1.0000
```

### 2.3 Ny tabell: `sms_prediktioner`

Sparar prediktioner före utskick för validering:

```sql
-- Input
prediktion_chans DECIMAL        -- Förutsagd chans (0-100%)
prediktion_antal_sms INT        -- Förväntat antal SMS
input_antal_akut INT            -- Snapshot av patientmix

-- Utfall (fylls i efteråt)
faktiskt_fylld BOOLEAN
faktiskt_antal_sms INT
prediktion_korrekt BOOLEAN      -- Stämde prediktionen?
```

---

## 3. ML-redo View

En view `v_ml_training_data` samlar alla features i ett format lämpligt för ML-träning:

```sql
SELECT * FROM v_ml_training_data LIMIT 5;
```

**Features:**
- `target_ja` - Target variable (1/0)
- `feat_akut`, `feat_sjukskriven`, `feat_har_ont` - Prioritetskategorier
- `feat_alder`, `feat_pensionar` - Ålder
- `feat_sida_hoger`, `feat_op_liten`, `feat_op_stor` - Operationstyp
- `feat_timme`, `feat_veckodag`, `feat_morgon`, `feat_helg` - Tidpunkt
- `feat_historisk_ja_rate` - Patientens tidigare JA-rate

---

## 4. Triggers (automatiska)

### 4.1 `trg_fyll_utskick_metadata`
Fyller automatiskt i `utskick_timme` och `utskick_veckodag` när SMS skickas.

### 4.2 `trg_uppdatera_svarshistorik`
Uppdaterar `patient_svarshistorik` automatiskt när svar registreras:
- Räknar antal förfrågningar, JA, NEJ
- Beräknar historisk JA-rate
- Uppdaterar medel svarstid

---

## 5. Användning i kod

### 5.1 Hämta patienthistorik före utskick

```typescript
// I skapa.ts - hämta historik för varje patient
const { data: historik } = await supabaseAdmin
  .rpc('hamta_patient_historik', { p_telefon_hash: telefonHash });

// Spara i mottagare-data
{
  patient_tidigare_forfragan: historik?.tidigare_forfragan || 0,
  patient_tidigare_ja: historik?.tidigare_ja || 0,
  patient_tidigare_nej: historik?.tidigare_nej || 0,
}
```

### 5.2 Spara prediktion före utskick

```typescript
// Skapa prediktion-post
await supabaseAdmin.from('sms_prediktioner').insert({
  kampanj_id: kampanj.id,
  prediktion_chans: beraknadChans,
  prediktion_antal_sms: beraknatAntalSms,
  input_antal_patienter: mottagare.length,
  input_antal_akut: mottagare.filter(m => m.akut).length,
  // ...
});
```

### 5.3 Validera prediktion efter kampanj

```typescript
// När kampanj avslutas, uppdatera prediktion
await supabaseAdmin.from('sms_prediktioner')
  .update({
    faktiskt_fylld: kampanj.status === 'fylld',
    faktiskt_antal_sms: antalSkickadeSms,
    faktiskt_tid_minuter: tidTillFylld,
    validerad_vid: new Date().toISOString(),
    prediktion_korrekt: Math.abs(beraknadChans - faktiskChans) < 15,
  })
  .eq('kampanj_id', kampanjId);
```

---

## 6. ML-pipeline (framtida)

### Fas 1: Regelbaserad (nu → 500 datapunkter)
```
Statistik → Fasta vikter → Beräknad sannolikhet
```

### Fas 2: Enkel ML (500+ datapunkter)
```
v_ml_training_data → Logistisk regression → Sannolikhet per patient
```

### Fas 3: Avancerad ML (2000+ datapunkter)
```
Historisk data → XGBoost/Random Forest → Ranking + konfidensintervall
```

### Fas 4: LLM-assisterad (valfritt)
```
All data → GPT/Claude → Naturliga rekommendationer + förklaringar
```

---

## 7. Exportera träningsdata

### CSV för extern analys

```sql
\COPY (SELECT * FROM v_ml_training_data) TO '/tmp/training_data.csv' CSV HEADER;
```

### JSON för API

```typescript
// GET /api/ml/training-data
const { data } = await supabaseAdmin
  .from('v_ml_training_data')
  .select('*')
  .limit(10000);
```

---

## 8. Mätvärden att följa

| Mätvärde | Beskrivning | Mål |
|----------|-------------|-----|
| **Datapunkter** | Antal rader i `v_ml_training_data` | 500+ för Fas 2 |
| **Prediktionsnoggrannhet** | `prediktion_korrekt = true` % | >70% |
| **Feature coverage** | Andel rader med alla features ifyllda | >90% |
| **Historik-täckning** | Andel patienter med `historisk_ja_rate` | >50% |

### SQL för att kontrollera status

```sql
-- Antal datapunkter
SELECT COUNT(*) FROM v_ml_training_data;

-- Prediktionsnoggrannhet
SELECT 
  COUNT(*) as totalt,
  COUNT(*) FILTER (WHERE prediktion_korrekt) as korrekta,
  ROUND(100.0 * COUNT(*) FILTER (WHERE prediktion_korrekt) / COUNT(*), 1) as procent
FROM sms_prediktioner
WHERE validerad_vid IS NOT NULL;

-- Historik-täckning
SELECT 
  COUNT(*) as totalt,
  COUNT(*) FILTER (WHERE feat_historisk_ja_rate IS NOT NULL) as med_historik,
  ROUND(100.0 * COUNT(*) FILTER (WHERE feat_historisk_ja_rate IS NOT NULL) / COUNT(*), 1) as procent
FROM v_ml_training_data;
```

---

## 9. Säkerhet och GDPR

### Viktigt
- **Ingen persondata i ML-data** - endast `telefon_hash` (ej reversibelt)
- **Aggregerad historik** - individuella svar kopplas ej till namn
- **Lokal träning möjlig** - data behöver inte lämna servern

### Vid export
- Ta bort `telefon_hash` om data lämnar systemet
- Använd endast aggregerade mätvärden i rapporter

---

## 10. Nästa steg

1. ✅ **Kör migration** `008-ai-forberedelse.sql` i Supabase
2. 🔄 **Samla data** - varje utskick ger värdefull information
3. 📊 **Övervaka** - kolla datapunkter månadsvis
4. 🎯 **Vid 500+ datapunkter** - implementera regelbaserad prediktion
5. 🤖 **Vid 2000+ datapunkter** - överväg ML-modell

---

*Dokumentet uppdateras när fler AI-funktioner implementeras.*
