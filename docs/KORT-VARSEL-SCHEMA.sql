-- ============================================
-- KORT VARSEL SMS - DATABAS-SCHEMA
-- ============================================
-- 
-- Kör detta i Supabase Dashboard → SQL Editor
-- 
-- Skapad: 2026-01-22
-- ============================================


-- ============================================
-- STEG 1: Skapa profiles-tabell (om den inte finns)
-- ============================================

-- Skapa profiles-tabell kopplad till auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  mobilnummer TEXT,
  vill_ha_notifikationer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lägg till kolumner om tabellen redan finns (ignorerar fel om de redan finns)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mobilnummer TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vill_ha_notifikationer BOOLEAN DEFAULT false;

-- RLS för profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Användare kan läsa alla profiler (för notifieringslistan)
DROP POLICY IF EXISTS "Användare kan läsa profiler" ON profiles;
CREATE POLICY "Användare kan läsa profiler" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Användare kan uppdatera sin egen profil
DROP POLICY IF EXISTS "Användare kan uppdatera egen profil" ON profiles;
CREATE POLICY "Användare kan uppdatera egen profil" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Användare kan skapa sin egen profil
DROP POLICY IF EXISTS "Användare kan skapa egen profil" ON profiles;
CREATE POLICY "Användare kan skapa egen profil" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

COMMENT ON COLUMN profiles.mobilnummer IS 'Personalens mobilnummer för SMS-notifikationer vid JA-svar';
COMMENT ON COLUMN profiles.vill_ha_notifikationer IS 'Om personen vill få SMS när någon svarar JA på kort varsel';


-- ============================================
-- STEG 2: Kampanjer (huvudtabell)
-- ============================================

CREATE TABLE IF NOT EXISTS sms_kampanjer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Operationsinfo
  datum DATE NOT NULL,
  tidsblock TEXT,                           -- 'formiddag', 'eftermiddag', eller NULL
  operation_typ TEXT,
  
  -- Antal platser att fylla (1-3)
  antal_platser INTEGER DEFAULT 1 CHECK (antal_platser BETWEEN 1 AND 3),
  antal_fyllda INTEGER DEFAULT 0,
  
  -- Skapare
  skapad_av UUID REFERENCES auth.users(id),
  skapad_vid TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status: 'aktiv' tills antal_fyllda >= antal_platser, då 'fylld'
  status TEXT DEFAULT 'aktiv' CHECK (status IN ('aktiv', 'fylld', 'avslutad')),
  
  -- Tidsgräns för svar
  sista_svarstid TIMESTAMPTZ,
  
  -- Utfall (för statistik)
  utfall TEXT CHECK (utfall IN ('fylld_via_sms', 'fylld_manuellt', 'misslyckad', 'avbruten', 'timeout')),
  
  -- Vem som fyllde platserna (JSON-array med mottagare-IDs)
  fyllda_av_mottagare UUID[],
  reserv_mottagare UUID[],
  fylld_vid TIMESTAMPTZ,
  avslutad_vid TIMESTAMPTZ,
  
  -- Gradvis utskick
  batch_intervall_minuter INTEGER DEFAULT 0,  -- 0 = skicka alla direkt
  nasta_utskick_vid TIMESTAMPTZ,
  
  -- Statistik
  antal_sms_skickade INTEGER DEFAULT 0
);

COMMENT ON TABLE sms_kampanjer IS 'Kort varsel SMS-kampanjer';
COMMENT ON COLUMN sms_kampanjer.antal_platser IS 'Antal lediga operationsplatser att fylla (1-3)';
COMMENT ON COLUMN sms_kampanjer.antal_fyllda IS 'Antal platser som fyllts via JA-svar';
COMMENT ON COLUMN sms_kampanjer.tidsblock IS 'Valfritt: formiddag, eftermiddag, eller NULL';
COMMENT ON COLUMN sms_kampanjer.batch_intervall_minuter IS '0 = alla direkt, >0 = minuter mellan varje SMS';
COMMENT ON COLUMN sms_kampanjer.nasta_utskick_vid IS 'När nästa SMS ska skickas (för gradvis utskick)';


-- ============================================
-- STEG 3: Personal som ska notifieras
-- ============================================

