-- ============================================
-- MIGRATION 002: Kort Varsel SMS
-- ============================================
-- Kampanjer, mottagare och patientpool
-- Skapad: 2026-01-22
-- ============================================


-- ============================================
-- TABELL: Kampanjer
-- ============================================

CREATE TABLE IF NOT EXISTS sms_kampanjer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Operationsinfo
  datum DATE NOT NULL,
  tidsblock TEXT,                           -- 'formiddag', 'eftermiddag', eller NULL
  operation_typ TEXT,
  lakare TEXT,                              -- Vilken läkare som opererar
  
  -- Antal platser att fylla (1-3)
  antal_platser INTEGER DEFAULT 1 CHECK (antal_platser BETWEEN 1 AND 3),
  antal_fyllda INTEGER DEFAULT 0,
  
  -- Skapare
  skapad_av UUID REFERENCES auth.users(id),
  skapad_vid TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status
  status TEXT DEFAULT 'aktiv' CHECK (status IN ('aktiv', 'fylld', 'avslutad')),
  
  -- Tidsgräns för svar
  sista_svarstid TIMESTAMPTZ,
  
  -- Utfall (för statistik)
  utfall TEXT CHECK (utfall IN ('fylld_via_sms', 'fylld_manuellt', 'misslyckad', 'avbruten', 'timeout')),
  
  -- Vem som fyllde platserna
  fyllda_av_mottagare UUID[],
  reserv_mottagare UUID[],
  fylld_vid TIMESTAMPTZ,
  avslutad_vid TIMESTAMPTZ,
  
  -- Gradvis utskick
  batch_intervall_minuter INTEGER DEFAULT 0,
  nasta_utskick_vid TIMESTAMPTZ,
  
  -- Statistik
  antal_sms_skickade INTEGER DEFAULT 0
);

COMMENT ON TABLE sms_kampanjer IS 'Kort varsel SMS-kampanjer';
COMMENT ON COLUMN sms_kampanjer.antal_platser IS 'Antal lediga operationsplatser att fylla (1-3)';
COMMENT ON COLUMN sms_kampanjer.batch_intervall_minuter IS '0 = alla direkt, >0 = minuter mellan varje SMS';


-- ============================================
-- TABELL: Kampanjnotifieringar
-- ============================================

CREATE TABLE IF NOT EXISTS sms_kampanj_notifieringar (
  kampanj_id UUID REFERENCES sms_kampanjer(id) ON DELETE CASCADE,
  personal_id UUID REFERENCES auth.users(id),
  notifierad_vid TIMESTAMPTZ,
  PRIMARY KEY (kampanj_id, personal_id)
);


-- ============================================
-- TABELL: Kampanjmottagare
-- ============================================

CREATE TABLE IF NOT EXISTS sms_kampanj_mottagare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kampanj_id UUID REFERENCES sms_kampanjer(id) ON DELETE CASCADE,
  
  -- Patientinfo (anonymiserad)
  namn TEXT NOT NULL,
  telefon_hash TEXT NOT NULL,
  telefon_masked TEXT NOT NULL,
  telefon_krypterad TEXT,
  
  -- Unik svarskod
  unik_kod TEXT UNIQUE NOT NULL,
  
  -- GDPR-samtycke
  har_samtycke BOOLEAN DEFAULT false,
  
  -- Utskicksstatus
  ordning INTEGER NOT NULL,
  skickad_vid TIMESTAMPTZ,
  
  -- Svarsstatus
  svar TEXT CHECK (svar IN ('ja', 'nej', 'reserv', 'avregistrerad')),
  svar_ordning INTEGER,
  svar_vid TIMESTAMPTZ,
  bekraftat_preop BOOLEAN DEFAULT false,
  
  -- Prioritetsfält (kopieras från patientpool)
  akut BOOLEAN DEFAULT false,
  sjukskriven BOOLEAN DEFAULT false,
  har_ont BOOLEAN DEFAULT false,
  intervall_till_nasta INTEGER DEFAULT 10,
  
  -- Efter kampanj avslutad
  notifierad_om_fylld BOOLEAN DEFAULT false
);

