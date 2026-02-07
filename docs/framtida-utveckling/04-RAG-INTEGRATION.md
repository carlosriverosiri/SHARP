# RAG-integration: Kunskapsbas -> AI Council

## Oversikt

Koppla ihop Kunskapsbasen med AI Council sa att projekt-specifika dokument automatiskt anvands som kontext vid fragor.

## Nuvarande struktur

### Kunskapsbas (kb_projects + kb_items)

kb_projects: id, name, description, icon, color, user_id, sort_order

kb_items: id, project_id, category, title, content (markdown), summary, metadata (JSONB), tags[]

Kategorier: dokument, litteratur, ljud, ai_fragor, prompter, radata

### AI Council (ai_council_projects)

ai_council_projects: id, name, context (text), user_id, settings (JSONB)

## Fas 1: Direkt koppling ✅ KLAR

### Databasandring

ALTER TABLE ai_council_projects 
ADD COLUMN kb_project_id UUID REFERENCES kb_projects(id) ON DELETE SET NULL;
ADD COLUMN auto_include_kb BOOLEAN DEFAULT false;

### Flode

1. I AI Council valjer anvandaren ett projekt
2. Om projektet har kb_project_id, hamta alla kb_items med content
3. Konkatenera till kontext automatiskt
4. Skicka med i API-anropet

### UI-andring i projektinstallningar

- Kopplad kunskapsbas: [Valj KB-projekt]
- Checkbox: Inkludera automatiskt vid fragor
- Visa: Token-estimering (~45,000 tokens, 12 dokument)

## Fas 2: Smart chunking med embeddings (1 vecka)

### Ny tabell: kb_embeddings

- item_id, chunk_index, chunk_text, chunk_tokens
- embedding vector(1536) - OpenAI text-embedding-3-small
- pgvector index for snabb sokning

### Chunking-strategi

PDF (10-15 sidor) -> ~10,000-15,000 tokens
-> Chunka i ~500 tokens per chunk
-> ~20-30 chunks per PDF
-> Embedding for varje chunk

### Flode vid fraga

1. Fraga -> Embedding
2. Sok top-K mest relevanta chunks (cosine similarity)
3. Returnera ~10-20 chunks (~5,000-10,000 tokens)
4. Inkludera som kontext

### Fordelar

- 50+ dokument -> fortfarande ~10K tokens kontext
- Endast relevant innehall skickas
- Skalbart

## Fas 3: Automatisk SERP-fallback

Flode:
1. Sok i KB-embeddings
2. Om < 3 chunks: Sok PubMed automatiskt
3. Syntetisera med bada kallorna
4. Markera: Fran din kunskapsbas [1-5], Nya kallor [6-8]

## Prioritetsordning

| Fas | Komplexitet | Varde | Rekommendation |
|-----|-------------|-------|----------------|
| 1. Direkt koppling | Lag | Hogt | ✅ KLAR |
| 2. Embeddings | Medium (1 vecka) | Mycket hogt | Nar Fas 1 funkar |
| 3. SERP-fallback | Lag | Medium | Senare |

## Token-kapacitet per modell

| Modell | Max kontext | ~Antal PDFer (10 sidor) |
|--------|-------------|------------------------|
| GPT-5.2 | 400K | 25-40 |
| GPT-5.2 Pro | 400K+ | 25-40+ |
| Grok 4 | 256K-2M | 15-130 |
| Gemini 2.0 | 128K | 8-12 |
| Claude Opus | 200K | 12-20 |

For 4-10 PDFer racker alla modeller redan idag.

## Nasta steg

1. [x] Skapa migration 018-kb-ai-council-link.sql
2. [x] Skapa API-endpoint /api/ai-council/kb-context
3. [x] Lagg till KB-projektvaljare i AI Council-projektinstallningar
4. [x] Visa token-estimering vid projektkoppling
5. [ ] Testa med Impingement-projekt + 5 PDFer