-- ============================================
-- MIGRATION: Profilbilder för personal
-- ============================================
-- Kör detta i Supabase SQL Editor för att
-- lägga till stöd för profilbilder.
-- ============================================

-- 1. Lägg till avatar_url i profiles
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
-- KLART!
-- ============================================
