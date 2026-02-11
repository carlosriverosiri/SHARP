-- =============================================
-- ENHETLIGT PROJEKTSYSTEM
-- Migration: 020-unified-projects.sql
-- Datum: 2026-02-11
-- =============================================
--
-- Slår ihop ai_council_projects och kb_projects
-- till ett enda system baserat på kb_projects.
--
-- Ändringar:
-- 1. Lägger till context och auto_include_kb på kb_projects
-- 2. Migrerar ai_council_projects-data till kb_projects
-- 3. Uppdaterar ai_council_sessions.kb_project_id
-- =============================================

-- =============================================
-- 1. Lägg till nya kolumner på kb_projects
-- =============================================
ALTER TABLE kb_projects
ADD COLUMN IF NOT EXISTS context TEXT;

ALTER TABLE kb_projects
ADD COLUMN IF NOT EXISTS auto_include_kb BOOLEAN DEFAULT false;

COMMENT ON COLUMN kb_projects.context IS 'Automatisk kontext som inkluderas i alla AI Council-frågor inom projektet';
COMMENT ON COLUMN kb_projects.auto_include_kb IS 'Om true, inkluderas KB-items automatiskt som RAG-kontext vid AI Council-frågor';

-- =============================================
-- 2. Migrera ai_council_projects till kb_projects
-- =============================================
-- För varje ai_council_project som INTE redan har en
-- kb_project_id-koppling, skapa ett nytt kb_project.
-- Sedan, uppdatera ai_council_projects.kb_project_id
-- med det nya kb_project-id:t.

-- Steg 2a: Skapa kb_projects för AC-projekt utan KB-koppling
INSERT INTO kb_projects (user_id, name, description, icon, color, context, auto_include_kb, is_pinned, created_at, updated_at)
SELECT
  acp.user_id,
  acp.name,
  acp.description,
  COALESCE(acp.icon, '📁'),
  COALESCE(acp.color, '#2563eb'),
  acp.context,
  COALESCE(acp.auto_include_kb, false),
  COALESCE(acp.is_pinned, false),
  acp.created_at,
  acp.updated_at
FROM ai_council_projects acp
WHERE acp.kb_project_id IS NULL
ON CONFLICT DO NOTHING;

-- Steg 2b: Länka de nyskapade kb_projects tillbaka till ai_council_projects
-- Matchar på user_id + name + created_at
UPDATE ai_council_projects acp
SET kb_project_id = kp.id
FROM kb_projects kp
WHERE acp.kb_project_id IS NULL
  AND kp.user_id = acp.user_id
  AND kp.name = acp.name
  AND kp.created_at = acp.created_at;

-- Steg 2c: Kopiera context och auto_include_kb till befintliga KB-projekt
-- (för AC-projekt som REDAN hade en kb_project_id)
UPDATE kb_projects kp
SET
  context = COALESCE(kp.context, acp.context),
  auto_include_kb = COALESCE(acp.auto_include_kb, kp.auto_include_kb, false)
FROM ai_council_projects acp
WHERE acp.kb_project_id = kp.id
  AND (acp.context IS NOT NULL OR acp.auto_include_kb IS NOT NULL);

-- =============================================
-- 3. Migrera ai_council_sessions.project_id till kb_project_id
-- =============================================
-- Sessioner som har project_id (AI Council) men inte kb_project_id
-- ska få kb_project_id via mappningen ai_council_projects.kb_project_id
UPDATE ai_council_sessions s
SET kb_project_id = acp.kb_project_id
FROM ai_council_projects acp
WHERE s.project_id = acp.id
  AND s.kb_project_id IS NULL
  AND acp.kb_project_id IS NOT NULL;

-- =============================================
-- 4. Uppdatera hjälpfunktionen för KB-kontext
-- =============================================
-- Nu läser den direkt från kb_projects istället för
-- att gå via ai_council_projects
CREATE OR REPLACE FUNCTION get_ai_council_kb_context(p_kb_project_id UUID)
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
    (COALESCE(length(ki.content), 0) / 4)::INTEGER as tokens_estimate
  FROM kb_projects kp
  JOIN kb_items ki ON ki.project_id = kp.id
  WHERE kp.id = p_kb_project_id
    AND kp.auto_include_kb = true
  ORDER BY ki.category, ki.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. Kommentarer
-- =============================================
COMMENT ON TABLE ai_council_projects IS 'DEPRECATED: Använd kb_projects istället. Behålls för bakåtkompatibilitet.';
