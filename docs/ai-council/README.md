# AI Council Dokumentation

> Samlad dokumentation för AI Council - Master Mind Tool

## Dokument

| Fil | Beskrivning |
|-----|-------------|
| [KONTEXT.md](./KONTEXT.md) | **Teknisk kontext** - Kompakt översikt för AI-sökningar |
| [../AI-COUNCIL.md](../AI-COUNCIL.md) | **Huvuddokumentation** - Komplett guide med versionshistorik |
| [../AI-COUNCIL-TODO.md](../AI-COUNCIL-TODO.md) | **Projektplan** - Roadmap för separation till eget projekt |

## Snabbguide

### Starta utveckling
```bash
npm run dev
# Öppna http://localhost:4321/admin/ai-council
```

### Viktiga filer
```
src/pages/admin/ai-council.astro     # Frontend (7500+ rader)
src/pages/api/ai-council/query.ts    # Backend API
docs/ai-council/KONTEXT.md           # AI-sökningskontext
```

### Databasmigrationer
```bash
# Kör alla migrationer i ordning:
supabase/migrations/009-ai-council.sql
supabase/migrations/010-ai-council-profiles.sql
supabase/migrations/012-ai-council-projects.sql
supabase/migrations/013-zotero-integration.sql
supabase/migrations/014-ai-council-drafts.sql
```

## För AI-assistenter

När du arbetar med AI Council, använd `docs/ai-council/KONTEXT.md` som kontext.
Den innehåller:
- Tech stack och arkitektur
- Alla API-endpoints
- Databastabeller
- AI-modeller och providers
- Vanliga problem och lösningar

---
*Se [../AI-COUNCIL.md](../AI-COUNCIL.md) för fullständig dokumentation.*