CREATE TABLE IF NOT EXISTS sms_kampanj_notifieringar (
  kampanj_id UUID REFERENCES sms_kampanjer(id) ON DELETE CASCADE,
  personal_id UUID REFERENCES auth.users(id),
  notifierad_vid TIMESTAMPTZ,
  PRIMARY KEY (kampanj_id, personal_id)
);

COMMENT ON TABLE sms_kampanj_notifieringar IS 'Vilken personal som ska få SMS när någon svarar JA';


-- ============================================
-- STEG 4: Mottagare (patienter)
-- ============================================

CREATE TABLE IF NOT EXISTS sms_kampanj_mottagare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kampanj_id UUID REFERENCES sms_kampanjer(id) ON DELETE CASCADE,
  
  -- Patientinfo (anonymiserad)
  namn TEXT NOT NULL,
  telefon_hash TEXT NOT NULL,           -- SHA-256 hash av telefonnummer
  telefon_masked TEXT NOT NULL,         -- "070-123 ****" för visning
  
  -- Unik svarskod (minst 16 tecken för säkerhet)
  unik_kod TEXT UNIQUE NOT NULL,
  
  -- GDPR-samtycke
  har_samtycke BOOLEAN DEFAULT false,
  
  -- Utskicksstatus
  ordning INTEGER NOT NULL,             -- Vilken ordning i kön (1, 2, 3...)
  skickad_vid TIMESTAMPTZ,              -- NULL = ej skickat ännu
  
  -- Svarsstatus
  svar TEXT CHECK (svar IN ('ja', 'nej', 'reserv')),
  svar_ordning INTEGER,                 -- 1 = första JA, 2 = reserv
  svar_vid TIMESTAMPTZ,
  bekraftat_preop BOOLEAN DEFAULT false,
  
  -- Efter kampanj avslutad
  notifierad_om_fylld BOOLEAN DEFAULT false
);

COMMENT ON TABLE sms_kampanj_mottagare IS 'Patienter som får SMS i en kampanj';
COMMENT ON COLUMN sms_kampanj_mottagare.unik_kod IS 'Unik kod för svarslänk, t.ex. specialist.se/s/abc123xyz789';
COMMENT ON COLUMN sms_kampanj_mottagare.ordning IS 'Vilken ordning patienten ska få SMS (för gradvis utskick)';


-- ============================================
-- STEG 5: Index för prestanda
-- ============================================

CREATE INDEX IF NOT EXISTS idx_kampanj_status ON sms_kampanjer(status);
CREATE INDEX IF NOT EXISTS idx_kampanj_nasta_utskick ON sms_kampanjer(nasta_utskick_vid) WHERE status = 'aktiv';
CREATE INDEX IF NOT EXISTS idx_mottagare_unik_kod ON sms_kampanj_mottagare(unik_kod);
CREATE INDEX IF NOT EXISTS idx_mottagare_kampanj ON sms_kampanj_mottagare(kampanj_id);
CREATE INDEX IF NOT EXISTS idx_mottagare_ordning ON sms_kampanj_mottagare(kampanj_id, ordning);


-- ============================================
-- STEG 6: Atomär funktion för JA-svar
-- Förhindrar race conditions när flera svarar samtidigt
-- Stödjer flera platser per kampanj (1-3)
-- ============================================

CREATE OR REPLACE FUNCTION registrera_ja_svar(
  p_unik_kod TEXT,
  p_bekraftat_preop BOOLEAN
) RETURNS TABLE (
  resultat TEXT,
  kampanj_id UUID,
  mottagare_namn TEXT,
  mottagare_id UUID,
  plats_nummer INTEGER,
  antal_platser INTEGER
) AS $$
DECLARE
  v_kampanj_id UUID;
  v_mottagare_id UUID;
  v_mottagare_namn TEXT;
  v_kampanj_status TEXT;
  v_redan_svarat TEXT;
  v_antal_platser INTEGER;
  v_antal_fyllda INTEGER;
  v_ny_fyllda INTEGER;
