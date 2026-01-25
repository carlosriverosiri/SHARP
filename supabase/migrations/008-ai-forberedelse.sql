-- Migration: 008-ai-forberedelse.sql
-- Syfte: Förbereda datastrukturer för framtida AI/ML-integration
-- Datum: 2026-01-25

-- ============================================================================
-- 1. UTÖKAD DATA PER MOTTAGARE (för rikare ML-features)
-- ============================================================================

-- Lägg till kolumner för att spåra utskickstid och patienthistorik
ALTER TABLE sms_kampanj_mottagare 
  ADD COLUMN IF NOT EXISTS utskick_timme INTEGER,           -- 0-23 (extraherat från skickad_vid)
  ADD COLUMN IF NOT EXISTS utskick_veckodag INTEGER,        -- 1=mån, 7=sön
  ADD COLUMN IF NOT EXISTS patient_tidigare_forfragan INTEGER DEFAULT 0,  -- Antal tidigare förfrågningar
  ADD COLUMN IF NOT EXISTS patient_tidigare_ja INTEGER DEFAULT 0,         -- Antal tidigare JA
  ADD COLUMN IF NOT EXISTS patient_tidigare_nej INTEGER DEFAULT 0;        -- Antal tidigare NEJ

COMMENT ON COLUMN sms_kampanj_mottagare.utskick_timme IS 'Timme på dygnet (0-23) när SMS skickades - för tid-på-dagen-analys';
COMMENT ON COLUMN sms_kampanj_mottagare.utskick_veckodag IS 'Veckodag (1=måndag, 7=söndag) - för veckodagsanalys';
COMMENT ON COLUMN sms_kampanj_mottagare.patient_tidigare_forfragan IS 'Antal tidigare kortvarsel-förfrågningar till denna patient';
COMMENT ON COLUMN sms_kampanj_mottagare.patient_tidigare_ja IS 'Antal tidigare JA-svar från denna patient';
COMMENT ON COLUMN sms_kampanj_mottagare.patient_tidigare_nej IS 'Antal tidigare NEJ-svar från denna patient';

-- ============================================================================
-- 2. PATIENT SVARSHISTORIK (aggregerad per telefon_hash)
-- ============================================================================

CREATE TABLE IF NOT EXISTS patient_svarshistorik (
  telefon_hash TEXT PRIMARY KEY,
  
  -- Aggregerad statistik
  antal_forfragan INTEGER DEFAULT 0,
  antal_ja INTEGER DEFAULT 0,
  antal_nej INTEGER DEFAULT 0,
  antal_ingen_svar INTEGER DEFAULT 0,
  antal_avregistrerad INTEGER DEFAULT 0,
  
  -- Svarstider
  total_svarstid_sekunder BIGINT DEFAULT 0,  -- Summa av alla svarstider
  medel_svarstid_sekunder INTEGER,           -- Beräknat: total / antal_svar
  snabbaste_svar_sekunder INTEGER,
  
  -- Beräknad sannolikhet (uppdateras av trigger)
  historisk_ja_rate DECIMAL(5,4),  -- 0.0000 - 1.0000
  
  -- Tidsstämplar
  forsta_forfragan_vid TIMESTAMPTZ,
  senaste_forfragan_vid TIMESTAMPTZ,
  senaste_svar_vid TIMESTAMPTZ,
  
  -- Metadata
  skapad_vid TIMESTAMPTZ DEFAULT NOW(),
  uppdaterad_vid TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE patient_svarshistorik IS 'Aggregerad svarshistorik per patient (telefon_hash) för ML-prediktion';

CREATE INDEX IF NOT EXISTS idx_svarshistorik_ja_rate ON patient_svarshistorik(historisk_ja_rate DESC);

-- ============================================================================
-- 3. PREDIKTIONSTABELL (för att validera modeller)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_prediktioner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kampanj_id UUID REFERENCES sms_kampanjer(id) ON DELETE CASCADE,
  
  -- Prediktion vid utskicksstart
  prediktion_chans DECIMAL(5,2),              -- Förutsagd chans att fylla (0-100)
  prediktion_antal_sms INTEGER,               -- Förväntat antal SMS för att fylla
  prediktion_tid_minuter INTEGER,             -- Förväntad tid till fylld
  prediktion_konfidensintervall_min INTEGER,  -- Min tid (minuter)
  prediktion_konfidensintervall_max INTEGER,  -- Max tid (minuter)
  
  -- Modellinfo
  modell_version TEXT DEFAULT 'regelbaserad-v1',
  modell_typ TEXT DEFAULT 'regelbaserad',     -- 'regelbaserad', 'logistisk', 'random_forest', 'xgboost', 'llm'
  
  -- Input-snapshot (för att kunna reproducera)
  input_antal_patienter INTEGER,
  input_antal_akut INTEGER,
  input_antal_sjukskriven INTEGER,
  input_antal_ont INTEGER,
  input_antal_pensionar INTEGER,
  input_utskick_timme INTEGER,
  input_utskick_veckodag INTEGER,
  
  -- Faktiskt utfall (fylls i när kampanjen avslutas)
  faktiskt_fylld BOOLEAN,
  faktiskt_antal_sms INTEGER,
  faktiskt_tid_minuter INTEGER,
  
  -- Avvikelse (beräknas automatiskt)
  avvikelse_sms INTEGER,                      -- faktiskt - prediktion
  avvikelse_tid_minuter INTEGER,
  prediktion_korrekt BOOLEAN,                 -- Var prediktionen rätt?
  
  -- Tidsstämplar
  skapad_vid TIMESTAMPTZ DEFAULT NOW(),
  validerad_vid TIMESTAMPTZ                   -- När utfallet registrerades
);

