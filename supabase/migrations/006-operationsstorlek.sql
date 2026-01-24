-- ============================================
-- MIGRATION 006: Operationsstorlek + Läkare-array
-- ============================================
-- Lägger till fält för liten/stor operation
-- Ändrar läkare från TEXT till TEXT[] (array)
-- Tar bort flexibel_lakare (ersätts av array)
-- Skapad: 2026-01-24
-- ============================================


-- ============================================
-- PATIENTPOOL: Ändra läkare till array
-- ============================================

-- Konvertera befintlig läkare-data till array-format
-- (Kör endast om kolumnen är TEXT, inte om den redan är TEXT[])
DO $$
BEGIN
  -- Kontrollera om kolumnen är TEXT (inte array)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kort_varsel_patienter' 
    AND column_name = 'lakare' 
    AND data_type = 'text'
  ) THEN
    -- Skapa temporär kolumn
    ALTER TABLE kort_varsel_patienter ADD COLUMN lakare_new TEXT[];
    
    -- Migrera data (konvertera single value till array)
    UPDATE kort_varsel_patienter 
    SET lakare_new = CASE 
      WHEN lakare IS NOT NULL AND lakare != '' THEN ARRAY[lakare]
      ELSE '{}'::TEXT[]
    END;
    
    -- Ta bort gamla kolumnen och byt namn
    ALTER TABLE kort_varsel_patienter DROP COLUMN lakare;
    ALTER TABLE kort_varsel_patienter RENAME COLUMN lakare_new TO lakare;
  END IF;
END $$;

COMMENT ON COLUMN kort_varsel_patienter.lakare IS 'Array av läkare som kan utföra operationen';

-- Ta bort flexibel_lakare (ersätts av att välja flera läkare)
ALTER TABLE kort_varsel_patienter 
  DROP COLUMN IF EXISTS flexibel_lakare;


-- ============================================
-- PATIENTPOOL: Lägg till operationsstorlek
-- ============================================

-- Liten operation (5-15 min)
ALTER TABLE kort_varsel_patienter 
  ADD COLUMN IF NOT EXISTS op_liten BOOLEAN DEFAULT false;

-- Stor operation (15-60 min)  
ALTER TABLE kort_varsel_patienter 
  ADD COLUMN IF NOT EXISTS op_stor BOOLEAN DEFAULT false;

COMMENT ON COLUMN kort_varsel_patienter.op_liten IS 'Liten operation (5-15 min)';
COMMENT ON COLUMN kort_varsel_patienter.op_stor IS 'Stor operation (15-60 min)';


-- ============================================
-- KAMPANJMOTTAGARE: Lägg till operationsstorlek
-- ============================================

-- Kopieras från patientpool vid kampanjskapande
ALTER TABLE sms_kampanj_mottagare 
  ADD COLUMN IF NOT EXISTS op_liten BOOLEAN DEFAULT false;

ALTER TABLE sms_kampanj_mottagare 
  ADD COLUMN IF NOT EXISTS op_stor BOOLEAN DEFAULT false;


-- ============================================
-- KAMPANJER: Lägg till önskad operationsstorlek
-- ============================================

-- Vid kampanjskapande kan man välja vilken storlek som söks
ALTER TABLE sms_kampanjer 
  ADD COLUMN IF NOT EXISTS filter_op_liten BOOLEAN DEFAULT true;

ALTER TABLE sms_kampanjer 
  ADD COLUMN IF NOT EXISTS filter_op_stor BOOLEAN DEFAULT true;

COMMENT ON COLUMN sms_kampanjer.filter_op_liten IS 'Söker patienter med liten operation';
COMMENT ON COLUMN sms_kampanjer.filter_op_stor IS 'Söker patienter med stor operation';


-- ============================================
-- INDEX för snabb filtrering
-- ============================================

CREATE INDEX IF NOT EXISTS idx_pool_op_liten 
  ON kort_varsel_patienter(op_liten) WHERE op_liten = true;

CREATE INDEX IF NOT EXISTS idx_pool_op_stor 
  ON kort_varsel_patienter(op_stor) WHERE op_stor = true;


-- ============================================
-- SIDA: Höger/Vänster för operation
-- ============================================

-- Patientpool: Vilken sida operationen gäller
ALTER TABLE kort_varsel_patienter 
  ADD COLUMN IF NOT EXISTS sida TEXT CHECK (sida IN ('höger', 'vänster'));

COMMENT ON COLUMN kort_varsel_patienter.sida IS 'Operationssida: höger eller vänster';

-- Kampanjmottagare: Kopieras från patientpool
ALTER TABLE sms_kampanj_mottagare 
  ADD COLUMN IF NOT EXISTS sida TEXT CHECK (sida IN ('höger', 'vänster'));

-- Kampanjer: Vilken sida som söks (för prioritering)
ALTER TABLE sms_kampanjer 
  ADD COLUMN IF NOT EXISTS filter_sida TEXT CHECK (filter_sida IN ('höger', 'vänster'));

COMMENT ON COLUMN sms_kampanjer.filter_sida IS 'Önskad sida för operationen - påverkar prioriteringsordning';


-- Schema version
INSERT INTO schema_version (version, description) VALUES
  (6, 'Operationsstorlek, läkare som array, sida (HÖ/VÄ)')
ON CONFLICT (version) DO NOTHING;
