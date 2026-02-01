# AI Council - Teknisk kontext

> **Användning:** Klistra in som kontext vid AI-sökningar om AI Council.

## Tech Stack
- **Framework:** Astro 5.x (SSR mode)
- **Hosting:** Netlify Functions (max 26s timeout, konfigurerat i `netlify.toml`)
- **Databas:** Supabase (PostgreSQL med RLS)
- **Auth:** Supabase Auth via cookies (`sb-access-token`)
- **Språk:** TypeScript

## Filstruktur
```
src/pages/admin/ai-council.astro     # Huvudsida (7500+ rader)
src/pages/admin/kunskapsbas.astro    # Kunskapsbas-verktyg
src/pages/api/ai-council/
  ├── query.ts                       # Huvudendpoint: kör alla modeller parallellt
  ├── synthesize-only.ts             # Endast syntes (kräver responses)
  ├── deliberate-only.ts             # Endast deliberation (runda 2)
  ├── draft.ts                       # Spara/hämta utkast
  ├── sessions.ts                    # CRUD för sessioner
  ├── projects.ts                    # CRUD för projekt/mappar
  ├── profile.ts                     # Användarprofiler
  └── zotero/                        # Zotero-integration
      ├── validate.ts                # Validera API-nyckel
      ├── search.ts                  # Sök i bibliotek
      ├── collections.ts             # Hämta collections
      └── fetch-pdf.ts               # Extrahera PDF-text
```

## Databastabeller (Supabase)
| Tabell | Syfte |
|--------|-------|
| `ai_council_sessions` | Sparade sessioner med prompts/responses |
| `ai_council_projects` | Projektmappar för organisering |
| `ai_council_drafts` | Temporära utkast (auto-save) |
| `ai_profiles` | Användarprofiler (roll, nivå, stil) |
| `ai_council_zotero_configs` | Krypterade Zotero API-nycklar |

## AI-modeller
| Modell | Provider | Endpoint |
|--------|----------|----------|
| o1 / GPT-4o | OpenAI | `api.openai.com` |
| Claude Sonnet / Opus 4.5 | Anthropic | `api.anthropic.com` |
| Gemini 2.0 Flash | Google | `generativelanguage.googleapis.com` |
| Grok 4 | xAI | `api.x.ai` |

## Nyckelkoncept
- **Parallella anrop:** Alla valda modeller körs samtidigt via `Promise.allSettled()`
- **Syntes/Sammanfattning:** En "domarmodell" sammanfattar alla svar
- **Deliberation/Faktagranskning:** Modellerna granskar varandras svar (runda 2)
- **Hallucinationsdetektion:** Flaggar motsägelser mellan modeller
- **Profilväljare:** Förinställda kombinationer (Snabb, Kodning, Vetenskap, etc.)
- **"Nästa steg"-kort:** UI visar 🔬 Faktagranskning / 🧪 Sammanfattning efter modellsvar

## Kända begränsningar
- Netlify timeout: 26s (kan orsaka "incomplete response" vid många modeller)
- Stora PDF:er: Max 50MB, 100k tecken extraheras
- Grok: Stöder ej bildanalys

## Miljövariabler (.env)
```
OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, XAI_API_KEY
SUPABASE_URL, SUPABASE_SERVICE_KEY
ZOTERO_ENCRYPTION_KEY
```

## Vanliga problem & lösningar
| Problem | Lösning |
|---------|---------|
| Timeout vid körning | Minska antal modeller, använd "Snabb"-profil |
| "Unauthorized" | Kontrollera sb-access-token cookie, logga in igen |
| Zotero fungerar ej | Verifiera API-nyckel på zotero.org/settings/keys |
| Modell svarar inte | Kolla rate limits hos provider, vänta och försök igen |

---
*Senast uppdaterad: 2026-01-30*
