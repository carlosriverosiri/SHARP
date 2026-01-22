-- ============================================
-- MIGRATION: Lägg till läkare-funktionalitet
-- ============================================
-- Kör detta i Supabase SQL Editor för att
-- lägga till läkare-stöd i patientpoolen.
-- ============================================

-- 1. Skapa läkare-tabell
CREATE TABLE IF NOT EXISTS lakare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namn TEXT NOT NULL UNIQUE,
  kortnamn TEXT,
  aktiv BOOLEAN DEFAULT true,
  skapad_vid TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Lägg till standardläkare (ändra efter behov!)
INSERT INTO lakare (namn, kortnamn) VALUES 
  ('Dr. Siri', 'Siri'),
  ('Dr. Lindberg', 'Lindberg')
ON CONFLICT (namn) DO NOTHING;

-- 3. RLS för läkare
ALTER TABLE lakare ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Alla kan läsa läkare" ON lakare;
CREATE POLICY "Alla kan läsa läkare" ON lakare
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Personal kan hantera läkare" ON lakare;
CREATE POLICY "Personal kan hantera läkare" ON lakare
  FOR ALL TO authenticated USING (true);

-- 4. Lägg till läkare-kolumner i patientpool
ALTER TABLE kort_varsel_patienter 
  ADD COLUMN IF NOT EXISTS lakare TEXT;

ALTER TABLE kort_varsel_patienter 
  ADD COLUMN IF NOT EXISTS flexibel_lakare BOOLEAN DEFAULT false;

-- 5. Index för läkarfiltrering
CREATE INDEX IF NOT EXISTS idx_pool_lakare ON kort_varsel_patienter(lakare);

-- 6. Lägg till läkare i kampanjer
ALTER TABLE sms_kampanjer 
  ADD COLUMN IF NOT EXISTS lakare TEXT;

-- 7. Uppdatera statistik-view
CREATE OR REPLACE VIEW patientpool_statistik AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'tillganglig') as tillgangliga,
  COUNT(*) FILTER (WHERE status = 'kontaktad') as kontaktade,
  COUNT(*) FILTER (WHERE status = 'reserv') as reserv,
  COUNT(*) FILTER (WHERE status = 'nej') as tackade_nej,
  COUNT(*) FILTER (WHERE status = 'nej' AND NOT hanterad_i_journal) as nej_ej_hanterade,
  COUNT(*) FILTER (WHERE status = 'bokad') as bokade,
  COUNT(*) as totalt,
  COUNT(DISTINCT lakare) as antal_lakare
FROM kort_varsel_patienter
WHERE utgar_vid > NOW();

-- ============================================
-- KLART!
-- ============================================
-- 
-- Du kan nu:
-- 1. Lägga till fler läkare i lakare-tabellen
-- 2. Ange läkare vid patientinmatning
-- 3. Filtrera på läkare vid kampanjskapande
--
-- ============================================
