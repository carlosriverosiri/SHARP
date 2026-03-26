-- =============================================
-- Kompletterar 029: "Patientupplevelse20260324" (utan mellanslag före YYYYMMDD)
-- =============================================

UPDATE enkat_kampanjer
SET
  namn = 'Patientupplevelse',
  updated_at = NOW()
WHERE TRIM(namn) ~* '^patientupplevelse[0-9]{8}$';
