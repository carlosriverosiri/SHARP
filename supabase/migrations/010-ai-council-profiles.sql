-- =============================================
-- AI Council: Användarprofiler
-- =============================================
-- Migrering: 010-ai-council-profiles.sql
-- Datum: 2026-01-23
-- Beskrivning: Utökar profiles med AI Council-specifika fält
-- =============================================

-- =============================================
-- Lägg till AI-profilfält i befintlig profiles-tabell
-- =============================================

-- Profiltyp (roll)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_profil_typ TEXT DEFAULT 'annan';
COMMENT ON COLUMN profiles.ai_profil_typ IS 'Rolltyp: lakare, sjukskoterska, fysioterapeut, sekreterare, annan';

-- Bakgrundsbeskrivning (fritext)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_profil_bakgrund TEXT;
COMMENT ON COLUMN profiles.ai_profil_bakgrund IS 'Beskrivning av användarens bakgrund för AI-kontext';

-- Expertisområden (array)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_profil_expertis TEXT[] DEFAULT '{}';
COMMENT ON COLUMN profiles.ai_profil_expertis IS 'Lista över expertisområden, t.ex. {"ortopedi", "axel", "knä"}';

-- Prefererade modeller
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_default_models TEXT[] DEFAULT '{"openai", "anthropic", "gemini"}';
COMMENT ON COLUMN profiles.ai_default_models IS 'Förinställda AI-modeller för AI Council';

-- Prefererad syntes-modell  
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_default_synthesis TEXT DEFAULT 'claude';
COMMENT ON COLUMN profiles.ai_default_synthesis IS 'Förinställd syntes-modell: claude, claude-opus, openai, gpt4o, gemini, grok';

-- Inkludera profil automatiskt
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_auto_inkludera_profil BOOLEAN DEFAULT true;
COMMENT ON COLUMN profiles.ai_auto_inkludera_profil IS 'Om profilen ska inkluderas automatiskt i AI Council-prompts';

-- =============================================
-- Fördefinierade profilmallar (valfritt)
-- =============================================

CREATE TABLE IF NOT EXISTS ai_profil_mallar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    namn TEXT NOT NULL UNIQUE,
    typ TEXT NOT NULL,
    bakgrund_mall TEXT,
    expertis_default TEXT[] DEFAULT '{}',
    ikon TEXT,
    ordning INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ai_profil_mallar IS 'Fördefinierade profilmallar för snabbval';

-- Sätt in standardmallar
INSERT INTO ai_profil_mallar (namn, typ, bakgrund_mall, expertis_default, ikon, ordning)
VALUES 
    ('Läkare', 'lakare', 
     'Jag är läkare med fokus på ortopedi. Jag arbetar med diagnostik och behandling av muskuloskeletala besvär.',
     '{"ortopedi", "kirurgi", "diagnostik"}',
     '🩺', 1),
    ('Sjuksköterska', 'sjukskoterska',
     'Jag är sjuksköterska med erfarenhet inom ortopedi och dagkirurgi. Jag arbetar med patientomhändertagande och eftervård.',
     '{"omvårdnad", "eftervård", "patientkommunikation"}',
     '💉', 2),
    ('Fysioterapeut', 'fysioterapeut',
     'Jag är fysioterapeut specialiserad på rehabilitering efter ortopediska ingrepp.',
     '{"rehabilitering", "träning", "smärtlindring"}',
     '🏃', 3),
    ('Medicinsk sekreterare', 'sekreterare',
     'Jag är medicinsk sekreterare och arbetar med administration, journalföring och patientkontakt.',
     '{"administration", "journalföring", "bokningar"}',
     '📋', 4),
    ('Forskare', 'forskare',
     'Jag arbetar med klinisk forskning inom ortopedi, med fokus på evidensbaserad medicin.',
     '{"forskning", "litteraturöversikt", "statistik"}',
     '🔬', 5)
ON CONFLICT (namn) DO NOTHING;

-- RLS för profilmallar (alla kan läsa)
ALTER TABLE ai_profil_mallar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alla kan läsa profilmallar"
    ON ai_profil_mallar
    FOR SELECT
    USING (true);

-- =============================================
-- Utöka ai_council_sessions med profilreferens
-- =============================================

-- Lägg till kolumn för vilken profil som användes
ALTER TABLE ai_council_sessions ADD COLUMN IF NOT EXISTS profil_använd JSONB;
COMMENT ON COLUMN ai_council_sessions.profil_använd IS 'Snapshot av användarens profil vid tidpunkten för sessionen';

-- =============================================
-- Index för nya fält
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_ai_typ ON profiles(ai_profil_typ);
CREATE INDEX IF NOT EXISTS idx_profiles_ai_expertis ON profiles USING GIN(ai_profil_expertis);
