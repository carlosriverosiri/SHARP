-- ============================================
-- SUPABASE DATABAS-SCHEMA FÖR PERSONALPORTALEN
-- ============================================
-- 
-- Kör detta i Supabase Dashboard → SQL Editor
-- 
-- Skapad: 2026-01-19
-- Version: 1.0
-- ============================================

-- ============================================
-- TABELL: Audit-logg
-- Spårar alla händelser i portalen
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

-- Kommentarer
COMMENT ON TABLE audit_logg IS 'Spårar alla händelser i personalportalen';
COMMENT ON COLUMN audit_logg.handelse_typ IS 'INLOGGNING, UTLOGGNING, SMS_SKICKAT, MALL_SKAPAD, MALL_RADERAD';
COMMENT ON COLUMN audit_logg.detaljer IS 'JSON med extra information om händelsen';

-- Index för snabba sökningar
CREATE INDEX IF NOT EXISTS idx_audit_anvandare ON audit_logg(anvandare_email);
CREATE INDEX IF NOT EXISTS idx_audit_typ ON audit_logg(handelse_typ);
CREATE INDEX IF NOT EXISTS idx_audit_datum ON audit_logg(skapad_vid);

-- Row Level Security (säkerhet)
ALTER TABLE audit_logg ENABLE ROW LEVEL SECURITY;

-- Endast admin kan läsa loggen
CREATE POLICY "Admin kan läsa logg" ON audit_logg
  FOR SELECT USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

-- Alla inloggade kan skriva (för sin egen aktivitet)
CREATE POLICY "Inloggade kan logga" ON audit_logg
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- KRITISKT: Ingen kan radera sina egna loggar!
CREATE POLICY "Ingen kan radera logg" ON audit_logg
  FOR DELETE USING (false);


-- ============================================
-- TABELL: SMS-statistik
-- Spårar skickade SMS (utan känslig data)
-- ============================================

CREATE TABLE IF NOT EXISTS sms_statistik (
  id BIGSERIAL PRIMARY KEY,
  anvandare_id UUID REFERENCES auth.users(id),
  mall_kategori TEXT NOT NULL,
  mall_namn TEXT NOT NULL,
  mottagare_suffix TEXT,  -- Endast sista 2 siffror (GDPR)
  skickad_vid TIMESTAMPTZ DEFAULT NOW()
);

-- Kommentarer
COMMENT ON TABLE sms_statistik IS 'SMS-statistik utan känslig patientdata (GDPR)';
COMMENT ON COLUMN sms_statistik.mottagare_suffix IS 'Endast sista 2 siffror, t.ex. **67';

-- RLS för SMS-statistik
ALTER TABLE sms_statistik ENABLE ROW LEVEL SECURITY;

-- Personal ser sin egen statistik
CREATE POLICY "Personal ser egen statistik" ON sms_statistik
  FOR SELECT USING (auth.uid() = anvandare_id);

-- Admin ser all statistik
CREATE POLICY "Admin ser all statistik" ON sms_statistik
  FOR SELECT USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

-- Inloggade kan registrera SMS
CREATE POLICY "Inloggade kan registrera SMS" ON sms_statistik
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- ============================================
-- TABELL: Rate limiting
-- Förhindrar SMS-missbruk
-- ============================================

