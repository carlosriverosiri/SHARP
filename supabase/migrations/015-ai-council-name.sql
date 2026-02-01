-- =============================================
-- AI Council: Lägg till name-kolumn
-- =============================================
-- Migrering: 015-ai-council-name.sql
-- Datum: 2026-01-30
-- Beskrivning: Lägger till name-kolumn för session-namn
-- =============================================

-- Lägg till name-kolumn om den inte finns
ALTER TABLE ai_council_sessions 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Kommentar
COMMENT ON COLUMN ai_council_sessions.name IS 'Valfritt användardefinierat namn för sessionen';
