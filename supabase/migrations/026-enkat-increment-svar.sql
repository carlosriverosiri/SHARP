-- =============================================
-- PATIENTUPPLEVELSE VIA SMS
-- Migration: 026-enkat-increment-svar.sql
-- Datum: 2026-03-15
-- Beskrivning: Atomär ökning av total_svar för att undvika race conditions
-- =============================================

CREATE OR REPLACE FUNCTION increment_enkat_total_svar(p_kampanj_id UUID)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
AS $$
  UPDATE enkat_kampanjer
  SET total_svar = total_svar + 1
  WHERE id = p_kampanj_id;
$$;

COMMENT ON FUNCTION increment_enkat_total_svar IS 'Atomärt ökar total_svar med 1. Undviker race condition vid samtidiga enkätsvar.';