BEGIN
  -- Hämta mottagare och kampanj med lås
  SELECT m.id, m.kampanj_id, m.namn, m.svar, k.status, k.antal_platser, k.antal_fyllda
  INTO v_mottagare_id, v_kampanj_id, v_mottagare_namn, v_redan_svarat, v_kampanj_status, v_antal_platser, v_antal_fyllda
  FROM sms_kampanj_mottagare m
  JOIN sms_kampanjer k ON k.id = m.kampanj_id
  WHERE m.unik_kod = p_unik_kod
  FOR UPDATE;
  
  -- Kontrollera att mottagaren finns
  IF v_mottagare_id IS NULL THEN
    RETURN QUERY SELECT 'not_found'::TEXT, NULL::UUID, NULL::TEXT, NULL::UUID, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;
  
  -- Kontrollera om redan svarat
  IF v_redan_svarat IS NOT NULL THEN
    RETURN QUERY SELECT ('already_answered_' || v_redan_svarat)::TEXT, v_kampanj_id, v_mottagare_namn, v_mottagare_id, NULL::INTEGER, v_antal_platser;
    RETURN;
  END IF;
  
  -- Om kampanjen redan är fylld eller avslutad
  IF v_kampanj_status IN ('fylld', 'avslutad') THEN
    -- Registrera som reserv
    UPDATE sms_kampanj_mottagare
    SET svar = 'reserv', 
        svar_vid = NOW(), 
        bekraftat_preop = p_bekraftat_preop
    WHERE id = v_mottagare_id;
    
    -- Lägg till i reserv-array
    UPDATE sms_kampanjer
    SET reserv_mottagare = array_append(COALESCE(reserv_mottagare, '{}'), v_mottagare_id)
    WHERE id = v_kampanj_id;
    
    RETURN QUERY SELECT 'reserve'::TEXT, v_kampanj_id, v_mottagare_namn, v_mottagare_id, NULL::INTEGER, v_antal_platser;
    RETURN;
  END IF;
  
  -- Försök öka antal_fyllda atomärt (använd kvalificerade kolumnnamn för att undvika tvetydighet)
  UPDATE sms_kampanjer k2
  SET antal_fyllda = k2.antal_fyllda + 1,
      fyllda_av_mottagare = array_append(COALESCE(k2.fyllda_av_mottagare, '{}'), v_mottagare_id),
      -- Markera som fylld om vi nått målet
      status = CASE WHEN k2.antal_fyllda + 1 >= k2.antal_platser THEN 'fylld' ELSE 'aktiv' END,
      fylld_vid = CASE WHEN k2.antal_fyllda + 1 >= k2.antal_platser THEN NOW() ELSE k2.fylld_vid END
  WHERE k2.id = v_kampanj_id 
    AND k2.status = 'aktiv'
    AND k2.antal_fyllda < k2.antal_platser
  RETURNING k2.antal_fyllda INTO v_ny_fyllda;
  
  IF FOUND THEN
    -- Vi fick en plats!
    UPDATE sms_kampanj_mottagare
    SET svar = 'ja', 
        svar_vid = NOW(), 
        svar_ordning = v_ny_fyllda,  -- 1, 2 eller 3 beroende på vilken plats
        bekraftat_preop = p_bekraftat_preop
    WHERE id = v_mottagare_id;
    
    -- Returnera 'first' om det är enda platsen eller första, annars 'accepted'
    IF v_antal_platser = 1 THEN
      RETURN QUERY SELECT 'first'::TEXT, v_kampanj_id, v_mottagare_namn, v_mottagare_id, v_ny_fyllda, v_antal_platser;
    ELSE
      RETURN QUERY SELECT 'accepted'::TEXT, v_kampanj_id, v_mottagare_namn, v_mottagare_id, v_ny_fyllda, v_antal_platser;
    END IF;
    RETURN;
  ELSE
    -- Alla platser togs precis, vi blir reserv
    UPDATE sms_kampanj_mottagare
    SET svar = 'reserv', 
        svar_vid = NOW(), 
        bekraftat_preop = p_bekraftat_preop
    WHERE id = v_mottagare_id;
    
    UPDATE sms_kampanjer
    SET reserv_mottagare = array_append(COALESCE(reserv_mottagare, '{}'), v_mottagare_id)
    WHERE id = v_kampanj_id;
    
    RETURN QUERY SELECT 'reserve'::TEXT, v_kampanj_id, v_mottagare_namn, v_mottagare_id, NULL::INTEGER, v_antal_platser;
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION registrera_ja_svar IS 'Atomär funktion för att registrera JA-svar. Stödjer 1-3 platser per kampanj.';