CREATE TABLE IF NOT EXISTS sms_rate_limit (
  id BIGSERIAL PRIMARY KEY,
  anvandare_id UUID REFERENCES auth.users(id) NOT NULL,
  skickad_vid TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE sms_rate_limit ENABLE ROW LEVEL SECURITY;

-- Alla inloggade kan läsa/skriva sin egen rate limit
CREATE POLICY "Inloggade hanterar rate limit" ON sms_rate_limit
  FOR ALL USING (auth.uid() = anvandare_id);

-- Index för snabb sökning
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_time 
  ON sms_rate_limit(anvandare_id, skickad_vid);


-- ============================================
-- FUNKTION: Kontrollera rate limit
-- Returnerar true om användaren får skicka fler SMS
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
  
  -- Max 20 SMS per timme
  RETURN antal_sms < 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- FUNKTION: Rensa gamla rate limit-poster
-- Kör dagligen via Supabase cron eller manuellt
-- ============================================

CREATE OR REPLACE FUNCTION rensa_rate_limit()
RETURNS void AS $$
BEGIN
  DELETE FROM sms_rate_limit 
  WHERE skickad_vid < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- VYER: Statistik för admin-dashboard
-- ============================================

-- Vy: Populäraste mallar (topp 10)
CREATE OR REPLACE VIEW populara_mallar AS
SELECT 
  mall_namn,
  mall_kategori,
  COUNT(*) as antal,
  MAX(skickad_vid) as senast_anvand
FROM sms_statistik
GROUP BY mall_namn, mall_kategori
ORDER BY antal DESC
LIMIT 10;

-- Vy: Användning per person
CREATE OR REPLACE VIEW anvandning_per_person AS
SELECT 
  u.email,
  COUNT(s.id) as antal_sms,
  MAX(s.skickad_vid) as senast_aktivitet
FROM auth.users u
LEFT JOIN sms_statistik s ON u.id = s.anvandare_id
GROUP BY u.id, u.email
ORDER BY antal_sms DESC;

-- Vy: SMS denna månad (för kostnadskontroll)
CREATE OR REPLACE VIEW sms_denna_manad AS
SELECT 
  COUNT(*) as antal_sms,
  ROUND(COUNT(*) * 0.50, 2) as uppskattad_kostnad_kr
FROM sms_statistik
WHERE skickad_vid > DATE_TRUNC('month', NOW());

-- Vy: SMS per dag (senaste 30 dagarna)
CREATE OR REPLACE VIEW sms_per_dag AS
SELECT 
  DATE(skickad_vid) as datum,
  COUNT(*) as antal
FROM sms_statistik
WHERE skickad_vid > NOW() - INTERVAL '30 days'
GROUP BY DATE(skickad_vid)
ORDER BY datum DESC;


-- ============================================
-- TABELL: SMS-mallar
-- Fördefinierade mallar för SMS
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

-- Kommentarer
COMMENT ON TABLE sms_mallar IS 'Fördefinierade SMS-mallar';
COMMENT ON COLUMN sms_mallar.kategori IS 'Kategori: info, kallelse, parminnelse, etc.';
COMMENT ON COLUMN sms_mallar.innehall IS 'Malltext med [LÄNK] som placeholder';

-- RLS
ALTER TABLE sms_mallar ENABLE ROW LEVEL SECURITY;

-- Alla inloggade kan läsa mallar
CREATE POLICY "Inloggade kan läsa mallar" ON sms_mallar
  FOR SELECT USING (auth.uid() IS NOT NULL AND aktiv = true);

-- Admin kan skapa/uppdatera/ta bort mallar
CREATE POLICY "Admin hanterar mallar" ON sms_mallar
  FOR ALL USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );


-- ============================================
-- SEED DATA: Exempel-mallar
-- ============================================

INSERT INTO sms_mallar (kategori, namn, innehall) VALUES
  ('info', 'Undersökningsresultat - normalt', 
   'Hej! Ditt undersökningsresultat ser bra ut. Har du frågor, ring oss på 08-123 45 67. /Axelspecialisten'),
  
  ('info', 'Sjukskrivningspolicy', 
   'Hej! Läs om vår sjukskrivningspolicy här: [LÄNK] Har du frågor, ring oss. /Axelspecialisten'),
  
  ('info', 'Receptpolicy', 
   'Hej! Läs om vår receptpolicy här: [LÄNK] Kontakta oss vid frågor. /Axelspecialisten'),
  
  ('kallelse', 'Kallelse - mottagning', 
   'Välkommen till ditt besök! Information om besöket hittar du här: [LÄNK] /Axelspecialisten'),
  
  ('kallelse', 'Kallelse - operation', 
   'Välkommen till din operation! Viktig info före operationen: [LÄNK] Ring oss om du har frågor. /Axelspecialisten'),
  
  ('paminnelse', 'Påminnelse - recept', 
   'Påminnelse: Ditt recept behöver förnyas. Kontakta din vårdcentral. Info: [LÄNK] /Axelspecialisten'),
  
  ('rehab', 'Rehabprogram - axel', 
   'Hej! Här är ditt rehabprogram: [LÄNK] Följ övningarna dagligen. Ring vid frågor. /Axelspecialisten'),
  
  ('rehab', 'Rehabprogram - knä', 
   'Hej! Här är ditt rehabprogram: [LÄNK] Följ övningarna dagligen. Ring vid frågor. /Axelspecialisten')
