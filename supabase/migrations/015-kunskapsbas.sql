-- =============================================
-- KUNSKAPSBAS: Projektorienterat dokumenthanteringssystem
-- Migration: 015-kunskapsbas.sql
-- =============================================

-- =============================================
-- 1. PROJEKT-TABELL
-- =============================================
CREATE TABLE IF NOT EXISTS kb_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Projektinfo
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#2563eb',
  
  -- Sortering
  sort_order INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_kb_projects_user_id ON kb_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_kb_projects_sort ON kb_projects(user_id, is_pinned DESC, sort_order, created_at DESC);

-- RLS
ALTER TABLE kb_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own kb_projects" ON kb_projects;
DROP POLICY IF EXISTS "Users can insert own kb_projects" ON kb_projects;
DROP POLICY IF EXISTS "Users can update own kb_projects" ON kb_projects;
DROP POLICY IF EXISTS "Users can delete own kb_projects" ON kb_projects;

CREATE POLICY "Users can view own kb_projects"
  ON kb_projects FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kb_projects"
  ON kb_projects FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own kb_projects"
  ON kb_projects FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own kb_projects"
  ON kb_projects FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 2. ITEMS-TABELL (dokument, anteckningar, etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS kb_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES kb_projects(id) ON DELETE CASCADE,
  
  -- Kategori (fast lista)
  category TEXT NOT NULL CHECK (category IN (
    'dokument',      -- Anteckningar, sammanfattningar
    'litteratur',    -- Zotero-kopplingar, referenser
    'ljud',          -- Transkriberade röstanteckningar
    'ai_fragor',     -- Sparade AI Council-sessioner
    'prompter',      -- Återanvändbara prompter
    'radata'         -- Övrigt material
  )),
  
  -- Innehåll
  title TEXT NOT NULL,
  content TEXT,                    -- Huvudinnehåll (markdown)
  summary TEXT,                    -- Kort sammanfattning
  
  -- Metadata (flexibelt JSON)
  metadata JSONB DEFAULT '{}',     -- T.ex. zotero_key, audio_duration, etc.
  tags TEXT[] DEFAULT '{}',
  
  -- Sortering
  sort_order INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  
  -- Tidsstämplar
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_kb_items_user_id ON kb_items(user_id);
CREATE INDEX IF NOT EXISTS idx_kb_items_project_id ON kb_items(project_id);
CREATE INDEX IF NOT EXISTS idx_kb_items_category ON kb_items(project_id, category);
CREATE INDEX IF NOT EXISTS idx_kb_items_tags ON kb_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kb_items_search ON kb_items USING GIN(to_tsvector('swedish', coalesce(title, '') || ' ' || coalesce(content, '')));

-- RLS
ALTER TABLE kb_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own kb_items" ON kb_items;
DROP POLICY IF EXISTS "Users can insert own kb_items" ON kb_items;
DROP POLICY IF EXISTS "Users can update own kb_items" ON kb_items;
DROP POLICY IF EXISTS "Users can delete own kb_items" ON kb_items;

CREATE POLICY "Users can view own kb_items"
  ON kb_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kb_items"
  ON kb_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own kb_items"
  ON kb_items FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own kb_items"
  ON kb_items FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 3. TRIGGERS FÖR updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_kb_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_kb_projects_updated_at ON kb_projects;
CREATE TRIGGER trigger_kb_projects_updated_at
  BEFORE UPDATE ON kb_projects
  FOR EACH ROW EXECUTE FUNCTION update_kb_updated_at();

DROP TRIGGER IF EXISTS trigger_kb_items_updated_at ON kb_items;
CREATE TRIGGER trigger_kb_items_updated_at
  BEFORE UPDATE ON kb_items
  FOR EACH ROW EXECUTE FUNCTION update_kb_updated_at();

-- =============================================
-- 4. HJÄLPFUNKTION: Hämta projektstruktur
-- =============================================
CREATE OR REPLACE FUNCTION get_kb_project_structure(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'icon', p.icon,
        'color', p.color,
        'is_pinned', p.is_pinned,
        'categories', (
          SELECT json_object_agg(
            category,
            item_count
          )
          FROM (
            SELECT category, COUNT(*) as item_count
            FROM kb_items
            WHERE project_id = p.id
            GROUP BY category
          ) counts
        )
      )
      ORDER BY p.is_pinned DESC, p.sort_order, p.created_at DESC
    )
    FROM kb_projects p
    WHERE p.user_id = p_user_id
    AND p.is_archived = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. KOMMENTARER
-- =============================================
COMMENT ON TABLE kb_projects IS 'Kunskapsbas: Forskningsprojekt och mappar';
COMMENT ON TABLE kb_items IS 'Kunskapsbas: Dokument, anteckningar, prompter etc.';
COMMENT ON COLUMN kb_items.category IS 'Typ: dokument, litteratur, ljud, ai_fragor, prompter, radata';
COMMENT ON COLUMN kb_items.metadata IS 'Flexibel JSON för kategorispecifik data (zotero_key, duration, etc.)';
