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
src/pages/admin/ai-council.astro     # Huvudsida (~847 rader)
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

src/lib/ai-council/                  # Klientside-moduler för AI Council
  ├── auth-status.ts                 # Logout-banner + auth-status
  ├── dictation.ts                   # Speech-to-text
  ├── dom-helpers.ts                 # Samlade DOM-refs
  ├── file-uploads.ts                # Filer, kamera, paste
  ├── html-utils.ts                  # HTML-escape
  ├── kb-context-loader.ts           # Ladda KB-kontext från URL
  ├── kb-link-modal.ts               # Koppla projekt till KB
  ├── kb-projects-ui.ts              # KB-projekt select/filter
  ├── kb-save.ts                     # Spara syntes till KB
  ├── libraries.ts                   # Prompt/kontext-bibliotek
  ├── model-progress.ts              # Tidsmätning + status
  ├── model-selection.ts             # Modell/profil/tokens
  ├── notes-actions.ts               # Notes/export/copy/spara
  ├── page-load.ts                   # Initial page-load
  ├── project-context-menu.ts        # Högerklicksmeny projekt
  ├── project-sidebar.ts             # Render + actions
  ├── project-selection-storage.ts   # Återställ valt projekt
  ├── project-sidebar-state.ts       # State + selection
  ├── project-sidebar-ui.ts          # Sidebar/mobil overlay/new chat
  ├── prompt-tools.ts                # Diktering/struktur/källsök
  ├── prompt-edit-modal.ts           # Redigera prompt (modal)
  ├── response-rendering.ts          # Render svar/syntes/kostnad
  ├── response-storage.ts            # Draft + localStorage
  ├── restore-responses.ts           # Återställ sparade svar
  ├── run-controls.ts                # Run-knapp + tangenter
  ├── run-modules.ts                 # Samlad init av körning
  ├── run-query.ts                   # Huvudkörning + streaming
  ├── save-session-modal.ts          # Spara-session modal/autosave
  ├── sequential-run.ts              # Sekventiell körning
  ├── sessions.ts                    # Sessionsdata + modaler
  ├── sessions-setup.ts              # Init sessioner + notes
  ├── sidebar-modules.ts             # Sidebar-init (Zotero/KB)
  ├── single-model-run.ts            # Kör en modell
  ├── sound-notifications.ts         # Ljudnotiser
  ├── source-search.ts               # Källsök (PubMed/Scholar/etc)
  ├── status-notifications.ts        # Auth + ljud
  ├── structure-prompt.ts            # Strukturera prompt
  ├── synthesize-run.ts              # Syntes/supersyntes
  ├── synthesis-meta.ts              # Meta-rad för syntes
  ├── textarea-utils.ts              # Auto-resize
  ├── toast.ts                       # Toast-notiser
  ├── types.ts                       # Delade typer
  ├── ui-assets.ts                   # SVG + marked config
  ├── ui-helpers.ts                  # Format/status/preview
  ├── workflow-controls.ts           # Reset/skip-synthesis
  ├── workflow-progress.ts           # "Nästa steg"-logik
  └── workflow-state.ts              # State + reset

src/lib/ai-core/                     # UI-agnostisk kärnlogik (Next.js-redo)
  ├── types.ts                       # ProviderId, CostInfo, ModelResponse, CoreOptions
  ├── index.ts                       # Entry point + re-exports
  ├── currency.ts                    # SEK/USD formatering baserat på locale
  ├── file-utils.ts                  # buildFilePayload (text/bild-separation)
  ├── model-mapping.ts               # Provider/modell-namn-mappning
  ├── prepare-run.ts                 # prepareRunQuery (validering+payload+hash)
  ├── query-hash.ts                  # buildQueryHash
  ├── request-payload.ts             # buildRunQueryPayload
  ├── response-state.ts              # buildInitialResponses
  ├── status-text.ts                 # getStatusText (lokaliserade statusmeddelanden)
  ├── synthesis-label.ts             # getSynthesisLabel
  ├── utils.ts                       # getProfileType
  ├── validation.ts                  # validateRunQuery
  └── adapters/                      # Provider-adaptrar (skelett)
      ├── openai.ts
      ├── anthropic.ts
      ├── google.ts
      └── grok.ts

src/styles/
  └── ai-council-page.css            # Utdragen CSS från sidan
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
- **Projektval:** Vald AI Council‑projekt sparas i `localStorage` och används vid KB‑auto‑include

## Fördelar med ny organisation
- **Snabbare utveckling:** Mindre, tydliga moduler gör att du hittar rätt snabbare och kan ändra en del utan att scrolla i en jättestor fil.
- **Färre fel över tid:** Smalare ansvar per modul minskar risken att oavsiktligt påverka andra delar.
- **Lättare felsökning:** När något går fel kan du snabbt peka ut ansvarig modul (t.ex. `run-query.ts` eller `notes-actions.ts`).
- **Bättre återanvändning:** Delad logik (t.ex. storage, textarea-utils) kan användas utan kopiering.
- **Renare diffar:** Ändringar blir lokala och ger mindre merge‑konflikter.
- **Enklare optimering:** Prestanda förbättras inte automatiskt, men det blir lättare att hitta och optimera flaskhalsar.

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
*Senast uppdaterad: 2026-02-11*
