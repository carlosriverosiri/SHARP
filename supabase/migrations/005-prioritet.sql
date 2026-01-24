-- ============================================
-- MIGRATION 005: Prioritetsfält
-- ============================================
-- Prioritetsbaserade SMS-intervall
-- Skapad: 2026-01-24
-- ============================================
-- 
-- Prioritetsintervall:
-- - AKUT: 60 min (måste opereras snarast)
-- - Sjukskriven: 30 min (stark prioritet)
-- - Mycket ont: 20 min
-- - Normal: 10 min (default)
-- ============================================


-- Patientpool: Lägg till prioritetsfält (om inte redan finns)
ALTER TABLE kort_varsel_patienter 
  ADD COLUMN IF NOT EXISTS akut BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS har_ont BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sjukskriven BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS alder INTEGER;

-- Index för snabb filtrering på prioritet
CREATE INDEX IF NOT EXISTS idx_pool_akut ON kort_varsel_patienter(akut) WHERE akut = true;
CREATE INDEX IF NOT EXISTS idx_pool_har_ont ON kort_varsel_patienter(har_ont) WHERE har_ont = true;
CREATE INDEX IF NOT EXISTS idx_pool_sjukskriven ON kort_varsel_patienter(sjukskriven) WHERE sjukskriven = true;

COMMENT ON COLUMN kort_varsel_patienter.akut IS 'AKUT - patient måste opereras snarast, sitter standby (60 min intervall)';
COMMENT ON COLUMN kort_varsel_patienter.har_ont IS 'Patienten har mycket ont (20 min intervall)';
COMMENT ON COLUMN kort_varsel_patienter.sjukskriven IS 'Patienten är sjukskriven (30 min intervall)';
COMMENT ON COLUMN kort_varsel_patienter.alder IS 'Patientens ålder (beräknad från personnummer)';


-- Kampanjmottagare: Lägg till prioritetsfält (om inte redan finns)
ALTER TABLE sms_kampanj_mottagare 
  ADD COLUMN IF NOT EXISTS akut BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sjukskriven BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS har_ont BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS intervall_till_nasta INTEGER DEFAULT 10;

COMMENT ON COLUMN sms_kampanj_mottagare.akut IS 'AKUT patient - väntar 60 min före nästa SMS';
COMMENT ON COLUMN sms_kampanj_mottagare.sjukskriven IS 'Sjukskriven patient - väntar 30 min';
COMMENT ON COLUMN sms_kampanj_mottagare.har_ont IS 'Patient med mycket ont - väntar 20 min';
COMMENT ON COLUMN sms_kampanj_mottagare.intervall_till_nasta IS 'Minuter att vänta efter detta SMS innan nästa skickas';


-- Schema version
INSERT INTO schema_version (version, description) VALUES
  (5, 'Prioritetsfält: akut, sjukskriven, har_ont med SMS-intervall')
ON CONFLICT (version) DO NOTHING;