-- ============================================
-- STEG 7: Funktion för att registrera NEJ-svar
-- ============================================

CREATE OR REPLACE FUNCTION registrera_nej_svar(
  p_unik_kod TEXT
) RETURNS TABLE (
  resultat TEXT,
  kampanj_id UUID
) AS $$
DECLARE
  v_kampanj_id UUID;
  v_mottagare_id UUID;
  v_redan_svarat TEXT;
BEGIN
  -- Hämta mottagare
  SELECT m.id, m.kampanj_id, m.svar
  INTO v_mottagare_id, v_kampanj_id, v_redan_svarat
  FROM sms_kampanj_mottagare m
  WHERE m.unik_kod = p_unik_kod;
  
  IF v_mottagare_id IS NULL THEN
    RETURN QUERY SELECT 'not_found'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  IF v_redan_svarat IS NOT NULL THEN
    RETURN QUERY SELECT ('already_answered_' || v_redan_svarat)::TEXT, v_kampanj_id;
    RETURN;
  END IF;
  
  -- Registrera NEJ-svar
  UPDATE sms_kampanj_mottagare
  SET svar = 'nej', svar_vid = NOW()
  WHERE id = v_mottagare_id;
  
  RETURN QUERY SELECT 'ok'::TEXT, v_kampanj_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- STEG 8: Funktion för att hämta nästa att skicka till
-- ============================================

