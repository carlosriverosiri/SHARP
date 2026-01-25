-- ============================================
-- MIGRATION 007: Statistikfält
-- ============================================
-- Lägger till fält för svarstidsberäkning
-- Skapad: 2026-01-24
-- ============================================


-- ============================================
-- SVARSTID: Automatisk beräkning
-- ============================================

-- Kolumn för svarstid i sekunder (NULL tills patienten svarar)
ALTER TABLE sms_kampanj_mottagare 
  ADD COLUMN IF NOT EXISTS svarstid_sekunder INTEGER;

COMMENT ON COLUMN sms_kampanj_mottagare.svarstid_sekunder IS 
  'Antal sekunder från SMS skickades till patienten svarade';


-- ============================================
-- TRIGGER: Beräkna svarstid automatiskt
-- ============================================

-- Funktion som beräknar svarstid vid svar
CREATE OR REPLACE FUNCTION berakna_svarstid()
RETURNS TRIGGER AS $$
BEGIN
  -- Om svarad_vid sätts och skickad_vid finns, beräkna svarstid
  IF NEW.svarad_vid IS NOT NULL AND NEW.skickad_vid IS NOT NULL THEN
    NEW.svarstid_sekunder := EXTRACT(EPOCH FROM (NEW.svarad_vid - NEW.skickad_vid))::INTEGER;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ta bort gammal trigger om den finns
DROP TRIGGER IF EXISTS trigger_berakna_svarstid ON sms_kampanj_mottagare;

-- Skapa trigger som körs vid INSERT och UPDATE
CREATE TRIGGER trigger_berakna_svarstid
  BEFORE INSERT OR UPDATE ON sms_kampanj_mottagare
  FOR EACH ROW
  EXECUTE FUNCTION berakna_svarstid();


-- ============================================
-- BACKFILL: Beräkna svarstid för befintlig data
-- ============================================

UPDATE sms_kampanj_mottagare
SET svarstid_sekunder = EXTRACT(EPOCH FROM (svarad_vid - skickad_vid))::INTEGER
WHERE svarad_vid IS NOT NULL 
  AND skickad_vid IS NOT NULL 
  AND svarstid_sekunder IS NULL;


-- ============================================
-- INDEX för snabb aggregering
-- ============================================

-- Index för statistik-queries (filtrera på de som har svarat)
CREATE INDEX IF NOT EXISTS idx_mottagare_svarstid 
  ON sms_kampanj_mottagare(svarstid_sekunder) 
  WHERE svarstid_sekunder IS NOT NULL;

-- Index för att gruppera på prioritetskategorier
CREATE INDEX IF NOT EXISTS idx_mottagare_prioritet_stats 
  ON sms_kampanj_mottagare(akut, sjukskriven, har_ont) 
  WHERE svarstid_sekunder IS NOT NULL;


-- ============================================
-- VY: Aggregerad svarstidsstatistik
-- ============================================

-- Vy för enkel åtkomst till svarstidsstatistik per kategori
CREATE OR REPLACE VIEW v_svarstid_per_kategori AS
SELECT 
  CASE 
    WHEN akut = true THEN 'AKUT'
    WHEN sjukskriven = true THEN 'Sjukskriven'
    WHEN har_ont = true THEN 'Mycket ont'
    ELSE 'Normal'
  END AS kategori,
  COUNT(*) AS antal_svar,
  ROUND(AVG(svarstid_sekunder)) AS medel_svarstid_sek,
  ROUND(AVG(svarstid_sekunder) / 60.0, 1) AS medel_svarstid_min,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY svarstid_sekunder)::INTEGER AS median_svarstid_sek,
  MIN(svarstid_sekunder) AS min_svarstid_sek,
  MAX(svarstid_sekunder) AS max_svarstid_sek
FROM sms_kampanj_mottagare
WHERE svarstid_sekunder IS NOT NULL
GROUP BY 
  CASE 
    WHEN akut = true THEN 'AKUT'
    WHEN sjukskriven = true THEN 'Sjukskriven'
    WHEN har_ont = true THEN 'Mycket ont'
    ELSE 'Normal'
  END
ORDER BY 
  CASE 
    WHEN akut = true THEN 1
    WHEN sjukskriven = true THEN 2
    WHEN har_ont = true THEN 3
    ELSE 4
  END;


-- ============================================
-- VY: Svarstid per timme på dagen
-- ============================================

CREATE OR REPLACE VIEW v_svarstid_per_timme AS
SELECT 
  EXTRACT(HOUR FROM skickad_vid) AS timme,
  COUNT(*) AS antal_svar,
  ROUND(AVG(svarstid_sekunder)) AS medel_svarstid_sek,
  ROUND(AVG(svarstid_sekunder) / 60.0, 1) AS medel_svarstid_min,
  COUNT(*) FILTER (WHERE svar = 'ja') AS antal_ja,
  COUNT(*) FILTER (WHERE svar = 'nej') AS antal_nej,
  ROUND(100.0 * COUNT(*) FILTER (WHERE svar = 'ja') / NULLIF(COUNT(*), 0), 1) AS ja_procent
FROM sms_kampanj_mottagare
WHERE svarstid_sekunder IS NOT NULL
  AND skickad_vid IS NOT NULL
GROUP BY EXTRACT(HOUR FROM skickad_vid)
ORDER BY timme;


-- Schema version
INSERT INTO schema_version (version, description) VALUES
  (7, 'Statistikfält: svarstid_sekunder, trigger, vyer för analys')
ON CONFLICT (version) DO NOTHING;
