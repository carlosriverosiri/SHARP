-- Migration: AI Council Projects
-- Version: 012
-- Description: Adds project organization for AI Council sessions

-- =============================================
-- 1. Create projects table
-- =============================================
CREATE TABLE IF NOT EXISTS ai_council_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    context TEXT,  -- Auto-inkluderas i alla frågor i projektet
    color TEXT DEFAULT '#2563eb',  -- Färg för visuell identifiering
    icon TEXT DEFAULT '📁',  -- Emoji-ikon
    is_pinned BOOLEAN DEFAULT false,  -- Pinnades projekt visas överst
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. Add project_id to sessions (nullable for "Osorterade")
-- =============================================
ALTER TABLE ai_council_sessions 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES ai_council_projects(id) ON DELETE SET NULL;

-- =============================================
-- 3. Enable RLS
-- =============================================
ALTER TABLE ai_council_projects ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. RLS Policies for projects
-- =============================================
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

-- =============================================
-- 5. Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_ai_council_projects_user_id 
    ON ai_council_projects(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_council_projects_pinned 
    ON ai_council_projects(user_id, is_pinned DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_council_sessions_project_id 
    ON ai_council_sessions(project_id);

-- =============================================
-- 6. Auto-update timestamp trigger
-- =============================================
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
-- 7. Comments for documentation
-- =============================================
COMMENT ON TABLE ai_council_projects IS 'Projektmappar för att organisera AI Council-sessioner';
COMMENT ON COLUMN ai_council_projects.context IS 'Automatisk kontext som inkluderas i alla frågor inom projektet';
COMMENT ON COLUMN ai_council_projects.color IS 'Hex-färg för visuell identifiering i sidebaren';
COMMENT ON COLUMN ai_council_projects.is_pinned IS 'Pinnnade projekt visas alltid överst i listan';