COMMENT ON TABLE sms_prediktioner IS 'Lagrar prediktioner före utskick för senare validering och modellförbättring';

CREATE INDEX IF NOT EXISTS idx_prediktioner_kampanj ON sms_prediktioner(kampanj_id);
CREATE INDEX IF NOT EXISTS idx_prediktioner_modell ON sms_prediktioner(modell_version);
CREATE INDEX IF NOT EXISTS idx_prediktioner_korrekt ON sms_prediktioner(prediktion_korrekt);

-- ============================================================================
-- 4. TRIGGER: Uppdatera patient_svarshistorik vid svar
-- ============================================================================

CREATE OR REPLACE FUNCTION uppdatera_patient_svarshistorik()
RETURNS TRIGGER AS $$
DECLARE
  v_svarstid INTEGER;
BEGIN
  -- Beräkna svarstid om möjligt
  IF NEW.svar IS NOT NULL AND NEW.skickad_vid IS NOT NULL AND NEW.svar_vid IS NOT NULL THEN
    v_svarstid := EXTRACT(EPOCH FROM (NEW.svar_vid - NEW.skickad_vid))::INTEGER;
  END IF;

  -- Uppdatera eller skapa historik
  INSERT INTO patient_svarshistorik (
    telefon_hash,
    antal_forfragan,
    antal_ja,
    antal_nej,
    antal_avregistrerad,
    total_svarstid_sekunder,
    snabbaste_svar_sekunder,
    forsta_forfragan_vid,
    senaste_forfragan_vid,
    senaste_svar_vid
  ) VALUES (
    NEW.telefon_hash,
    1,
    CASE WHEN NEW.svar = 'ja' THEN 1 ELSE 0 END,
    CASE WHEN NEW.svar = 'nej' THEN 1 ELSE 0 END,
    CASE WHEN NEW.svar = 'avregistrerad' THEN 1 ELSE 0 END,
    COALESCE(v_svarstid, 0),
    v_svarstid,
    NEW.skickad_vid,
    NEW.skickad_vid,
    NEW.svar_vid
  )
  ON CONFLICT (telefon_hash) DO UPDATE SET
    antal_forfragan = patient_svarshistorik.antal_forfragan + 
      CASE WHEN OLD.skickad_vid IS NULL AND NEW.skickad_vid IS NOT NULL THEN 1 ELSE 0 END,
    antal_ja = patient_svarshistorik.antal_ja + 
      CASE WHEN OLD.svar IS NULL AND NEW.svar = 'ja' THEN 1 ELSE 0 END,
    antal_nej = patient_svarshistorik.antal_nej + 
      CASE WHEN OLD.svar IS NULL AND NEW.svar = 'nej' THEN 1 ELSE 0 END,
    antal_avregistrerad = patient_svarshistorik.antal_avregistrerad + 
      CASE WHEN OLD.svar IS NULL AND NEW.svar = 'avregistrerad' THEN 1 ELSE 0 END,
    total_svarstid_sekunder = patient_svarshistorik.total_svarstid_sekunder + COALESCE(v_svarstid, 0),
    snabbaste_svar_sekunder = LEAST(patient_svarshistorik.snabbaste_svar_sekunder, v_svarstid),
    senaste_forfragan_vid = GREATEST(patient_svarshistorik.senaste_forfragan_vid, NEW.skickad_vid),
    senaste_svar_vid = GREATEST(patient_svarshistorik.senaste_svar_vid, NEW.svar_vid),
    uppdaterad_vid = NOW(),
    -- Beräkna medel svarstid och JA-rate
    medel_svarstid_sekunder = CASE 
      WHEN (patient_svarshistorik.antal_ja + patient_svarshistorik.antal_nej) > 0 
      THEN (patient_svarshistorik.total_svarstid_sekunder + COALESCE(v_svarstid, 0)) / 
           (patient_svarshistorik.antal_ja + patient_svarshistorik.antal_nej + 
            CASE WHEN OLD.svar IS NULL AND NEW.svar IN ('ja', 'nej') THEN 1 ELSE 0 END)
      ELSE NULL 
    END,
    historisk_ja_rate = CASE 
      WHEN (patient_svarshistorik.antal_ja + patient_svarshistorik.antal_nej + 
            CASE WHEN OLD.svar IS NULL AND NEW.svar IN ('ja', 'nej') THEN 1 ELSE 0 END) > 0 
      THEN (patient_svarshistorik.antal_ja + 
            CASE WHEN OLD.svar IS NULL AND NEW.svar = 'ja' THEN 1 ELSE 0 END)::DECIMAL / 
           (patient_svarshistorik.antal_ja + patient_svarshistorik.antal_nej + 
            CASE WHEN OLD.svar IS NULL AND NEW.svar IN ('ja', 'nej') THEN 1 ELSE 0 END)
      ELSE NULL 
    END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Skapa trigger
