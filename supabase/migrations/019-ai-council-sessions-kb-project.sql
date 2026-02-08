-- =============================================
-- AI Council: Koppla sessioner till KB-projekt
-- =============================================
-- Migrering: 019-ai-council-sessions-kb-project.sql
-- Datum: 2026-01-27
-- Beskrivning: Lägger till kb_project_id på sessioner
-- =============================================

ALTER TABLE ai_council_sessions
ADD COLUMN IF NOT EXISTS kb_project_id UUID REFERENCES kb_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_council_sessions_kb_project
ON ai_council_sessions(kb_project_id)
WHERE kb_project_id IS NOT NULL;

COMMENT ON COLUMN ai_council_sessions.kb_project_id IS 'Koppling till Kunskapsbas-projekt för historik och synteser';
