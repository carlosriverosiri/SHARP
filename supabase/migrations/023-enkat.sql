-- =============================================
-- PATIENTUPPLEVELSE VIA SMS
-- Migration: 023-enkat.sql
-- Datum: 2026-03-13
-- Beskrivning: Datamodell för enkätkampanjer, utskick, svar och leveranslogg
-- =============================================

-- =============================================
-- 1. KAMPANJER
-- =============================================
CREATE TABLE IF NOT EXISTS enkat_kampanjer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skapad_av UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  namn TEXT,
  status TEXT NOT NULL DEFAULT 'utkast' CHECK (
    status IN ('utkast', 'redo', 'skickar', 'klar', 'fel', 'avbruten')
  ),
  csv_filnamn TEXT,

  total_importerade INTEGER NOT NULL DEFAULT 0 CHECK (total_importerade >= 0),
  total_giltiga INTEGER NOT NULL DEFAULT 0 CHECK (total_giltiga >= 0),
  total_dubletter INTEGER NOT NULL DEFAULT 0 CHECK (total_dubletter >= 0),
  total_ogiltiga INTEGER NOT NULL DEFAULT 0 CHECK (total_ogiltiga >= 0),
  total_skickade INTEGER NOT NULL DEFAULT 0 CHECK (total_skickade >= 0),
  total_svar INTEGER NOT NULL DEFAULT 0 CHECK (total_svar >= 0),

  global_bokningstyp TEXT,
  sms_mall TEXT,
  skicka_paminnelse BOOLEAN NOT NULL DEFAULT true,
  paminnelse_efter_timmar INTEGER CHECK (paminnelse_efter_timmar IS NULL OR paminnelse_efter_timmar >= 1),
  skicka_nu BOOLEAN NOT NULL DEFAULT true,
  planerad_skicktid TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE enkat_kampanjer IS 'Enkätkampanjer för patientupplevelse via SMS.';
COMMENT ON COLUMN enkat_kampanjer.skapad_av IS 'Användaren som skapade kampanjen.';
COMMENT ON COLUMN enkat_kampanjer.global_bokningstyp IS 'Fallback-värde om Bokningstyp saknas i CSV.';
COMMENT ON COLUMN enkat_kampanjer.sms_mall IS 'Använd SMS-mall med tokens för vårdgivare, datum, bokningstyp och länk.';
COMMENT ON COLUMN enkat_kampanjer.skicka_paminnelse IS 'Om en påminnelse ska kunna skickas till obesvarade mottagare.';

CREATE INDEX IF NOT EXISTS idx_enkat_kampanjer_skapad_av ON enkat_kampanjer(skapad_av);
CREATE INDEX IF NOT EXISTS idx_enkat_kampanjer_status ON enkat_kampanjer(status);
CREATE INDEX IF NOT EXISTS idx_enkat_kampanjer_created_at ON enkat_kampanjer(created_at DESC);

