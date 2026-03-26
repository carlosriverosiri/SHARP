-- =============================================
-- Normalisera kampanjnamn: "Patientupplevelse" + datum-suffix → enbart "Patientupplevelse"
-- Datum kvarstår i kolumnen created_at / visningen "Datum" i kampanjhistoriken.
-- Träffar t.ex. "Patientupplevelse 2026-03-24" och "Patientupplevelse 20260324" (case-insensitive).
-- =============================================

UPDATE enkat_kampanjer
SET
  namn = 'Patientupplevelse',
  updated_at = NOW()
WHERE TRIM(namn) ~* '^patientupplevelse[[:space:]]+([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{8})$';
