-- =============================================
-- KB <-> AI COUNCIL KOPPLING
-- Migration: 018-kb-ai-council-link.sql
-- =============================================
-- 
-- Kopplar ihop AI Council-projekt med Kunskapsbas-projekt
-- for automatisk RAG-kontext vid fragor.
--
-- Anvandning:
-- 1. Valj ett AI Council-projekt
-- 2. Koppla till ett KB-projekt
-- 3. Vid fraga inkluderas alla KB-items automatiskt som kontext
-- =============================================

-- Lagg till koppling till kb_projects
ALTER TABLE ai_council_projects 
ADD COLUMN IF NOT EXISTS kb_project_id UUID REFERENCES kb_projects(id) ON DELETE SET NULL;

-- Flagga for automatisk inkludering
ALTER TABLE ai_council_projects
ADD COLUMN IF NOT EXISTS auto_include_kb BOOLEAN DEFAULT false;

-- Index for snabb sokning
CREATE INDEX IF NOT EXISTS idx_ai_council_projects_kb 
ON ai_council_projects(kb_project_id) 
WHERE kb_project_id IS NOT NULL;

-- Kommentarer
COMMENT ON COLUMN ai_council_projects.kb_project_id IS 'Koppling till Kunskapsbas-projekt for automatisk RAG-kontext';
COMMENT ON COLUMN ai_council_projects.auto_include_kb IS 'Om true, inkluderas KB-innehall automatiskt vid fragor';

-- =============================================
-- HJALPFUNKTION: Hamta KB-kontext for ett AI Council-projekt
-- =============================================
CREATE OR REPLACE FUNCTION get_ai_council_kb_context(p_project_id UUID)
RETURNS TABLE (
  item_id UUID,
  title TEXT,
  content TEXT,
  summary TEXT,
  category TEXT,
  tokens_estimate INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ki.id as item_id,
    ki.title,
    ki.content,
    ki.summary,
    ki.category,
    -- Grov tokenuppskattning: ~4 tecken per token
    (COALESCE(length(ki.content), 0) / 4)::INTEGER as tokens_estimate
  FROM ai_council_projects acp
  JOIN kb_items ki ON ki.project_id = acp.kb_project_id
  WHERE acp.id = p_project_id
    AND acp.kb_project_id IS NOT NULL
    AND acp.auto_include_kb = true
  ORDER BY ki.category, ki.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- HJALPFUNKTION: Rakna totala tokens for ett KB-projekt
-- =============================================
CREATE OR REPLACE FUNCTION get_kb_project_token_estimate(p_kb_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_tokens INTEGER;
BEGIN
  SELECT COALESCE(SUM(length(content) / 4), 0)::INTEGER
  INTO total_tokens
  FROM kb_items
  WHERE project_id = p_kb_project_id;
  
  RETURN total_tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;