-- =============================================
-- 2. UTSKICK
-- =============================================
CREATE TABLE IF NOT EXISTS enkat_utskick (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kampanj_id UUID NOT NULL REFERENCES enkat_kampanjer(id) ON DELETE CASCADE,

  unik_kod TEXT NOT NULL UNIQUE,
  patient_id_hash TEXT,
  telefon_temp_krypterad TEXT,

  vardgivare_namn TEXT NOT NULL,
  besoksdatum DATE NOT NULL,
  besoksstart_tid TIME,
  bokningstyp_raw TEXT,
  bokningstyp_normaliserad TEXT CHECK (
    bokningstyp_normaliserad IS NULL OR bokningstyp_normaliserad IN (
      'nybesok',
      'nybesok_remiss',
      'aterbesok',
      'ssk_besok',
      'telefon',
      'ovrigt'
    )
  ),

  forsta_sms_skickad_vid TIMESTAMPTZ,
  paminnelse_skickad_vid TIMESTAMPTZ,
  svarad_vid TIMESTAMPTZ,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE enkat_utskick IS 'Tillfälliga utskicksrader med unik enkätkod. Inte avsedd som långsiktigt patientregister.';
COMMENT ON COLUMN enkat_utskick.patient_id_hash IS 'Hashad identifierare för deduplicering och importspårning.';
COMMENT ON COLUMN enkat_utskick.telefon_temp_krypterad IS 'Tillfälligt krypterad kontaktdata om kömodell används. Får inte användas för analys.';
COMMENT ON COLUMN enkat_utskick.besoksstart_tid IS 'Valfri starttid från CSV för analys av svarsfrekvens mot utskicksfördröjning.';
COMMENT ON COLUMN enkat_utskick.bokningstyp_raw IS 'Originalvärde från CSV. Ska bevaras även om klassificeringen ändras senare.';
COMMENT ON COLUMN enkat_utskick.bokningstyp_normaliserad IS 'Normaliserad bokningstyp för urval och analys.';

CREATE INDEX IF NOT EXISTS idx_enkat_utskick_kampanj_id ON enkat_utskick(kampanj_id);
CREATE INDEX IF NOT EXISTS idx_enkat_utskick_unik_kod ON enkat_utskick(unik_kod);
CREATE INDEX IF NOT EXISTS idx_enkat_utskick_vardgivare ON enkat_utskick(vardgivare_namn);
CREATE INDEX IF NOT EXISTS idx_enkat_utskick_besoksdatum ON enkat_utskick(besoksdatum DESC);
CREATE INDEX IF NOT EXISTS idx_enkat_utskick_svarad_vid ON enkat_utskick(svarad_vid);
CREATE INDEX IF NOT EXISTS idx_enkat_utskick_expires_at ON enkat_utskick(expires_at);

-- =============================================
-- 3. SVAR
-- =============================================
CREATE TABLE IF NOT EXISTS enkat_svar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kampanj_id UUID NOT NULL REFERENCES enkat_kampanjer(id) ON DELETE CASCADE,
  utskick_id UUID NOT NULL UNIQUE REFERENCES enkat_utskick(id) ON DELETE CASCADE,

  vardgivare_namn TEXT NOT NULL,
  besoksdatum DATE NOT NULL,
  besoksstart_tid TIME,
  bokningstyp_raw TEXT,
  bokningstyp_normaliserad TEXT,

  helhetsbetyg INTEGER NOT NULL CHECK (helhetsbetyg BETWEEN 1 AND 10),
  bemotande INTEGER NOT NULL CHECK (bemotande BETWEEN 1 AND 5),
  information INTEGER NOT NULL CHECK (information BETWEEN 1 AND 5),
  lyssnad_pa INTEGER NOT NULL CHECK (lyssnad_pa BETWEEN 1 AND 5),
  plan_framat INTEGER NOT NULL CHECK (plan_framat BETWEEN 1 AND 5),

  kommentar_bra TEXT,
  kommentar_forbattra TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE enkat_svar IS 'Anonyma patientsvar kopplade till vårdgivare, datum och bokningstyp.';
COMMENT ON COLUMN enkat_svar.vardgivare_namn IS 'Duplicerad metadata för enklare analys utan tunga joins.';
COMMENT ON COLUMN enkat_svar.besoksstart_tid IS 'Duplicerad metadata för att kunna analysera svarsfrekvens mot tid från besök till SMS.';
COMMENT ON COLUMN enkat_svar.kommentar_bra IS 'Frivillig fritext. Ska maskas på API-nivå innan lagring.';
COMMENT ON COLUMN enkat_svar.kommentar_forbattra IS 'Frivillig fritext. Ska maskas på API-nivå innan lagring.';

CREATE INDEX IF NOT EXISTS idx_enkat_svar_kampanj_id ON enkat_svar(kampanj_id);
CREATE INDEX IF NOT EXISTS idx_enkat_svar_utskick_id ON enkat_svar(utskick_id);
CREATE INDEX IF NOT EXISTS idx_enkat_svar_vardgivare ON enkat_svar(vardgivare_namn);
CREATE INDEX IF NOT EXISTS idx_enkat_svar_besoksdatum ON enkat_svar(besoksdatum DESC);
CREATE INDEX IF NOT EXISTS idx_enkat_svar_bokningstyp ON enkat_svar(bokningstyp_normaliserad);
CREATE INDEX IF NOT EXISTS idx_enkat_svar_created_at ON enkat_svar(created_at DESC);

-- =============================================
-- 4. DELIVERY LOG
-- =============================================
CREATE TABLE IF NOT EXISTS enkat_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kampanj_id UUID NOT NULL REFERENCES enkat_kampanjer(id) ON DELETE CASCADE,
  utskick_id UUID REFERENCES enkat_utskick(id) ON DELETE SET NULL,

  typ TEXT NOT NULL CHECK (typ IN ('forsta_sms', 'paminnelse')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'delivered')),
  provider TEXT NOT NULL DEFAULT '46elks',
  provider_message_id TEXT,
  provider_response JSONB,
  felkod TEXT,
  felmeddelande TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE enkat_delivery_log IS 'Loggar varje faktiskt SMS-försök och dess status från leverantören.';
