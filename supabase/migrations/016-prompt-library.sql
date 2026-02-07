-- =============================================
-- AI Council: Promptbibliotek
-- =============================================
-- Migrering: 016-prompt-library.sql
-- Datum: 2026-01-27
-- Beskrivning: Sparade prompter for ateranvandning
-- =============================================

-- Tabell for sparade prompter
CREATE TABLE IF NOT EXISTS ai_council_prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Promptdata
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    description TEXT, -- Valfri beskrivning
    
    -- Kategorisering
    category TEXT, -- T.ex. 'medicin', 'finans', 'kod'
    tags TEXT[] DEFAULT '{}',
    
    -- Metadata
    use_count INTEGER DEFAULT 0, -- Antal ganger prompten anvants
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for snabb sokning
CREATE INDEX idx_prompts_user ON ai_council_prompts(user_id);
CREATE INDEX idx_prompts_created ON ai_council_prompts(created_at DESC);
CREATE INDEX idx_prompts_category ON ai_council_prompts(category);
CREATE INDEX idx_prompts_tags ON ai_council_prompts USING GIN(tags);

-- RLS (Row Level Security)
ALTER TABLE ai_council_prompts ENABLE ROW LEVEL SECURITY;

-- Anvandare kan bara se sina egna prompter
CREATE POLICY "Users can view own prompts"
    ON ai_council_prompts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Anvandare kan skapa egna prompter
CREATE POLICY "Users can create own prompts"
    ON ai_council_prompts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Anvandare kan uppdatera egna prompter
CREATE POLICY "Users can update own prompts"
    ON ai_council_prompts
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Anvandare kan ta bort egna prompter
CREATE POLICY "Users can delete own prompts"
    ON ai_council_prompts
    FOR DELETE
    USING (auth.uid() = user_id);

-- Funktion for att uppdatera updated_at automatiskt
CREATE OR REPLACE FUNCTION update_prompt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prompt_updated_at
    BEFORE UPDATE ON ai_council_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_prompt_updated_at();

-- =============================================
-- Kommentarer
-- =============================================
COMMENT ON TABLE ai_council_prompts IS 'Sparade prompter for ateranvandning i AI Council';
COMMENT ON COLUMN ai_council_prompts.name IS 'Kort namn for prompten';
COMMENT ON COLUMN ai_council_prompts.prompt IS 'Sjalva prompttexten';
COMMENT ON COLUMN ai_council_prompts.category IS 'Valfri kategori (medicin, finans, etc)';
COMMENT ON COLUMN ai_council_prompts.use_count IS 'Antal ganger prompten anvants';