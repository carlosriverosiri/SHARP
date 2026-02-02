-- Migration: Add metadata columns to ai_council_sessions
-- This adds support for tracking which models were used, profile, deliberation status, etc.

-- Add response_grok column for Grok/xAI responses
ALTER TABLE ai_council_sessions 
ADD COLUMN IF NOT EXISTS response_grok JSONB;

-- Add round2_responses for deliberation (Runda 2)
ALTER TABLE ai_council_sessions 
ADD COLUMN IF NOT EXISTS round2_responses JSONB;

-- Add supersynthesis column (separate from regular synthesis)
ALTER TABLE ai_council_sessions 
ADD COLUMN IF NOT EXISTS supersynthesis TEXT;

-- Add metadata columns
ALTER TABLE ai_council_sessions 
ADD COLUMN IF NOT EXISTS selected_models TEXT[];

ALTER TABLE ai_council_sessions 
ADD COLUMN IF NOT EXISTS profile VARCHAR(50);

ALTER TABLE ai_council_sessions 
ADD COLUMN IF NOT EXISTS deliberation_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE ai_council_sessions 
ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10, 6);

-- Create index for profile filtering
CREATE INDEX IF NOT EXISTS idx_ai_council_sessions_profile 
ON ai_council_sessions(profile);

-- Create index for deliberation filtering
CREATE INDEX IF NOT EXISTS idx_ai_council_sessions_deliberation 
ON ai_council_sessions(deliberation_enabled);

-- Add comment explaining the columns
COMMENT ON COLUMN ai_council_sessions.response_grok IS 'Response from Grok/xAI model';
COMMENT ON COLUMN ai_council_sessions.round2_responses IS 'Responses from deliberation round (Runda 2)';
COMMENT ON COLUMN ai_council_sessions.supersynthesis IS 'Synthesis after deliberation (supersyntes)';
COMMENT ON COLUMN ai_council_sessions.selected_models IS 'Array of model keys used (openai, anthropic, google, grok)';
COMMENT ON COLUMN ai_council_sessions.profile IS 'Profile used (snabb, patient, kodning, vetenskap, strategi, custom)';
COMMENT ON COLUMN ai_council_sessions.deliberation_enabled IS 'Whether deliberation (Runda 2) was run';
COMMENT ON COLUMN ai_council_sessions.total_cost IS 'Total cost in USD for the session';
