-- Migration: AI Council User Profiles
-- Version: 010
-- Description: Personliga profiler för att anpassa AI-svar efter användarens bakgrund

-- Skapa tabell för användarprofiler
CREATE TABLE IF NOT EXISTS ai_council_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Grundläggande info
  role TEXT NOT NULL DEFAULT 'personal' CHECK (role IN ('lakare', 'ssk', 'admin', 'it', 'personal', 'annan')),
  role_title TEXT, -- "Ortopedkirurg", "Mottagningssköterska"
  years_experience INTEGER CHECK (years_experience >= 0 AND years_experience <= 60),
  
  -- Teknisk nivå (1-5)
  -- 1: Nybörjare (mejl, webb)
  -- 2: Grundläggande (installera program)
  -- 3: Mellan (följa tekniska instruktioner)
  -- 4: Avancerad (scripts, API:er)
  -- 5: Expert (programmerar, systemarkitektur)
  technical_level INTEGER NOT NULL DEFAULT 2 CHECK (technical_level BETWEEN 1 AND 5),
  
  -- Kunskaper (arrays)
  it_skills TEXT[] DEFAULT '{}',
  medical_specialties TEXT[] DEFAULT '{}',
  
  -- Fritext
  background TEXT, -- Fri beskrivning av bakgrund
  can_do TEXT,     -- Vad användaren kan göra
  cannot_do TEXT,  -- Vad användaren INTE kan göra
  
  -- Preferenser för AI-svar
  response_style TEXT NOT NULL DEFAULT 'balanced' 
    CHECK (response_style IN ('detailed', 'balanced', 'concise', 'step-by-step')),
  include_code_examples BOOLEAN NOT NULL DEFAULT true,
  include_references BOOLEAN NOT NULL DEFAULT false,
  preferred_language TEXT NOT NULL DEFAULT 'sv',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- En profil per användare
  UNIQUE(user_id)
);

-- Skapa index för snabba uppslag
CREATE INDEX IF NOT EXISTS idx_ai_council_profiles_user_id ON ai_council_profiles(user_id);

-- Row Level Security
ALTER TABLE ai_council_profiles ENABLE ROW LEVEL SECURITY;

-- Användare kan se sin egen profil
CREATE POLICY "Users can view own profile"
  ON ai_council_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Användare kan uppdatera sin egen profil
CREATE POLICY "Users can update own profile"
  ON ai_council_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Användare kan skapa sin egen profil
CREATE POLICY "Users can insert own profile"
  ON ai_council_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Användare kan ta bort sin egen profil
CREATE POLICY "Users can delete own profile"
  ON ai_council_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger för att uppdatera updated_at
CREATE OR REPLACE FUNCTION update_ai_council_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_council_profiles_updated_at ON ai_council_profiles;
CREATE TRIGGER ai_council_profiles_updated_at
  BEFORE UPDATE ON ai_council_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_council_profiles_updated_at();

-- Kommentar för dokumentation
COMMENT ON TABLE ai_council_profiles IS 'Användarprofiler för AI Council - anpassar AI-svar efter användarens bakgrund och kunskapsnivå';
COMMENT ON COLUMN ai_council_profiles.technical_level IS '1=Nybörjare, 2=Grundläggande, 3=Mellan, 4=Avancerad, 5=Expert';
COMMENT ON COLUMN ai_council_profiles.response_style IS 'detailed=Fullständiga förklaringar, balanced=Lagom, concise=Kort, step-by-step=Numrerade steg';
