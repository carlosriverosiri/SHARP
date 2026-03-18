-- =============================================
-- PATIENTUPPLEVELSE VIA SMS
-- Migration: 027-enkat-robusthet.sql
-- Datum: 2026-03-16
-- Beskrivning: Idempotent kampanjskapande och atomar svarsinlamning
-- =============================================

-- Kampanjer ska kunna dedupliceras server-side per signerad preview.
ALTER TABLE enkat_kampanjer
ADD COLUMN IF NOT EXISTS preview_token_hash TEXT;

COMMENT ON COLUMN enkat_kampanjer.preview_token_hash IS
  'Hash av signerad preview-token. Anvands for att gora kampanjskapande praktiskt idempotent vid dubbelsubmit.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_enkat_kampanjer_preview_token_hash
ON enkat_kampanjer(preview_token_hash)
WHERE preview_token_hash IS NOT NULL;

-- Tar emot enkatdata atomart for att undvika att en lank markeras som anvand utan att svar sparas.
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
    FROM enkat_svar
    WHERE utskick_id = v_utskick.id
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

COMMENT ON FUNCTION submit_enkat_response(
  TEXT,
  INTEGER,
  INTEGER,
  INTEGER,
  INTEGER,
  INTEGER,
  TEXT,
  TEXT
) IS
  'Tar emot enkatdata atomart: verifierar kod, markerar utskick som använt, sparar svar och ökar total_svar i samma transaktion.';
