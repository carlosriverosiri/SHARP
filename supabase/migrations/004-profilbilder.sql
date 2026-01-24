-- ============================================
-- MIGRATION 004: Profilbilder
-- ============================================
-- Stöd för profilbilder i Supabase Storage
-- Skapad: 2026-01-23
-- ============================================

-- Lägg till avatar_url i profiles (om inte redan finns)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN profiles.avatar_url IS 'URL till profilbild i Supabase Storage';


-- ============================================
-- VIKTIGT: Skapa Storage Bucket manuellt!
-- ============================================
-- 
-- Gå till Supabase Dashboard → Storage → New bucket
-- 
-- Bucket name: avatars
-- Public bucket: JA (kryssa i)
-- 
-- Klicka "Create bucket"
-- 
-- Sen klicka på "avatars" bucketen och gå till
-- "Policies" och lägg till:
--
-- Policy 1: "Allow authenticated uploads"
--   - Allowed operation: INSERT
--   - Target roles: authenticated
--   - Policy: true
--
-- Policy 2: "Allow authenticated updates"  
--   - Allowed operation: UPDATE
--   - Target roles: authenticated
--   - Policy: true
--
-- Policy 3: "Allow public reads"
--   - Allowed operation: SELECT
--   - Target roles: public (anon)
--   - Policy: true
--
-- ============================================

-- Schema version
INSERT INTO schema_version (version, description) VALUES
  (4, 'Profilbilder: avatar_url kolumn')
ON CONFLICT (version) DO NOTHING;
