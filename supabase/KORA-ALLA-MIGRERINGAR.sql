-- =============================================
-- FIX: Lägg till saknade kolumner och tabeller
-- Kör denna fil i Supabase SQL Editor
-- =============================================

-- =============================================
-- 009: Fixa ai_council_sessions
-- =============================================

-- Lägg till saknade kolumner om de inte finns
ALTER TABLE ai_council_sessions ADD COLUMN IF NOT EXISTS total_duration_ms INTEGER;
ALTER TABLE ai_council_sessions ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_ai_council_user ON ai_council_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_council_created ON ai_council_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_council_tags ON ai_council_sessions USING GIN(tags);

-- =============================================
-- 010: AI Council Profiles
-- =============================================

CREATE TABLE IF NOT EXISTS ai_council_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL DEFAULT 'personal' CHECK (role IN ('lakare', 'ssk', 'admin', 'it', 'personal', 'annan')),
  role_title TEXT,
  years_experience INTEGER CHECK (years_experience >= 0 AND years_experience <= 60),
  
  technical_level INTEGER NOT NULL DEFAULT 2 CHECK (technical_level BETWEEN 1 AND 5),
  
  it_skills TEXT[] DEFAULT '{}',
  medical_specialties TEXT[] DEFAULT '{}',
  
  background TEXT,
  can_do TEXT,
  cannot_do TEXT,
  
  response_style TEXT NOT NULL DEFAULT 'balanced' 
    CHECK (response_style IN ('detailed', 'balanced', 'concise', 'step-by-step')),
  include_code_examples BOOLEAN NOT NULL DEFAULT true,
  include_references BOOLEAN NOT NULL DEFAULT false,
  preferred_language TEXT NOT NULL DEFAULT 'sv',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_council_profiles_user_id ON ai_council_profiles(user_id);

ALTER TABLE ai_council_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON ai_council_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON ai_council_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON ai_council_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON ai_council_profiles;

CREATE POLICY "Users can view own profile"
  ON ai_council_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON ai_council_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON ai_council_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON ai_council_profiles FOR DELETE
  USING (auth.uid() = user_id);

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

-- =============================================
-- 011: Scientific Context
-- =============================================

ALTER TABLE ai_council_profiles 
ADD COLUMN IF NOT EXISTS scientific_context TEXT;

-- =============================================
-- 012: AI Council Projects
-- =============================================

CREATE TABLE IF NOT EXISTS ai_council_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    context TEXT,
    color TEXT DEFAULT '#2563eb',
    icon TEXT DEFAULT '📁',
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_council_sessions 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES ai_council_projects(id) ON DELETE SET NULL;

ALTER TABLE ai_council_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own projects" ON ai_council_projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON ai_council_projects;
DROP POLICY IF EXISTS "Users can update own projects" ON ai_council_projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON ai_council_projects;

CREATE POLICY "Users can view own projects" 
    ON ai_council_projects FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" 
    ON ai_council_projects FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
    ON ai_council_projects FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
    ON ai_council_projects FOR DELETE 
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_council_projects_user_id 
    ON ai_council_projects(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_council_projects_pinned 
    ON ai_council_projects(user_id, is_pinned DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_council_sessions_project_id 
    ON ai_council_sessions(project_id);

CREATE OR REPLACE FUNCTION update_ai_council_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_ai_council_projects_timestamp ON ai_council_projects;

CREATE TRIGGER trigger_update_ai_council_projects_timestamp
    BEFORE UPDATE ON ai_council_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_council_projects_updated_at();

-- =============================================
-- 013: Zotero Integration
-- =============================================

CREATE TABLE IF NOT EXISTS ai_council_zotero_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  zotero_user_id TEXT NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  library_type TEXT DEFAULT 'user',
  default_collection_key TEXT,
  
  display_name TEXT,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_zotero_configs_user_id ON ai_council_zotero_configs(user_id);

ALTER TABLE ai_council_zotero_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own zotero config" ON ai_council_zotero_configs;
DROP POLICY IF EXISTS "Users can create own zotero config" ON ai_council_zotero_configs;
DROP POLICY IF EXISTS "Users can update own zotero config" ON ai_council_zotero_configs;
DROP POLICY IF EXISTS "Users can delete own zotero config" ON ai_council_zotero_configs;

CREATE POLICY "Users can view own zotero config"
  ON ai_council_zotero_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own zotero config"
  ON ai_council_zotero_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own zotero config"
  ON ai_council_zotero_configs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own zotero config"
  ON ai_council_zotero_configs FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS ai_council_zotero_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  cache_key TEXT NOT NULL,
  search_query TEXT,
  result_data JSONB NOT NULL,
  result_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  UNIQUE(user_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_zotero_cache_lookup 
  ON ai_council_zotero_cache(user_id, cache_key, expires_at);

CREATE INDEX IF NOT EXISTS idx_zotero_cache_expiry 
  ON ai_council_zotero_cache(expires_at);

ALTER TABLE ai_council_zotero_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own zotero cache" ON ai_council_zotero_cache;

CREATE POLICY "Users can manage own zotero cache"
  ON ai_council_zotero_cache FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION cleanup_zotero_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_council_zotero_cache
  WHERE expires_at < CURRENT_TIMESTAMP;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_zotero_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_zotero_config_timestamp ON ai_council_zotero_configs;

CREATE TRIGGER trigger_update_zotero_config_timestamp
  BEFORE UPDATE ON ai_council_zotero_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_zotero_config_timestamp();

-- =============================================
-- 014: AI Council Drafts
-- =============================================

CREATE TABLE IF NOT EXISTS ai_council_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT DEFAULT '',
  context TEXT DEFAULT '',
  responses JSONB DEFAULT '{}',
  r2_responses JSONB DEFAULT '{}',
  has_run_deliberation BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_draft UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_council_drafts_user_id ON ai_council_drafts(user_id);

ALTER TABLE ai_council_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own drafts" ON ai_council_drafts;
DROP POLICY IF EXISTS "Users can insert own drafts" ON ai_council_drafts;
DROP POLICY IF EXISTS "Users can update own drafts" ON ai_council_drafts;
DROP POLICY IF EXISTS "Users can delete own drafts" ON ai_council_drafts;

CREATE POLICY "Users can view own drafts"
  ON ai_council_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts"
  ON ai_council_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts"
  ON ai_council_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts"
  ON ai_council_drafts FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- KLART! 🎉
-- =============================================