CREATE OR REPLACE FUNCTION hamta_nasta_att_skicka(
  p_kampanj_id UUID
) RETURNS TABLE (
  mottagare_id UUID,
  namn TEXT,
  telefon_masked TEXT,
  har_samtycke BOOLEAN,
  ordning INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.namn, m.telefon_masked, m.har_samtycke, m.ordning
  FROM sms_kampanj_mottagare m
  WHERE m.kampanj_id = p_kampanj_id
    AND m.skickad_vid IS NULL
  ORDER BY m.ordning
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- STEG 9: Row Level Security
-- ============================================

ALTER TABLE sms_kampanjer ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_kampanj_notifieringar ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_kampanj_mottagare ENABLE ROW LEVEL SECURITY;

-- Inloggad personal kan läsa alla kampanjer
DROP POLICY IF EXISTS "Personal kan läsa kampanjer" ON sms_kampanjer;
CREATE POLICY "Personal kan läsa kampanjer" ON sms_kampanjer
  FOR SELECT TO authenticated USING (true);

-- Inloggad personal kan skapa kampanjer
DROP POLICY IF EXISTS "Personal kan skapa kampanjer" ON sms_kampanjer;
CREATE POLICY "Personal kan skapa kampanjer" ON sms_kampanjer
  FOR INSERT TO authenticated WITH CHECK (true);

-- Inloggad personal kan uppdatera kampanjer
DROP POLICY IF EXISTS "Personal kan uppdatera kampanjer" ON sms_kampanjer;
CREATE POLICY "Personal kan uppdatera kampanjer" ON sms_kampanjer
  FOR UPDATE TO authenticated USING (true);

-- Notifieringar
DROP POLICY IF EXISTS "Personal kan hantera notifieringar" ON sms_kampanj_notifieringar;
CREATE POLICY "Personal kan hantera notifieringar" ON sms_kampanj_notifieringar
  FOR ALL TO authenticated USING (true);

-- Mottagare - personal kan läsa/skriva
DROP POLICY IF EXISTS "Personal kan hantera mottagare" ON sms_kampanj_mottagare;
CREATE POLICY "Personal kan hantera mottagare" ON sms_kampanj_mottagare
  FOR ALL TO authenticated USING (true);

-- VIKTIGT: Anon-användare (patienter) kan läsa sin egen rad via unik_kod
-- Detta hanteras via service_role i API:et istället


-- ============================================
-- STEG 10: Auto-radering efter 7 dagar
-- Kör manuellt eller via Supabase cron
-- ============================================

CREATE OR REPLACE FUNCTION rensa_gamla_kampanjer()
RETURNS void AS $$
BEGIN
  -- Radera kampanjer äldre än 7 dagar
  DELETE FROM sms_kampanjer 
  WHERE skapad_vid < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- STEG 11: Vy för statistik
-- ============================================

CREATE OR REPLACE VIEW kort_varsel_statistik AS
SELECT 
  COUNT(*) FILTER (WHERE skapad_vid > NOW() - INTERVAL '30 days') as kampanjer_30_dagar,
  COUNT(*) FILTER (WHERE utfall = 'fylld_via_sms' AND skapad_vid > NOW() - INTERVAL '30 days') as fyllda_via_sms,
  COUNT(*) FILTER (WHERE utfall = 'fylld_manuellt' AND skapad_vid > NOW() - INTERVAL '30 days') as fyllda_manuellt,
  COUNT(*) FILTER (WHERE utfall = 'misslyckad' AND skapad_vid > NOW() - INTERVAL '30 days') as misslyckade,
  SUM(antal_sms_skickade) FILTER (WHERE skapad_vid > NOW() - INTERVAL '30 days') as totalt_sms_skickade
FROM sms_kampanjer;


-- ============================================
-- STEG 12: Patientpool (persistent lista)
-- ============================================
-- 
-- Patienter läggs till en gång och kan återanvändas
-- i flera kampanjer. Auto-raderas efter 7 dagar (GDPR).
-- Telefonnummer krypteras (AES-256) istället för hashas
-- så att vi kan skicka SMS senare.
-- ============================================

CREATE TABLE IF NOT EXISTS kort_varsel_patienter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Patientinfo
  namn TEXT NOT NULL,
  telefon_krypterad TEXT NOT NULL,       -- AES-256 krypterat (kan dekrypteras för SMS)
  telefon_masked TEXT NOT NULL,          -- "070-1** ****" för visning
  har_samtycke BOOLEAN DEFAULT false,
  
  -- Status i poolen
  status TEXT DEFAULT 'tillganglig' 
    CHECK (status IN ('tillganglig', 'kontaktad', 'reserv', 'nej', 'bokad')),
  
  -- Spårning
  tillagd_vid TIMESTAMPTZ DEFAULT NOW(),
  tillagd_av UUID REFERENCES auth.users(id),
  senast_kontaktad TIMESTAMPTZ,
  
  -- Koppling till kampanj (om kontaktad/bokad)
  senaste_kampanj_id UUID REFERENCES sms_kampanjer(id) ON DELETE SET NULL,
  
  -- NEJ-hantering
  tackade_nej_vid TIMESTAMPTZ,
  hanterad_i_journal BOOLEAN DEFAULT false,
  
  -- Bokad (om status = 'bokad')
  bokad_datum DATE,
  bokad_tidsblock TEXT,
  
  -- GDPR: Auto-radering efter 7 dagar
  utgar_vid TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

COMMENT ON TABLE kort_varsel_patienter IS 'Persistent patientpool för kort varsel-kampanjer';
COMMENT ON COLUMN kort_varsel_patienter.telefon_krypterad IS 'AES-256 krypterat telefonnummer (dekrypteras vid SMS-utskick)';
COMMENT ON COLUMN kort_varsel_patienter.status IS 'tillganglig=redo, kontaktad=fått SMS, reserv=JA men ej plats, nej=tackade nej, bokad=fick tid';
COMMENT ON COLUMN kort_varsel_patienter.utgar_vid IS 'Auto-raderas efter detta datum (GDPR, default 7 dagar)';


-- ============================================
-- STEG 13: Index för patientpool
-- ============================================

CREATE INDEX IF NOT EXISTS idx_pool_status ON kort_varsel_patienter(status);
CREATE INDEX IF NOT EXISTS idx_pool_utgar ON kort_varsel_patienter(utgar_vid);
CREATE INDEX IF NOT EXISTS idx_pool_tillagd ON kort_varsel_patienter(tillagd_vid);


-- ============================================
-- STEG 14: RLS för patientpool
-- ============================================

ALTER TABLE kort_varsel_patienter ENABLE ROW LEVEL SECURITY;

-- Personal kan hantera alla patienter i poolen
DROP POLICY IF EXISTS "Personal kan läsa patientpool" ON kort_varsel_patienter;
CREATE POLICY "Personal kan läsa patientpool" ON kort_varsel_patienter
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Personal kan lägga till i patientpool" ON kort_varsel_patienter;
CREATE POLICY "Personal kan lägga till i patientpool" ON kort_varsel_patienter
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Personal kan uppdatera patientpool" ON kort_varsel_patienter;
CREATE POLICY "Personal kan uppdatera patientpool" ON kort_varsel_patienter
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Personal kan ta bort från patientpool" ON kort_varsel_patienter;
CREATE POLICY "Personal kan ta bort från patientpool" ON kort_varsel_patienter
  FOR DELETE TO authenticated USING (true);


-- ============================================
-- STEG 15: Auto-radering av utgångna patienter
-- ============================================

CREATE OR REPLACE FUNCTION rensa_utgangna_patienter()
RETURNS INTEGER AS $$
DECLARE
  antal_raderade INTEGER;
BEGIN
  DELETE FROM kort_varsel_patienter 
  WHERE utgar_vid < NOW();
  
  GET DIAGNOSTICS antal_raderade = ROW_COUNT;
  RETURN antal_raderade;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION rensa_utgangna_patienter IS 'Raderar patienter vars utgångsdatum passerat. Kör via cron eller manuellt.';


-- ============================================
-- STEG 16: Hjälpfunktion - hämta patienter för kampanj
-- ============================================

CREATE OR REPLACE FUNCTION hamta_patienter_for_kampanj(
  p_patient_ids UUID[]
) RETURNS TABLE (
  id UUID,
  namn TEXT,
  telefon_krypterad TEXT,
  telefon_masked TEXT,
  har_samtycke BOOLEAN,
  status TEXT,
  prioritet INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.namn,
    p.telefon_krypterad,
    p.telefon_masked,
    p.har_samtycke,
    p.status,
    -- Prioritet: reserv först (1), tillgänglig (2), kontaktad (3)
    CASE p.status
      WHEN 'reserv' THEN 1
      WHEN 'tillganglig' THEN 2
      WHEN 'kontaktad' THEN 3
      ELSE 4
    END as prioritet
  FROM kort_varsel_patienter p
  WHERE p.id = ANY(p_patient_ids)
    AND p.status NOT IN ('nej', 'bokad')
  ORDER BY prioritet, p.tillagd_vid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- STEG 17: Uppdatera patientstatus efter kampanj
-- ============================================

CREATE OR REPLACE FUNCTION uppdatera_patient_efter_svar(
  p_patient_id UUID,
  p_kampanj_id UUID,
  p_svar TEXT,           -- 'ja_forst', 'ja_reserv', 'nej'
  p_bokad_datum DATE DEFAULT NULL,
  p_bokad_tidsblock TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  IF p_svar = 'ja_forst' THEN
    -- Fick platsen - markera som bokad
    UPDATE kort_varsel_patienter
    SET status = 'bokad',
        senaste_kampanj_id = p_kampanj_id,
        bokad_datum = p_bokad_datum,
        bokad_tidsblock = p_bokad_tidsblock
    WHERE id = p_patient_id;
    
  ELSIF p_svar = 'ja_reserv' THEN
    -- Svarade JA men fick ej plats - markera som reserv (prioriteras nästa gång!)
    UPDATE kort_varsel_patienter
    SET status = 'reserv',
        senaste_kampanj_id = p_kampanj_id
    WHERE id = p_patient_id;
    
  ELSIF p_svar = 'nej' THEN
    -- Tackade nej
    UPDATE kort_varsel_patienter
    SET status = 'nej',
        senaste_kampanj_id = p_kampanj_id,
        tackade_nej_vid = NOW()
    WHERE id = p_patient_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- STEG 18: Vy för patientpool-statistik
-- ============================================

CREATE OR REPLACE VIEW patientpool_statistik AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'tillganglig') as tillgangliga,
  COUNT(*) FILTER (WHERE status = 'kontaktad') as kontaktade,
  COUNT(*) FILTER (WHERE status = 'reserv') as reserv,
  COUNT(*) FILTER (WHERE status = 'nej') as tackade_nej,
  COUNT(*) FILTER (WHERE status = 'nej' AND NOT hanterad_i_journal) as nej_ej_hanterade,
  COUNT(*) FILTER (WHERE status = 'bokad') as bokade,
  COUNT(*) as totalt
FROM kort_varsel_patienter
WHERE utgar_vid > NOW();  -- Endast aktiva (ej utgångna)


-- ============================================
-- STEG 18: Läkare-tabell
-- ============================================
-- 
-- Fast lista av läkare för konsistens i UI.
-- ============================================

CREATE TABLE IF NOT EXISTS lakare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namn TEXT NOT NULL UNIQUE,           -- "Dr. Siri", "Dr. Lindberg"
  kortnamn TEXT,                       -- "Siri", "Lindberg" (för kompakt visning)
  aktiv BOOLEAN DEFAULT true,
  skapad_vid TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE lakare IS 'Lista av läkare som kan ha patienter/operera';

-- Lägg till några standardläkare (justera efter behov)
INSERT INTO lakare (namn, kortnamn) VALUES 
  ('Dr. Siri', 'Siri'),
  ('Dr. Lindberg', 'Lindberg')
ON CONFLICT (namn) DO NOTHING;

-- RLS
ALTER TABLE lakare ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Alla kan läsa läkare" ON lakare;
CREATE POLICY "Alla kan läsa läkare" ON lakare
  FOR SELECT TO authenticated USING (true);


-- ============================================
-- STEG 19: Lägg till läkare-kolumner i patientpool
-- ============================================

-- Läkare som patienten tillhör
ALTER TABLE kort_varsel_patienter 
  ADD COLUMN IF NOT EXISTS lakare TEXT;

-- Om patienten kan acceptera annan läkare
ALTER TABLE kort_varsel_patienter 
  ADD COLUMN IF NOT EXISTS flexibel_lakare BOOLEAN DEFAULT false;

COMMENT ON COLUMN kort_varsel_patienter.lakare IS 'Vilken läkare patienten tillhör';
COMMENT ON COLUMN kort_varsel_patienter.flexibel_lakare IS 'True om patienten kan acceptera annan läkare';

-- Index för filtrering på läkare
CREATE INDEX IF NOT EXISTS idx_pool_lakare ON kort_varsel_patienter(lakare);


-- ============================================
-- STEG 20: Lägg till läkare i kampanjer
-- ============================================

-- Vilken läkare som opererar för denna kampanj
ALTER TABLE sms_kampanjer 
  ADD COLUMN IF NOT EXISTS lakare TEXT;

COMMENT ON COLUMN sms_kampanjer.lakare IS 'Vilken läkare som opererar (visas i SMS)';


-- ============================================
-- STEG 21: Uppdaterad patientpool-statistik
-- ============================================

CREATE OR REPLACE VIEW patientpool_statistik AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'tillganglig') as tillgangliga,
  COUNT(*) FILTER (WHERE status = 'kontaktad') as kontaktade,
  COUNT(*) FILTER (WHERE status = 'reserv') as reserv,
  COUNT(*) FILTER (WHERE status = 'nej') as tackade_nej,
  COUNT(*) FILTER (WHERE status = 'nej' AND NOT hanterad_i_journal) as nej_ej_hanterade,
  COUNT(*) FILTER (WHERE status = 'bokad') as bokade,
  COUNT(*) as totalt,
  -- Statistik per läkare
  COUNT(DISTINCT lakare) as antal_lakare
FROM kort_varsel_patienter
WHERE utgar_vid > NOW();  -- Endast aktiva (ej utgångna)


-- ============================================
-- KLART!
-- ============================================
-- 
-- Nästa steg:
-- 1. Kör detta i Supabase SQL Editor
-- 2. Verifiera att tabellerna skapades under "Table Editor"
-- 3. Konfigurera krypteringsnyckel för telefonnummer
-- 4. Fortsätt med API-endpoints i projektet
--
-- ============================================
