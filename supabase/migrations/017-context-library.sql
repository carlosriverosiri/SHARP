-- Migration: 017-context-library.sql
-- Create table for saved contexts

CREATE TABLE IF NOT EXISTS ai_council_contexts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_council_contexts_user_id ON ai_council_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_council_contexts_created_at ON ai_council_contexts(created_at DESC);

-- RLS
ALTER TABLE ai_council_contexts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own contexts"
  ON ai_council_contexts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contexts"
  ON ai_council_contexts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contexts"
  ON ai_council_contexts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contexts"
  ON ai_council_contexts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_context_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_context_updated_at ON ai_council_contexts;
CREATE TRIGGER trigger_update_context_updated_at
  BEFORE UPDATE ON ai_council_contexts
  FOR EACH ROW
  EXECUTE FUNCTION update_context_updated_at();