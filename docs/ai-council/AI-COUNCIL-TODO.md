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

## Anti-Hallucination & Kvalitetskontroll

> **Insikt:** Det är statistiskt osannolikt att 4 oberoende AI-modeller hallucinerar *exakt samma sak*. Multi-model-approachen ger naturlig faktakontroll. Större risk är halvsanningar från nätet där källkritik blir viktig.

### Fas A: Snabb implementation (1-2 dagar)
- [ ] **Konsensusindikator** - Visa hur mycket modellerna är överens (0-100%)
- [ ] **Konfliktmarkering i syntes** - Tydligt visa när modeller motsäger varandra
- [ ] **"Osäkerhetsgrad"** - Flagga påståenden där bara 1 modell säger något

### Fas B: Källhantering (1 vecka)
- [ ] **Be om källor i prompts** - Instruera modellerna att citera källor
- [ ] **Visa källhänvisningar** - Extrahera och visa URL:er/referenser separat
- [ ] **Flagga påståenden utan källa** - Markera med varningsikon
- [ ] **Citatverifiering** - Kontrollera att citat är korrekta (svårt)

### Fas C: Avancerad validering (2-4 veckor)
- [ ] **Cross-model fact-check** - Låt modellerna specifikt granska varandras påståenden
- [ ] **Confidence scoring** - Be varje modell ange säkerhet (1-10) per påstående
- [ ] **Deliberation trace** - Spara och visa hela granskningsprocessen
- [ ] **Red Team Mode** - En modell försöker aktivt hitta fel i andras svar

---

## Framtida funktioner (från AI Council syntes 2026-02-02)

### Streaming & UX
- [ ] **Real-time streaming** - Visa svar medan de genereras
- [ ] **Progress med konfidensvisualisering** - Visa status per modell
- [ ] **<5s till första svar** - Optimera för snabb feedback

### Smart Routing
- [ ] **Frågetyp-baserad routing** - Välj modeller baserat på frågan
  - Code review → Claude + GPT-4o
  - Arkitektur → o1 + Claude
  - Research → Grok + Gemini
  - Säkerhet → Claude + o1
- [ ] **Expertisprofiler** - Förinställda modellkombinationer per domän

### Integrationer
- [ ] **MCP Server för Cursor** - Använd AI Council direkt i editorn
- [ ] **VS Code extension** - Samma funktionalitet
- [ ] **CLI-verktyg** - `ai-council "fråga"` från terminalen
- [ ] **API för utvecklare** - REST/GraphQL endpoint

### Mätbara mål
- Hallucinationsreduktion: 40% inom 3 månader
- Källtäckning: >80% av påståenden med referens
- Responstid: <30s total

---

## Anteckningar

- **2026-02-02:** Ny syntes om vidareutveckling. Fokus på anti-hallucination och streaming.
- **USP:** "Deliberative Multi-AI Validation" - ingen annan tjänst låter AI:er granska varandras svar aktivt.

---

**Senast uppdaterad:** 2026-02-02