DROP TRIGGER IF EXISTS trg_uppdatera_svarshistorik ON sms_kampanj_mottagare;
CREATE TRIGGER trg_uppdatera_svarshistorik
  AFTER INSERT OR UPDATE ON sms_kampanj_mottagare
  FOR EACH ROW
  EXECUTE FUNCTION uppdatera_patient_svarshistorik();

-- ============================================================================
-- 5. TRIGGER: Fyll i utskick_timme och utskick_veckodag automatiskt
-- ============================================================================

CREATE OR REPLACE FUNCTION fyll_utskick_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.skickad_vid IS NOT NULL AND (NEW.utskick_timme IS NULL OR NEW.utskick_veckodag IS NULL) THEN
    NEW.utskick_timme := EXTRACT(HOUR FROM NEW.skickad_vid)::INTEGER;
    NEW.utskick_veckodag := EXTRACT(ISODOW FROM NEW.skickad_vid)::INTEGER;  -- 1=mån, 7=sön
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fyll_utskick_metadata ON sms_kampanj_mottagare;
CREATE TRIGGER trg_fyll_utskick_metadata
  BEFORE INSERT OR UPDATE ON sms_kampanj_mottagare
  FOR EACH ROW
  EXECUTE FUNCTION fyll_utskick_metadata();

-- ============================================================================
-- 6. VIEW: ML-redo dataset för träning
-- ============================================================================

