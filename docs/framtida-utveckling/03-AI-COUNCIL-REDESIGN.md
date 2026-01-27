# AI Council UI Redesign - Specifikation v3.0

> **Status**: Påbörjad implementering  
> **Datum**: 2026-01-25  
> **Genererad av**: AI Council (Claude, OpenAI, Gemini, Grok med deliberation)

## 1. Sammanfattning

En omfattande redesign av AI Council från mörkt till ljust tema, inspirerat av Grok och Gemini. Inkluderar:

- **Ljust tema** med professionell färgpalett
- **Projektorganisation** med sidebar
- **Chattliknande interface** med bubblade meddelanden
- **WCAG-kompatibilitet** (AA-nivå)

## 2. Identifierade Korrigeringar (från Deliberation)

### SQL-korrigeringar:
- **UUID-generering**: Använd `gen_random_uuid()` istället för `uuid_generate_v4()`
- **Auth-referens**: Undvik direkta FK-constraints till `auth.users`
- **RLS-strategi**: Korrigerad enligt Claudes säkerhetsförslag

### UX-förbättringar:
- Responsiv design med konkreta breakpoints
- State management via Custom Events
- Tangentbordsnavigation och tillgänglighetsstöd

## 3. Design-konsensus

### Layout (Desktop):
```
┌─────────────────┬──────────────────────────────────┐
│ SIDEBAR (280px) │ HUVUDOMRÅDE (flex-grow: 1)      │
│                 │                                  │
│ [Sök] 🔍        │ 🔵 [Projektnamn + beskrivning]   │
│ + Projekt + Chat│ ─────────────────────────────── │
│                 │ 💬 Användare: [fråga]           │
│ 📌 Senaste:     │ 🤖 AI Council: [syntes]         │
│ - IP-telefoni   │ [feedback-knappar]               │
│ - Astro         │ ─────────────────────────────── │
│ - Mikrofon      │ [Input-område med kontext]      │
│                 │ [Kör AI Council]                 │
│ 📂 Historik ▼   │                                  │
└─────────────────┴──────────────────────────────────┘
```

### Färgpalett:
```css
:root {
  /* Bakgrunder */
  --bg-primary: #fafbfc;
  --bg-secondary: #ffffff;
  --bg-sidebar: #f8f9fa;
  --bg-card: #ffffff;
  --bg-input: #f3f4f6;
  --bg-hover: #e5e7eb;
  
  /* Text */
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-muted: #6b7280;
  --text-light: #9ca3af;
  
  /* Accent */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-light: rgba(37, 99, 235, 0.1);
  
  /* Borders */
  --border-color: #e5e7eb;
  --border-hover: #d1d5db;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  
  /* Status colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
}
```

## 4. SQL Migration (012-ai-council-projects.sql)

✅ **Implementerad**

```sql
CREATE TABLE ai_council_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    context TEXT,          -- Auto-inkluderas i alla frågor
    color TEXT DEFAULT '#2563eb',
    icon TEXT DEFAULT '📁',
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_council_sessions 
ADD COLUMN project_id UUID REFERENCES ai_council_projects(id) ON DELETE SET NULL;
```

## 5. Implementeringsstatus

### ✅ Klart (Fas 1):
- [x] SQL-migration för projekt-tabell
- [x] CSS-variabler för ljust tema
- [x] Sidebar-stilar uppdaterade
- [x] Notes-panel konverterad
- [x] Modal-stilar uppdaterade
- [x] Header och navigation
- [x] Profile selector
- [x] Input-kort och formulär
- [x] Accordion-komponenter
- [x] Synthesis-kort
- [x] Markdown-rendering
- [x] Hallucination report
- [x] Cost banner

### ✅ Klart (Fas 2):
- [x] Projekt-sidebar (vänster sida)
- [x] "Ny chat" och "Nytt projekt" knappar
- [x] Sökfunktion för sessioner
- [x] Projekt-CRUD API (`/api/ai-council/projects`)
- [x] Historik-accordion med sessioner
- [x] Pin/unpin projekt
- [x] Auto-kontext för projekt
- [x] Responsiv hamburger-meny

### ✅ Klart (Fas 3):
- [x] Chattbubbla-CSS (`.chat-container`, `.chat-message`, `.chat-bubble`)
- [x] Projekt-kontextmeny (högerklick)
- [x] Färgväljare för projekt (12 färger)
- [x] Ikon-väljare för projekt (18 emojis)
- [x] Redigera projektnamn via meny
- [x] Redigera projekt-kontext via meny
- [x] Ta bort projekt (med bekräftelse)

### ⏳ Kvar (Fas 4 - Framtida):
- [ ] Drag-and-drop för sessioner mellan projekt
- [ ] Visa chattbubblor i resultat-vy
- [ ] Keyboard shortcuts (Ctrl+N = ny chat)

## 6. Nästa Steg

### Att köra i Supabase SQL Editor:
```sql
-- Kör innehållet i:
-- supabase/migrations/012-ai-council-projects.sql
```

### Test lokalt:
```bash
npm run dev
# Öppna http://localhost:4321/admin/ai-council
```

## 7. Tekniska beslut

| Beslut | Val | Motivation |
|--------|-----|------------|
| State management | Custom Events | Lätt, inget extra bibliotek |
| Sidebar-bredd | 280px | Konsensus från alla AI-modeller |
| Responsiv strategi | Hamburger-meny + overlay | Bäst för mobil UX |
| Projektstruktur | Hierarkisk med auto-kontext | Sparar tid vid repetitiva frågor |

---

*Denna specifikation genererades via AI Council deliberation-mode med Claude, OpenAI, Gemini och Grok.*
