-- =============================================
-- AI Council: Sessionslogg och anteckningar
-- =============================================
-- Migrering: 009-ai-council.sql
-- Datum: 2026-01-25
-- Beskrivning: Lagring för AI Council-sessioner
-- =============================================

-- Tabell för AI Council-sessioner
CREATE TABLE IF NOT EXISTS ai_council_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Frågedata
    prompt TEXT NOT NULL,
    context TEXT,
    
    -- Svar från varje modell (JSON)
    response_openai JSONB,
    response_anthropic JSONB,
    response_google JSONB,
    
    -- Syntes
    synthesis TEXT,
    synthesis_model TEXT, -- Vilken modell som gjorde syntesen
    
    -- Metadata
    total_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Taggar för organisering
    tags TEXT[] DEFAULT '{}'
);

-- Index för snabb sökning
CREATE INDEX idx_ai_council_user ON ai_council_sessions(user_id);
CREATE INDEX idx_ai_council_created ON ai_council_sessions(created_at DESC);
CREATE INDEX idx_ai_council_tags ON ai_council_sessions USING GIN(tags);

-- RLS (Row Level Security)
ALTER TABLE ai_council_sessions ENABLE ROW LEVEL SECURITY;

-- Användare kan bara se sina egna sessioner
CREATE POLICY "Users can view own sessions"
    ON ai_council_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Användare kan skapa egna sessioner
CREATE POLICY "Users can create own sessions"
    ON ai_council_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Användare kan uppdatera egna sessioner
CREATE POLICY "Users can update own sessions"
    ON ai_council_sessions
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Användare kan ta bort egna sessioner
CREATE POLICY "Users can delete own sessions"
    ON ai_council_sessions
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- Kommentarer
-- =============================================
COMMENT ON TABLE ai_council_sessions IS 'Sparade AI Council-sessioner för användare';
COMMENT ON COLUMN ai_council_sessions.prompt IS 'Användarens ursprungliga fråga';
COMMENT ON COLUMN ai_council_sessions.context IS 'Valfri kontext (kod, dokument, etc)';
COMMENT ON COLUMN ai_council_sessions.synthesis_model IS 'Modell som användes för syntes (claude/openai/gemini)';