COMMENT ON COLUMN sms_kampanj_mottagare.akut IS 'AKUT patient - väntar 60 min före nästa SMS';
COMMENT ON COLUMN sms_kampanj_mottagare.sjukskriven IS 'Sjukskriven - väntar 30 min';
COMMENT ON COLUMN sms_kampanj_mottagare.har_ont IS 'Mycket ont - väntar 20 min';
COMMENT ON COLUMN sms_kampanj_mottagare.intervall_till_nasta IS 'Minuter att vänta efter detta SMS';


-- ============================================
-- TABELL: Patientpool
-- ============================================

CREATE TABLE IF NOT EXISTS kort_varsel_patienter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Patientinfo
  namn TEXT NOT NULL,
  telefon_krypterad TEXT NOT NULL,
  telefon_hash TEXT NOT NULL,
  telefon_masked TEXT NOT NULL,
  har_samtycke BOOLEAN DEFAULT false,
  
  -- Läkare
  lakare TEXT,
  flexibel_lakare BOOLEAN DEFAULT false,
  
  -- Prioritet
  akut BOOLEAN DEFAULT false,
  har_ont BOOLEAN DEFAULT false,
  sjukskriven BOOLEAN DEFAULT false,
  alder INTEGER,
  
  -- Status i poolen
  status TEXT DEFAULT 'tillganglig' 
    CHECK (status IN ('tillganglig', 'kontaktad', 'reserv', 'nej', 'bokad', 'avregistrerad')),
  
  -- Spårning
  tillagd_vid TIMESTAMPTZ DEFAULT NOW(),
  tillagd_av UUID REFERENCES auth.users(id),
  senast_kontaktad TIMESTAMPTZ,
  senaste_kampanj_id UUID REFERENCES sms_kampanjer(id) ON DELETE SET NULL,
  
  -- NEJ-hantering
  tackade_nej_vid TIMESTAMPTZ,
  hanterad_i_journal BOOLEAN DEFAULT false,
  
  -- Bokad
  bokad_datum DATE,
  bokad_tidsblock TEXT,
  
  -- Avregistrering
  avregistrerad_vid TIMESTAMPTZ,
  avregistrerings_orsak TEXT,
  
  -- GDPR: Auto-radering
  utgar_vid TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

COMMENT ON TABLE kort_varsel_patienter IS 'Persistent patientpool för kort varsel-kampanjer';
COMMENT ON COLUMN kort_varsel_patienter.akut IS 'AKUT - patient måste opereras snarast (60 min intervall)';
COMMENT ON COLUMN kort_varsel_patienter.har_ont IS 'Mycket ont (20 min intervall)';
COMMENT ON COLUMN kort_varsel_patienter.sjukskriven IS 'Sjukskriven (30 min intervall)';
COMMENT ON COLUMN kort_varsel_patienter.alder IS 'Patientens ålder (beräknad från personnummer)';


-- ============================================
-- INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS idx_kampanj_status ON sms_kampanjer(status);
CREATE INDEX IF NOT EXISTS idx_kampanj_nasta_utskick ON sms_kampanjer(nasta_utskick_vid) WHERE status = 'aktiv';
CREATE INDEX IF NOT EXISTS idx_mottagare_unik_kod ON sms_kampanj_mottagare(unik_kod);
CREATE INDEX IF NOT EXISTS idx_mottagare_kampanj ON sms_kampanj_mottagare(kampanj_id);
CREATE INDEX IF NOT EXISTS idx_mottagare_ordning ON sms_kampanj_mottagare(kampanj_id, ordning);

CREATE INDEX IF NOT EXISTS idx_pool_status ON kort_varsel_patienter(status);
CREATE INDEX IF NOT EXISTS idx_pool_utgar ON kort_varsel_patienter(utgar_vid);
CREATE INDEX IF NOT EXISTS idx_pool_telefon_hash ON kort_varsel_patienter(telefon_hash);
CREATE INDEX IF NOT EXISTS idx_pool_lakare ON kort_varsel_patienter(lakare);
CREATE INDEX IF NOT EXISTS idx_pool_akut ON kort_varsel_patienter(akut) WHERE akut = true;
CREATE INDEX IF NOT EXISTS idx_pool_har_ont ON kort_varsel_patienter(har_ont) WHERE har_ont = true;
CREATE INDEX IF NOT EXISTS idx_pool_sjukskriven ON kort_varsel_patienter(sjukskriven) WHERE sjukskriven = true;