COMMENT ON COLUMN enkat_delivery_log.provider_response IS 'Råstatus eller payload från SMS-leverantören för felsökning.';
COMMENT ON COLUMN enkat_delivery_log.felkod IS 'Normaliserad felkod för UI och rapportering.';

CREATE INDEX IF NOT EXISTS idx_enkat_delivery_log_kampanj_id ON enkat_delivery_log(kampanj_id);
CREATE INDEX IF NOT EXISTS idx_enkat_delivery_log_utskick_id ON enkat_delivery_log(utskick_id);
CREATE INDEX IF NOT EXISTS idx_enkat_delivery_log_status ON enkat_delivery_log(status);
CREATE INDEX IF NOT EXISTS idx_enkat_delivery_log_created_at ON enkat_delivery_log(created_at DESC);

-- =============================================
-- 5. TRIGGER FÖR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_enkat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_enkat_kampanjer_updated_at ON enkat_kampanjer;
CREATE TRIGGER trigger_enkat_kampanjer_updated_at
  BEFORE UPDATE ON enkat_kampanjer
  FOR EACH ROW
  EXECUTE FUNCTION update_enkat_updated_at();

-- =============================================
-- 6. RLS
-- =============================================
ALTER TABLE enkat_kampanjer ENABLE ROW LEVEL SECURITY;
ALTER TABLE enkat_utskick ENABLE ROW LEVEL SECURITY;
ALTER TABLE enkat_svar ENABLE ROW LEVEL SECURITY;
ALTER TABLE enkat_delivery_log ENABLE ROW LEVEL SECURITY;

-- Kampanjer: skaparen kan läsa/ändra sina egna om inte server-side route används.
DROP POLICY IF EXISTS "Users can view own enkat_kampanjer" ON enkat_kampanjer;
CREATE POLICY "Users can view own enkat_kampanjer"
  ON enkat_kampanjer FOR SELECT
  USING (auth.uid() = skapad_av);

DROP POLICY IF EXISTS "Users can insert own enkat_kampanjer" ON enkat_kampanjer;
CREATE POLICY "Users can insert own enkat_kampanjer"
  ON enkat_kampanjer FOR INSERT
  WITH CHECK (auth.uid() = skapad_av);

DROP POLICY IF EXISTS "Users can update own enkat_kampanjer" ON enkat_kampanjer;
CREATE POLICY "Users can update own enkat_kampanjer"
  ON enkat_kampanjer FOR UPDATE
  USING (auth.uid() = skapad_av);

DROP POLICY IF EXISTS "Users can delete own enkat_kampanjer" ON enkat_kampanjer;
CREATE POLICY "Users can delete own enkat_kampanjer"
  ON enkat_kampanjer FOR DELETE
  USING (auth.uid() = skapad_av);

-- Utskick/svar/delivery-log exponeras inte direkt till klienten i V1.
-- Åtkomst ska normalt gå via server-side API-routes eller service role.

-- =============================================
-- 7. KOMMENTAR OM ÅTKOMSTMODELL
-- =============================================
COMMENT ON TABLE enkat_kampanjer IS 'RLS är strikt. Chef/admin-jämförelser bör göras via server-side API med rollkontroll, inte via direkt klientåtkomst till råtabeller.';
COMMENT ON TABLE enkat_utskick IS 'Direkt klientåtkomst bör undvikas. Tabellen kan innehålla temporär kontaktdata under utskicksfasen.';
COMMENT ON TABLE enkat_svar IS 'Analys på patientnivå ska vara anonym. Vårdgivarspecifik visning ska filtreras server-side enligt roll.';
COMMENT ON TABLE enkat_delivery_log IS 'Delivery-logg är nödvändig i V1 för drift, felsökning och uppföljning av misslyckade utskick.';
