-- Migration 021: Kortlankar - dynamiska lankar som personal kan hantera via UI

CREATE TABLE IF NOT EXISTS kort_lankar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    short_code TEXT NOT NULL UNIQUE,
    target TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Info',
    is_external BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE kort_lankar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view links" ON kort_lankar FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert links" ON kort_lankar FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update links" ON kort_lankar FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete links" ON kort_lankar FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_kort_lankar_category ON kort_lankar(category);
CREATE INDEX IF NOT EXISTS idx_kort_lankar_short_code ON kort_lankar(short_code);

CREATE OR REPLACE FUNCTION update_kort_lankar_timestamp() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_kort_lankar_timestamp ON kort_lankar;
CREATE TRIGGER trigger_kort_lankar_timestamp BEFORE UPDATE ON kort_lankar FOR EACH ROW EXECUTE FUNCTION update_kort_lankar_timestamp();

COMMENT ON TABLE kort_lankar IS 'Dynamiska kortlankar som personal kan hantera via /personal/lankar-sms';