-- =============================================
-- PATIENTUPPLEVELSE VIA SMS
-- Migration: 025-enkat-installningar.sql
-- Datum: 2026-01-25
-- Beskrivning: Gemensamma inställningar för enkätmodulen
-- =============================================

CREATE TABLE IF NOT EXISTS enkat_installningar (
  id TEXT PRIMARY KEY DEFAULT 'standard' CHECK (id = 'standard'),
  exkludera_bokningstyper TEXT[] NOT NULL DEFAULT ARRAY[
    'ssk',
    'suturtagning',
    'telefon',
    'tel.tid sll',
    'admin',
    'sll-tel'
  ]::TEXT[],
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE enkat_installningar IS 'Gemensamma inställningar för patientupplevelsemodulen, t.ex. bokningstyper som aldrig ska följas upp.';
COMMENT ON COLUMN enkat_installningar.exkludera_bokningstyper IS 'Rad- eller mönsterbaserad blacklist för bokningstyper som ska sorteras bort före preview och kampanjskapande.';
COMMENT ON COLUMN enkat_installningar.updated_by IS 'Senaste användaren som sparade den gemensamma inställningen.';

INSERT INTO enkat_installningar (id, exkludera_bokningstyper)
VALUES (
  'standard',
  ARRAY[
    'ssk',
    'suturtagning',
    'telefon',
    'tel.tid sll',
    'admin',
    'sll-tel'
  ]::TEXT[]
)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_enkat_installningar_updated_at ON enkat_installningar(updated_at DESC);

ALTER TABLE enkat_installningar ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trigger_enkat_installningar_updated_at ON enkat_installningar;
CREATE TRIGGER trigger_enkat_installningar_updated_at
  BEFORE UPDATE ON enkat_installningar
  FOR EACH ROW
  EXECUTE FUNCTION update_enkat_updated_at();