-- ============================================
-- RLS
-- ============================================

ALTER TABLE sms_kampanjer ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_kampanj_notifieringar ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_kampanj_mottagare ENABLE ROW LEVEL SECURITY;
ALTER TABLE kort_varsel_patienter ENABLE ROW LEVEL SECURITY;

-- Kampanjer
DROP POLICY IF EXISTS "Personal kan läsa kampanjer" ON sms_kampanjer;
CREATE POLICY "Personal kan läsa kampanjer" ON sms_kampanjer
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Personal kan skapa kampanjer" ON sms_kampanjer;
CREATE POLICY "Personal kan skapa kampanjer" ON sms_kampanjer
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Personal kan uppdatera kampanjer" ON sms_kampanjer;
CREATE POLICY "Personal kan uppdatera kampanjer" ON sms_kampanjer
  FOR UPDATE TO authenticated USING (true);

-- Notifieringar
DROP POLICY IF EXISTS "Personal kan hantera notifieringar" ON sms_kampanj_notifieringar;
CREATE POLICY "Personal kan hantera notifieringar" ON sms_kampanj_notifieringar
  FOR ALL TO authenticated USING (true);

-- Mottagare
DROP POLICY IF EXISTS "Personal kan hantera mottagare" ON sms_kampanj_mottagare;
CREATE POLICY "Personal kan hantera mottagare" ON sms_kampanj_mottagare
  FOR ALL TO authenticated USING (true);

-- Patientpool
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
-- FUNKTIONER
-- ============================================

-- Atomär funktion för JA-svar (förhindrar race conditions)
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
  SELECT m.id, m.kampanj_id, m.namn, m.svar, k.status, k.antal_platser, k.antal_fyllda
  INTO v_mottagare_id, v_kampanj_id, v_mottagare_namn, v_redan_svarat, v_kampanj_status, v_antal_platser, v_antal_fyllda
  FROM sms_kampanj_mottagare m
  JOIN sms_kampanjer k ON k.id = m.kampanj_id
  WHERE m.unik_kod = p_unik_kod
  FOR UPDATE;
  
  IF v_mottagare_id IS NULL THEN
    RETURN QUERY SELECT 'not_found'::TEXT, NULL::UUID, NULL::TEXT, NULL::UUID, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;
  
  IF v_redan_svarat IS NOT NULL THEN
    RETURN QUERY SELECT ('already_answered_' || v_redan_svarat)::TEXT, v_kampanj_id, v_mottagare_namn, v_mottagare_id, NULL::INTEGER, v_antal_platser;
    RETURN;
  END IF;
  
  IF v_kampanj_status IN ('fylld', 'avslutad') THEN
    UPDATE sms_kampanj_mottagare
    SET svar = 'reserv', svar_vid = NOW(), bekraftat_preop = p_bekraftat_preop
    WHERE id = v_mottagare_id;
    
    UPDATE sms_kampanjer
    SET reserv_mottagare = array_append(COALESCE(reserv_mottagare, '{}'), v_mottagare_id)
    WHERE id = v_kampanj_id;
    
    RETURN QUERY SELECT 'reserve'::TEXT, v_kampanj_id, v_mottagare_namn, v_mottagare_id, NULL::INTEGER, v_antal_platser;
    RETURN;
  END IF;
  
  UPDATE sms_kampanjer k2
  SET antal_fyllda = k2.antal_fyllda + 1,
      fyllda_av_mottagare = array_append(COALESCE(k2.fyllda_av_mottagare, '{}'), v_mottagare_id),
      status = CASE WHEN k2.antal_fyllda + 1 >= k2.antal_platser THEN 'fylld' ELSE 'aktiv' END,
      fylld_vid = CASE WHEN k2.antal_fyllda + 1 >= k2.antal_platser THEN NOW() ELSE k2.fylld_vid END
  WHERE k2.id = v_kampanj_id 
    AND k2.status = 'aktiv'
    AND k2.antal_fyllda < k2.antal_platser
  RETURNING k2.antal_fyllda INTO v_ny_fyllda;
  
  IF FOUND THEN
    UPDATE sms_kampanj_mottagare
    SET svar = 'ja', svar_vid = NOW(), svar_ordning = v_ny_fyllda, bekraftat_preop = p_bekraftat_preop
    WHERE id = v_mottagare_id;
    
    IF v_antal_platser = 1 THEN
      RETURN QUERY SELECT 'first'::TEXT, v_kampanj_id, v_mottagare_namn, v_mottagare_id, v_ny_fyllda, v_antal_platser;
    ELSE
      RETURN QUERY SELECT 'accepted'::TEXT, v_kampanj_id, v_mottagare_namn, v_mottagare_id, v_ny_fyllda, v_antal_platser;
    END IF;
    RETURN;
  ELSE
    UPDATE sms_kampanj_mottagare
    SET svar = 'reserv', svar_vid = NOW(), bekraftat_preop = p_bekraftat_preop
    WHERE id = v_mottagare_id;
    
    UPDATE sms_kampanjer
    SET reserv_mottagare = array_append(COALESCE(reserv_mottagare, '{}'), v_mottagare_id)
    WHERE id = v_kampanj_id;
    
    RETURN QUERY SELECT 'reserve'::TEXT, v_kampanj_id, v_mottagare_namn, v_mottagare_id, NULL::INTEGER, v_antal_platser;
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Funktion för NEJ-svar
CREATE OR REPLACE FUNCTION registrera_nej_svar(p_unik_kod TEXT)
RETURNS TABLE (resultat TEXT, kampanj_id UUID) AS $$
DECLARE
  v_kampanj_id UUID;
  v_mottagare_id UUID;
  v_redan_svarat TEXT;
