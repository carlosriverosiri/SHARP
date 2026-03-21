-- =============================================
-- PATIENTUPPLEVELSE VIA SMS
-- Migration: 028-enkat-submit-fix-utskick-id-ambiguity.sql
-- Datum: 2026-03-21
-- Beskrivning: Fixar tvetydig kolumnreferens i submit_enkat_response
-- =============================================

CREATE OR REPLACE FUNCTION submit_enkat_response(
  p_code TEXT,
  p_helhetsbetyg INTEGER,
  p_bemotande INTEGER,
  p_information INTEGER,
  p_lyssnad_pa INTEGER,
  p_plan_framat INTEGER,
  p_kommentar_bra TEXT DEFAULT NULL,
  p_kommentar_forbattra TEXT DEFAULT NULL
)
RETURNS TABLE(
  status TEXT,
  kampanj_id UUID,
  utskick_id UUID,
  svarad_vid TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_utskick enkat_utskick%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT *
  INTO v_utskick
  FROM enkat_utskick
  WHERE unik_kod = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'invalid_code'::TEXT, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_utskick.used THEN
    RETURN QUERY SELECT 'already_used'::TEXT, v_utskick.kampanj_id, v_utskick.id, v_utskick.svarad_vid;
    RETURN;
  END IF;

  IF v_utskick.expires_at < v_now THEN
    RETURN QUERY SELECT 'expired'::TEXT, v_utskick.kampanj_id, v_utskick.id, v_utskick.svarad_vid;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM enkat_svar AS es
    WHERE es.utskick_id = v_utskick.id
  ) THEN
    RETURN QUERY SELECT 'already_used'::TEXT, v_utskick.kampanj_id, v_utskick.id, v_utskick.svarad_vid;
    RETURN;
  END IF;

  UPDATE enkat_utskick
  SET used = true,
      svarad_vid = v_now
  WHERE id = v_utskick.id;

  INSERT INTO enkat_svar (
    kampanj_id,
    utskick_id,
    vardgivare_namn,
    besoksdatum,
    besoksstart_tid,
    bokningstyp_raw,
    bokningstyp_normaliserad,
    helhetsbetyg,
    bemotande,
    information,
    lyssnad_pa,
    plan_framat,
    kommentar_bra,
    kommentar_forbattra
  ) VALUES (
    v_utskick.kampanj_id,
    v_utskick.id,
    v_utskick.vardgivare_namn,
    v_utskick.besoksdatum,
    v_utskick.besoksstart_tid,
    v_utskick.bokningstyp_raw,
    v_utskick.bokningstyp_normaliserad,
    p_helhetsbetyg,
    p_bemotande,
    p_information,
    p_lyssnad_pa,
    p_plan_framat,
    NULLIF(p_kommentar_bra, ''),
    NULLIF(p_kommentar_forbattra, '')
  );

  UPDATE enkat_kampanjer
  SET total_svar = total_svar + 1
  WHERE id = v_utskick.kampanj_id;

  RETURN QUERY SELECT 'ok'::TEXT, v_utskick.kampanj_id, v_utskick.id, v_now;
END;
$$;
