-- Migration: Zotero Integration för AI Council
-- Skapad: 2026-01-27
-- 
-- Denna migration lägger till stöd för Zotero-integration:
-- - Säker lagring av krypterade API-nycklar
-- - Audit-logg för Zotero-operationer
-- - Cache för sökresultat (framtida optimering)

-- ============================================
-- TABELL: ai_council_zotero_configs
-- Lagrar användarnas Zotero-konfiguration
-- ============================================
CREATE TABLE IF NOT EXISTS ai_council_zotero_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Zotero-specifik data
  zotero_user_id TEXT NOT NULL,           -- Användarens Zotero user ID
  encrypted_api_key TEXT NOT NULL,         -- Krypterad API-nyckel (AES-256-GCM)
  library_type TEXT DEFAULT 'user',        -- 'user' eller 'group'
  default_collection_key TEXT,             -- Förvald collection (valfritt)
  
  -- Metadata
  display_name TEXT,                       -- Valfritt visningsnamn
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- En config per användare
  UNIQUE(user_id)
);

-- Index för snabb lookup
CREATE INDEX IF NOT EXISTS idx_zotero_configs_user_id ON ai_council_zotero_configs(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Användare kan endast se/ändra sin egen config
-- ============================================
ALTER TABLE ai_council_zotero_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Användare kan läsa sin egen config
CREATE POLICY "Users can view own zotero config"
  ON ai_council_zotero_configs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Användare kan skapa sin egen config
CREATE POLICY "Users can create own zotero config"
  ON ai_council_zotero_configs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Användare kan uppdatera sin egen config
CREATE POLICY "Users can update own zotero config"
  ON ai_council_zotero_configs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Användare kan ta bort sin egen config
CREATE POLICY "Users can delete own zotero config"
  ON ai_council_zotero_configs
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TABELL: ai_council_zotero_cache (framtida)
-- Cache för sökresultat för att minska API-anrop
-- ============================================
CREATE TABLE IF NOT EXISTS ai_council_zotero_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Cache-nyckel (hash av sökparametrar)
  cache_key TEXT NOT NULL,
  
  -- Cachad data
  search_query TEXT,
  result_data JSONB NOT NULL,
  result_count INTEGER DEFAULT 0,
  
  -- TTL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- En cache-entry per user+key
  UNIQUE(user_id, cache_key)
);

-- Index för cache-lookup
CREATE INDEX IF NOT EXISTS idx_zotero_cache_lookup 
  ON ai_council_zotero_cache(user_id, cache_key, expires_at);

-- Auto-delete expired cache entries
CREATE INDEX IF NOT EXISTS idx_zotero_cache_expiry 
  ON ai_council_zotero_cache(expires_at);

-- RLS för cache
ALTER TABLE ai_council_zotero_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own zotero cache"
  ON ai_council_zotero_cache
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNKTION: Rensa expired cache
-- Kör periodiskt via pg_cron eller manuellt
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_zotero_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_council_zotero_cache
  WHERE expires_at < CURRENT_TIMESTAMP;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Uppdatera updated_at automatiskt
-- ============================================
CREATE OR REPLACE FUNCTION update_zotero_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_zotero_config_timestamp
  BEFORE UPDATE ON ai_council_zotero_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_zotero_config_timestamp();

-- ============================================
-- KOMMENTAR: Dokumentera tabeller
-- ============================================
COMMENT ON TABLE ai_council_zotero_configs IS 
  'Lagrar användarnas Zotero API-konfiguration med krypterade nycklar';

COMMENT ON COLUMN ai_council_zotero_configs.encrypted_api_key IS 
  'AES-256-GCM krypterad API-nyckel. Dekrypteras endast server-side.';

COMMENT ON TABLE ai_council_zotero_cache IS 
  'Cache för Zotero-sökresultat för att minska API-belastning';
