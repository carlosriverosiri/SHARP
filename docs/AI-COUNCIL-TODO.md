# AI Council - Projektplan & Att-göra

> **Status:** Planering för separation till självständigt affärsprojekt  
> **Budget:** 8-10,000 kr/mån  
> **Mål:** Skalbart till 100,000+ användare

---

## Fas 1: Förberedelse (Vecka 1)

### Namn & Domän
- [ ] Välj produktnamn
  - Förslag: `AI Council`, `MultiModel`, `Research Council`, `Syntes.ai`
- [ ] Registrera domän
  - Kolla: `.se`, `.ai`, `.io`, `.app`
- [ ] Skapa logotyp/branding (kan vänta)

### Juridiskt
- [ ] Bestäm bolagsform (enskild firma / AB)
- [ ] Användarvillkor (Terms of Service)
- [ ] Integritetspolicy (GDPR)

---

## Fas 2: Infrastruktur (Vecka 1-2)

### Konton att skapa
- [ ] **GitHub** - Ny repo `ai-council` (privat)
- [ ] **Vercel Pro** - Hosting (~200 kr/mån)
- [ ] **Supabase Pro** - Databas + Auth (~250 kr/mån)
- [ ] **Cloudflare Pro** - CDN + säkerhet (~200 kr/mån)
- [ ] **Upstash** - Redis cache (~100 kr/mån)
- [ ] **Sentry** - Felspårning (~250 kr/mån)

### Domän & DNS
- [ ] Registrera domän
- [ ] Konfigurera Cloudflare DNS
- [ ] SSL-certifikat (automatiskt via Cloudflare)

---

## Fas 3: Kodmigration (Vecka 2)

### Filer att flytta från SHARP
- [ ] `src/pages/admin/ai-council.astro` → Huvudsida
- [ ] `src/pages/admin/kunskapsbas.astro` → Kunskapsbas
- [ ] `src/pages/api/ai-council/` → API-routes
- [ ] `src/pages/api/kunskapsbas/` → KB API
- [ ] `src/lib/supabase.ts` → Databasklient
- [ ] `src/middleware/` → Auth middleware

### Databasmigrationer
- [ ] `009-ai-council.sql`
- [ ] `012-ai-council-projects.sql`
- [ ] `014-ai-council-drafts.sql`
- [ ] `015-kunskapsbas.sql`

### Ny struktur
```
ai-council/
├── src/
│   ├── pages/
│   │   ├── index.astro          # Landing/Dashboard
│   │   ├── council.astro        # AI Council huvudvy
│   │   ├── kunskapsbas.astro    # Kunskapsbas
│   │   ├── login.astro          # Inloggning
│   │   └── api/                 # API endpoints
│   ├── components/              # Återanvändbara komponenter
│   ├── lib/                     # Utilities
│   └── styles/                  # Global CSS
├── supabase/
│   └── migrations/              # Databasschema
├── public/                      # Statiska filer
├── astro.config.mjs
├── package.json
└── README.md
```

---

## Fas 4: Funktioner (Vecka 2-4)

### Kärna (måste ha)
- [ ] AI Council med 4+ modeller
- [ ] Syntes-funktion
- [ ] Deliberation (peer review)
- [ ] Spara sessioner
- [ ] Kunskapsbas med projekt
- [ ] Kontext-injektion från KB

### Användarhantering
- [ ] Registrering
- [ ] Inloggning (email + lösenord)
- [ ] Glömt lösenord
- [ ] Användarprofil
- [ ] Prenumerationsnivåer (senare)

### Kunskapsbas
- [ ] Skapa/redigera projekt
- [ ] Ladda upp dokument
- [ ] PDF-parsing (extrahera text)
- [ ] Taggning
- [ ] Sök i innehåll

### Integrationer
- [ ] Zotero-koppling
- [ ] Export till Markdown
- [ ] Dela sessioner (länk)

---

## Fas 5: Skalbarhet (Vecka 4+)

### Performance
- [ ] Redis caching för sessioner
- [ ] Bakgrundsjobb för AI-anrop (Inngest)
- [ ] Rate limiting per användare
- [ ] Optimerad databasfrågor

### Monitoring
- [ ] Sentry för felspårning
- [ ] PostHog för analytics
- [ ] Uptime-monitoring
- [ ] Cost tracking för AI API:er

---

## Fas 6: Affärsmodell (Framtid)

### Prenumerationsnivåer (idé)
| Nivå | Pris | Inkluderar |
|------|------|------------|
| Free | 0 kr | 10 frågor/mån, 1 projekt |
| Pro | 299 kr/mån | Obegränsat, alla modeller |
| Team | 799 kr/mån | 5 användare, delning |
| Enterprise | Offert | SSO, API, support |

### Intäktsströmmar
- [ ] Prenumerationer
- [ ] API-access (för utvecklare)
- [ ] White-label för företag

---

## Tekniska beslut

### Valt
- **Framework:** Astro (SSR)
- **Databas:** Supabase (Postgres)
- **Hosting:** Vercel
- **CDN:** Cloudflare
- **Auth:** Supabase Auth

### Att besluta
- [ ] Vilka AI-modeller ska inkluderas?
- [ ] Eget API-lager eller direkt till providers?
- [ ] Stöd för lokala modeller (Ollama)?

---

## Kontakter & Resurser

### API-nycklar behövs
- [ ] OpenAI (GPT-4o, o1)
- [ ] Anthropic (Claude)
- [ ] Google AI (Gemini)
- [ ] xAI (Grok)

### Domänregistrarer
- Loopia, Binero, GoDaddy, Namecheap

### Inspiration
- ChatGPT, Perplexity, Claude.ai, Poe

---

## Anteckningar

_Lägg till tankar och idéer här..._

---

**Senast uppdaterad:** 2026-01-28
