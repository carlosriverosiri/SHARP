-- AI Council Drafts - Auto-save work-in-progress responses
-- Each user has ONE draft that gets updated as they work

CREATE TABLE IF NOT EXISTS ai_council_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT DEFAULT '',
  context TEXT DEFAULT '',
  responses JSONB DEFAULT '{}',  -- { gemini: {...}, anthropic: {...}, etc }
  r2_responses JSONB DEFAULT '{}',  -- Round 2 deliberation responses
  has_run_deliberation BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each user can only have ONE draft
  CONSTRAINT unique_user_draft UNIQUE (user_id)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_ai_council_drafts_user_id ON ai_council_drafts(user_id);

-- RLS policies
ALTER TABLE ai_council_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own drafts
CREATE POLICY "Users can view own drafts"
  ON ai_council_drafts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own drafts
CREATE POLICY "Users can insert own drafts"
  ON ai_council_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own drafts
CREATE POLICY "Users can update own drafts"
  ON ai_council_drafts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own drafts
CREATE POLICY "Users can delete own drafts"
  ON ai_council_drafts FOR DELETE
  USING (auth.uid() = user_id);

-- Comment
COMMENT ON TABLE ai_council_drafts IS 'Auto-saved work-in-progress AI Council responses. One draft per user.';