BEGIN
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
  
  UPDATE sms_kampanj_mottagare
  SET svar = 'nej', svar_vid = NOW()
  WHERE id = v_mottagare_id;
  
  RETURN QUERY SELECT 'ok'::TEXT, v_kampanj_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Auto-radering av utgångna patienter
CREATE OR REPLACE FUNCTION rensa_utgangna_patienter()
RETURNS INTEGER AS $$
DECLARE
  antal_raderade INTEGER;
BEGIN
  DELETE FROM kort_varsel_patienter WHERE utgar_vid < NOW();
  GET DIAGNOSTICS antal_raderade = ROW_COUNT;
  RETURN antal_raderade;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Auto-radering av gamla kampanjer
CREATE OR REPLACE FUNCTION rensa_gamla_kampanjer()
RETURNS void AS $$
BEGIN
  DELETE FROM sms_kampanjer WHERE skapad_vid < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- VYER
-- ============================================

CREATE OR REPLACE VIEW kort_varsel_statistik AS
SELECT 
  COUNT(*) FILTER (WHERE skapad_vid > NOW() - INTERVAL '30 days') as kampanjer_30_dagar,
  COUNT(*) FILTER (WHERE utfall = 'fylld_via_sms' AND skapad_vid > NOW() - INTERVAL '30 days') as fyllda_via_sms,
  COUNT(*) FILTER (WHERE utfall = 'fylld_manuellt' AND skapad_vid > NOW() - INTERVAL '30 days') as fyllda_manuellt,
  COUNT(*) FILTER (WHERE utfall = 'misslyckad' AND skapad_vid > NOW() - INTERVAL '30 days') as misslyckade,
  SUM(antal_sms_skickade) FILTER (WHERE skapad_vid > NOW() - INTERVAL '30 days') as totalt_sms_skickade
FROM sms_kampanjer;

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


-- Schema version
INSERT INTO schema_version (version, description) VALUES
  (2, 'Kort varsel: kampanjer, mottagare, patientpool med prioritet')
ON CONFLICT (version) DO NOTHING;
