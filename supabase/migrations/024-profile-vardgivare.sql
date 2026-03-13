-- =============================================
-- MIGRATION 024: Koppla personalprofil till vårdgivarnamn
-- =============================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS vardgivare_namn TEXT;

COMMENT ON COLUMN profiles.vardgivare_namn IS 'Valfri koppling mellan användarkonto och vårdgivarnamn för rollstyrd enkätvisning.';
