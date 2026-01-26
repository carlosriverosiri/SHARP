-- Migration: Add Scientific Context to AI Council Profiles
-- Version: 011
-- Description: Adds a dedicated field for scientific/research prompts with Zotero integration

-- Add scientific_context column
ALTER TABLE ai_council_profiles 
ADD COLUMN IF NOT EXISTS scientific_context TEXT;

-- Add comment for documentation
COMMENT ON COLUMN ai_council_profiles.scientific_context IS 'Vetenskaplig kontext-prompt för forskningsfrågor. Används automatiskt med Vetenskap-profilen.';
