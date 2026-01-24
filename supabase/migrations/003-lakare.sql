-- ============================================
-- MIGRATION 003: Läkare
-- ============================================
-- Lista av läkare för konsistens i UI
-- Skapad: 2026-01-23
-- ============================================

CREATE TABLE IF NOT EXISTS lakare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namn TEXT NOT NULL UNIQUE,
  kortnamn TEXT,
  aktiv BOOLEAN DEFAULT true,
  skapad_vid TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE lakare IS 'Lista av läkare som kan ha patienter/operera';

-- Lägg till standardläkare (ändra efter behov!)
INSERT INTO lakare (namn, kortnamn) VALUES 
  ('Dr. Siri', 'Siri'),
  ('Dr. Lindberg', 'Lindberg')
ON CONFLICT (namn) DO NOTHING;

-- RLS
ALTER TABLE lakare ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Alla kan läsa läkare" ON lakare;
CREATE POLICY "Alla kan läsa läkare" ON lakare
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Personal kan hantera läkare" ON lakare;
CREATE POLICY "Personal kan hantera läkare" ON lakare
  FOR ALL TO authenticated USING (true);

-- Schema version
INSERT INTO schema_version (version, description) VALUES
  (3, 'Läkare-tabell för patientpool')
ON CONFLICT (version) DO NOTHING;