CREATE OR REPLACE VIEW v_ml_training_data AS
SELECT 
  m.id,
  m.kampanj_id,
  
  -- Target variable
  CASE WHEN m.svar = 'ja' THEN 1 ELSE 0 END as target_ja,
  m.svarstid_sekunder,
  
  -- Patient features
  CASE m.akut WHEN true THEN 1 ELSE 0 END as feat_akut,
  CASE m.sjukskriven WHEN true THEN 1 ELSE 0 END as feat_sjukskriven,
  CASE m.har_ont WHEN true THEN 1 ELSE 0 END as feat_har_ont,
  m.alder as feat_alder,
  CASE WHEN m.alder >= 67 THEN 1 ELSE 0 END as feat_pensionar,
  
  -- Operation features
  CASE m.sida WHEN 'höger' THEN 1 WHEN 'vänster' THEN 0 ELSE NULL END as feat_sida_hoger,
  CASE m.op_liten WHEN true THEN 1 ELSE 0 END as feat_op_liten,
  CASE m.op_stor WHEN true THEN 1 ELSE 0 END as feat_op_stor,
  
  -- Tidpunkt features
  m.utskick_timme as feat_timme,
  m.utskick_veckodag as feat_veckodag,
  CASE WHEN m.utskick_timme BETWEEN 8 AND 10 THEN 1 ELSE 0 END as feat_morgon,
  CASE WHEN m.utskick_veckodag IN (6, 7) THEN 1 ELSE 0 END as feat_helg,
  
  -- Historik features
  m.patient_tidigare_forfragan as feat_tidigare_forfragan,
  m.patient_tidigare_ja as feat_tidigare_ja,
  m.patient_tidigare_nej as feat_tidigare_nej,
  h.historisk_ja_rate as feat_historisk_ja_rate,
  h.medel_svarstid_sekunder as feat_historisk_svarstid,
  
  -- Kampanj features
  k.datum as kampanj_datum,
  EXTRACT(DOW FROM k.datum::date)::INTEGER as kampanj_veckodag,
  k.antal_platser as kampanj_antal_platser,
  
  -- Metadata
  m.skickad_vid,
  m.svar_vid
  
FROM sms_kampanj_mottagare m
LEFT JOIN sms_kampanjer k ON m.kampanj_id = k.id
LEFT JOIN patient_svarshistorik h ON m.telefon_hash = h.telefon_hash
WHERE m.skickad_vid IS NOT NULL;  -- Endast skickade SMS

COMMENT ON VIEW v_ml_training_data IS 'ML-redo dataset med alla features för modellträning';

-- ============================================================================
-- 7. FUNCTION: Hämta patienthistorik vid kampanjskapande
-- ============================================================================

CREATE OR REPLACE FUNCTION hamta_patient_historik(p_telefon_hash TEXT)
RETURNS TABLE (
  tidigare_forfragan INTEGER,
  tidigare_ja INTEGER,
  tidigare_nej INTEGER,
  historisk_ja_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(h.antal_forfragan, 0),
    COALESCE(h.antal_ja, 0),
    COALESCE(h.antal_nej, 0),
    h.historisk_ja_rate
  FROM patient_svarshistorik h
  WHERE h.telefon_hash = p_telefon_hash;
  
  -- Om ingen historik finns, returnera nollor
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, NULL::DECIMAL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. KOMMENTARER FÖR DOKUMENTATION
-- ============================================================================

COMMENT ON FUNCTION uppdatera_patient_svarshistorik() IS 
'Automatisk uppdatering av patient_svarshistorik när svar registreras. 
Beräknar JA-rate och svarstidsstatistik per patient.';

COMMENT ON FUNCTION fyll_utskick_metadata() IS 
'Extraherar timme och veckodag från skickad_vid för enklare ML-analys.';

COMMENT ON FUNCTION hamta_patient_historik(TEXT) IS 
'Hämtar historik för en patient baserat på telefon_hash. 
Används vid kampanjskapande för att fylla i patient_tidigare_* fälten.';

-- ============================================================================
-- KLAR!
-- ============================================================================
