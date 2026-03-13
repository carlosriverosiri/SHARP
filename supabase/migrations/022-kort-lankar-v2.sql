-- Migration 022: Kortlankar v2 - enhetlig datamodell för systemlänkar och egna länkar

ALTER TABLE kort_lankar
ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'internal',
ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sms_template TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'kort_lankar_link_type_check'
  ) THEN
    ALTER TABLE kort_lankar
    ADD CONSTRAINT kort_lankar_link_type_check
    CHECK (link_type IN ('internal', 'external', 'form', 'booking'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_kort_lankar_is_active
ON kort_lankar(is_active);

CREATE INDEX IF NOT EXISTS idx_kort_lankar_is_system
ON kort_lankar(is_system);

CREATE INDEX IF NOT EXISTS idx_kort_lankar_link_type
ON kort_lankar(link_type);

CREATE INDEX IF NOT EXISTS idx_kort_lankar_sort_order
ON kort_lankar(sort_order);

COMMENT ON COLUMN kort_lankar.link_type IS 'Typ av länk: internal, external, form eller booking';
COMMENT ON COLUMN kort_lankar.is_system IS 'True för förinstallerade standardlänkar som inte bör raderas lätt';
COMMENT ON COLUMN kort_lankar.is_active IS 'False om länken är arkiverad/inaktiv men ska bevaras';
COMMENT ON COLUMN kort_lankar.sort_order IS 'Styr ordningen inom kategori i UI';
COMMENT ON COLUMN kort_lankar.sms_template IS 'Valfri länkspecifik SMS-mall';
COMMENT ON COLUMN kort_lankar.description IS 'Intern beskrivning eller kommentar för personal/admin';
