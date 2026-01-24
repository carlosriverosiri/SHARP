-- ============================================
-- MIGRATION 001: Initial Setup
-- ============================================
-- Grundläggande tabeller för personalportalen
-- Skapad: 2026-01-19
-- ============================================


-- ============================================
-- TABELL: Profiles (kopplad till auth.users)
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  mobilnummer TEXT,
  avatar_url TEXT,
  vill_ha_notifikationer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN profiles.mobilnummer IS 'Personalens mobilnummer för SMS-notifikationer vid JA-svar';
COMMENT ON COLUMN profiles.vill_ha_notifikationer IS 'Om personen vill få SMS när någon svarar JA på kort varsel';
COMMENT ON COLUMN profiles.avatar_url IS 'URL till profilbild i Supabase Storage';

-- RLS för profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Användare kan läsa profiler" ON profiles;
CREATE POLICY "Användare kan läsa profiler" ON profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Användare kan uppdatera egen profil" ON profiles;
CREATE POLICY "Användare kan uppdatera egen profil" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Användare kan skapa egen profil" ON profiles;
CREATE POLICY "Användare kan skapa egen profil" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);


-- ============================================
-- TABELL: Audit-logg
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logg (
  id BIGSERIAL PRIMARY KEY,
  anvandare_id UUID REFERENCES auth.users(id),
  anvandare_email TEXT NOT NULL,
  handelse_typ TEXT NOT NULL,
  detaljer JSONB,
  ip_adress TEXT,
  user_agent TEXT,
  skapad_vid TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE audit_logg IS 'Spårar alla händelser i personalportalen';
COMMENT ON COLUMN audit_logg.handelse_typ IS 'INLOGGNING, UTLOGGNING, SMS_SKICKAT, MALL_SKAPAD, MALL_RADERAD';

CREATE INDEX IF NOT EXISTS idx_audit_anvandare ON audit_logg(anvandare_email);
CREATE INDEX IF NOT EXISTS idx_audit_typ ON audit_logg(handelse_typ);
CREATE INDEX IF NOT EXISTS idx_audit_datum ON audit_logg(skapad_vid);

ALTER TABLE audit_logg ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin kan läsa logg" ON audit_logg
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Inloggade kan logga" ON audit_logg
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Ingen kan radera logg" ON audit_logg
  FOR DELETE USING (false);


-- ============================================
-- TABELL: SMS-statistik
-- ============================================

CREATE TABLE IF NOT EXISTS sms_statistik (
  id BIGSERIAL PRIMARY KEY,
  anvandare_id UUID REFERENCES auth.users(id),
  mall_kategori TEXT NOT NULL,
  mall_namn TEXT NOT NULL,
  mottagare_suffix TEXT,
  skickad_vid TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sms_statistik IS 'SMS-statistik utan känslig patientdata (GDPR)';

ALTER TABLE sms_statistik ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personal ser egen statistik" ON sms_statistik
  FOR SELECT USING (auth.uid() = anvandare_id);

CREATE POLICY "Admin ser all statistik" ON sms_statistik
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Inloggade kan registrera SMS" ON sms_statistik
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- ============================================
-- TABELL: Rate limiting
-- ============================================

CREATE TABLE IF NOT EXISTS sms_rate_limit (
  id BIGSERIAL PRIMARY KEY,
  anvandare_id UUID REFERENCES auth.users(id) NOT NULL,
  skickad_vid TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sms_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inloggade hanterar rate limit" ON sms_rate_limit
  FOR ALL USING (auth.uid() = anvandare_id);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user_time 
  ON sms_rate_limit(anvandare_id, skickad_vid);


-- ============================================
-- TABELL: SMS-mallar
-- ============================================

CREATE TABLE IF NOT EXISTS sms_mallar (
  id BIGSERIAL PRIMARY KEY,
  kategori TEXT NOT NULL,
  namn TEXT NOT NULL,
  innehall TEXT NOT NULL,
  aktiv BOOLEAN DEFAULT true,
  skapad_av UUID REFERENCES auth.users(id),
  skapad_vid TIMESTAMPTZ DEFAULT NOW(),
  uppdaterad_vid TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sms_mallar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inloggade kan läsa mallar" ON sms_mallar
  FOR SELECT USING (auth.uid() IS NOT NULL AND aktiv = true);

CREATE POLICY "Admin hanterar mallar" ON sms_mallar
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');


-- ============================================
-- TABELL: Resurser
-- ============================================

CREATE TABLE IF NOT EXISTS resurser (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titel TEXT NOT NULL,
  url TEXT,
  fil_namn TEXT,
  fil_storlek INTEGER,
  kategori TEXT NOT NULL DEFAULT 'Övrigt',
  beskrivning TEXT,
  typ TEXT CHECK (typ IN ('länk', 'dokument', 'video')) NOT NULL,
  skapad_av UUID REFERENCES auth.users(id),
  skapad_vid TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resurser_kategori ON resurser(kategori);
CREATE INDEX IF NOT EXISTS idx_resurser_typ ON resurser(typ);

ALTER TABLE resurser ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inloggade kan läsa resurser" ON resurser
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inloggade kan skapa resurser" ON resurser
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Inloggade kan uppdatera resurser" ON resurser
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Inloggade kan ta bort resurser" ON resurser
  FOR DELETE TO authenticated USING (true);


-- ============================================
-- FUNKTIONER
-- ============================================

CREATE OR REPLACE FUNCTION kontrollera_rate_limit(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  antal_sms INTEGER;
BEGIN
  SELECT COUNT(*) INTO antal_sms
  FROM sms_rate_limit
  WHERE anvandare_id = user_id
    AND skickad_vid > NOW() - INTERVAL '1 hour';
  RETURN antal_sms < 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rensa_rate_limit()
RETURNS void AS $$
BEGIN
  DELETE FROM sms_rate_limit 
  WHERE skickad_vid < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- SCHEMA VERSION
-- ============================================

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT
);

INSERT INTO schema_version (version, description) VALUES
  (1, 'Initial setup: profiles, audit_logg, sms_statistik, rate_limit, mallar, resurser')
ON CONFLICT (version) DO NOTHING;