ON CONFLICT DO NOTHING;


-- ============================================
-- SCHEMA-VERSION
-- ============================================

-- Skapa en tabell för att spåra schema-version
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT
);

INSERT INTO schema_version (version, description) VALUES
  (1, 'Initial schema: audit_logg, sms_statistik, sms_rate_limit, sms_mallar'),
  (2, 'Resurser: dokument, länkar, instruktionsvideor')
ON CONFLICT (version) DO NOTHING;


-- ============================================
-- TABELL: Resurser
-- Dokument, länkar och instruktionsvideor för personal
-- ============================================

CREATE TABLE IF NOT EXISTS resurser (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titel TEXT NOT NULL,
  url TEXT,                                    -- För länkar/videos
  fil_namn TEXT,                               -- För uppladdade dokument
  fil_storlek INTEGER,                         -- Filstorlek i bytes
  kategori TEXT NOT NULL DEFAULT 'Övrigt',
  beskrivning TEXT,
  typ TEXT CHECK (typ IN ('länk', 'dokument', 'video')) NOT NULL,
  skapad_av UUID REFERENCES auth.users(id),
  skapad_vid TIMESTAMPTZ DEFAULT NOW()
);

-- Kommentarer
COMMENT ON TABLE resurser IS 'Dokument, länkar och instruktionsvideor för personalens kunskapsbank';
COMMENT ON COLUMN resurser.typ IS 'länk = vanlig URL, dokument = uppladdat fil, video = YouTube/Vimeo';
COMMENT ON COLUMN resurser.kategori IS 'T.ex. Journalsystem, Region Stockholm, Rutiner, Onboarding';

-- Index
CREATE INDEX IF NOT EXISTS idx_resurser_kategori ON resurser(kategori);
CREATE INDEX IF NOT EXISTS idx_resurser_typ ON resurser(typ);
CREATE INDEX IF NOT EXISTS idx_resurser_skapad ON resurser(skapad_vid);

-- Row Level Security
ALTER TABLE resurser ENABLE ROW LEVEL SECURITY;

-- Policy: Inloggade användare kan läsa
CREATE POLICY "Inloggade kan läsa resurser" ON resurser
  FOR SELECT TO authenticated USING (true);

-- Policy: Inloggade användare kan skapa
CREATE POLICY "Inloggade kan skapa resurser" ON resurser
  FOR INSERT TO authenticated WITH CHECK (true);

-- Policy: Inloggade användare kan uppdatera
CREATE POLICY "Inloggade kan uppdatera resurser" ON resurser
  FOR UPDATE TO authenticated USING (true);

-- Policy: Inloggade användare kan ta bort
CREATE POLICY "Inloggade kan ta bort resurser" ON resurser
  FOR DELETE TO authenticated USING (true);


-- ============================================
-- KLART!
-- ============================================
-- 
-- Nästa steg:
-- 1. Gå till Authentication → Settings → Enable MFA (för admin)
-- 2. Bjud in användare via Authentication → Users → Invite user
-- 3. Sätt admin-roll på en användare:
--    UPDATE auth.users SET raw_app_meta_data = 
--      raw_app_meta_data || '{"role": "admin"}' 
--    WHERE email = 'admin@din-domain.se';
--
-- ============================================
