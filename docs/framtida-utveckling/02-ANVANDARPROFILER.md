# Användarprofiler för AI Council

> Personanpassade AI-svar baserat på användarens bakgrund och kunskapsnivå

**Status:** Implementeras  
**Prioritet:** Hög  
**Version:** v2.5

---

## Bakgrund

AI Council används av personal med mycket olika bakgrund och kunskapsnivå:

| Roll | Teknisk nivå | Behov |
|------|--------------|-------|
| Läkare (ortoped) | Avancerad - kodar i Astro | Detaljerade tekniska svar |
| Sjuksköterska | Nybörjare | Enkla steg-för-steg-instruktioner |
| Administratör | Mellan | Balanserade förklaringar |
| IT-support | Avancerad | Teknisk djupdykning |

**Problem:** Utan kontext ger AI samma typ av svar till alla, vilket kan vara:
- För tekniskt för nybörjare
- För ytligt för experter
- Irrelevant för användarens roll

**Lösning:** Individuella användarprofiler som automatiskt inkluderas i varje fråga.

---

## Arkitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANVÄNDARPROFIL (Supabase)                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  user_id: uuid                                            │  │
│  │  role: "läkare" | "ssk" | "admin" | "it"                 │  │
│  │  technical_level: 1-5                                     │  │
│  │  background: "Ortopedkirurg med 20 års erfarenhet..."    │  │
│  │  it_skills: ["mejl", "skrivare", "word"]                 │  │
│  │  specialties: ["axelkirurgi", "knäkirurgi"]              │  │
│  │  preferred_language: "sv"                                 │  │
│  │  response_style: "detailed" | "concise" | "step-by-step" │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI COUNCIL QUERY                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SYSTEM PROMPT (automatiskt tillagt):                     │  │
│  │                                                           │  │
│  │  "Användaren är en ortopedkirurg med 20 års erfarenhet.  │  │
│  │   Teknisk nivå: 5/5 (avancerad, kodar själv).            │  │
│  │   IT-kunskaper: Git, API:er, databaser, Astro.           │  │
│  │   Föredrar: Detaljerade tekniska förklaringar med kod.   │  │
│  │                                                           │  │
│  │   Anpassa ditt svar efter denna bakgrund."               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                               +                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  USER PROMPT: "Hur optimerar jag React-komponenten?"      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Databasschema

### Tabell: `ai_council_profiles`

```sql
CREATE TABLE ai_council_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Grundläggande info
  role TEXT NOT NULL DEFAULT 'personal',
  role_title TEXT, -- "Ortopedkirurg", "Mottagningssköterska"
  years_experience INTEGER,
  
  -- Teknisk nivå (1-5)
  technical_level INTEGER NOT NULL DEFAULT 2 CHECK (technical_level BETWEEN 1 AND 5),
  
  -- Kunskaper (JSON arrays)
  it_skills TEXT[] DEFAULT '{}',
  medical_specialties TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{sv}',
  
  -- Fritext
  background TEXT, -- Fri beskrivning av bakgrund
  can_do TEXT,     -- Vad användaren kan göra
  cannot_do TEXT,  -- Vad användaren INTE kan göra
  
  -- Preferenser
  response_style TEXT DEFAULT 'balanced' CHECK (response_style IN ('detailed', 'balanced', 'concise', 'step-by-step')),
  include_code_examples BOOLEAN DEFAULT true,
  include_references BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE ai_council_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON ai_council_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON ai_council_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON ai_council_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## Teknisk nivå (1-5)

| Nivå | Beskrivning | Exempel |
|------|-------------|---------|
| **1** | Nybörjare | Kan använda dator för mejl och webben |
| **2** | Grundläggande | Kan installera program, felsöka enkla problem |
| **3** | Mellan | Förstår filsystem, kan följa tekniska instruktioner |
| **4** | Avancerad | Kan skriva scripts, förstår API:er |
| **5** | Expert | Kan programmera, förstår systemarkitektur |

---

## Profilguide (Wizard)

När användaren första gången öppnar AI Council visas en guide:

### Steg 1: Roll
```
Vad är din roll?
○ Läkare
○ Sjuksköterska  
○ Administratör
○ IT/Teknik
○ Annan: [____________]
```

### Steg 2: Teknisk nivå
```
Hur skulle du beskriva dina IT-kunskaper?

1 ○ Nybörjare - Jag använder mest mejl och webben
2 ○ Grundläggande - Jag kan installera program
3 ○ Mellan - Jag kan följa tekniska instruktioner
4 ○ Avancerad - Jag förstår programmering och API:er
5 ○ Expert - Jag kodar själv och bygger system
```

### Steg 3: Specifika kunskaper
```
Vilka av dessa kan du? (välj alla som stämmer)

□ Skicka/ta emot mejl
□ Installera program
□ Installera skrivare
□ Använda Excel
□ Felsöka nätverk
□ Skriva kod
□ Använda Git
□ Arbeta med databaser
□ Bygga webbsidor
```

### Steg 4: Medicinsk bakgrund (om läkare/ssk)
```
Vilka är dina specialområden?

□ Axelkirurgi
□ Knäkirurgi
□ Höftkirurgi
□ Handkirurgi
□ Allmän ortopedi
□ Rehabilitering
```

### Steg 5: Svarsstil
```
Hur vill du ha dina svar?

○ Detaljerade - Fullständiga förklaringar med bakgrund
○ Balanserade - Lagom utförligt (rekommenderas)
○ Koncisa - Kort och kärnfullt
○ Steg-för-steg - Numrerade instruktioner
```

### Steg 6: Fritext (valfritt)
```
Beskriv dig själv med egna ord (valfritt):

[                                                    ]
[  Jag är ortopedkirurg med 20 års erfarenhet.      ]
[  Jag kodar på fritiden i TypeScript och Astro.    ]
[  Jag föredrar detaljerade tekniska förklaringar.  ]
[                                                    ]
```

---

## Genererad systemprompt

Baserat på profilen genereras en systemprompt som skickas med varje fråga:

### Exempel: Läkare (avancerad)

```
Du svarar en ortopedkirurg med 20 års klinisk erfarenhet.

TEKNISK NIVÅ: 5/5 (Expert)
- Programmerar i TypeScript, Astro, React
- Förstår databaser, API:er, Git
- Kan läsa och skriva kod

MEDICINSK BAKGRUND:
- Specialiserad på axel- och knäkirurgi
- Arbetar på Södermalms Ortopedi

PREFERENSER:
- Vill ha detaljerade svar med kodexempel
- Föredrar tekniskt språk
- Uppskattar källhänvisningar

Anpassa ditt svar efter denna bakgrund. Du kan använda tekniska termer 
och ge detaljerade kodexempel utan att förklara grunderna.
```

### Exempel: Sjuksköterska (nybörjare)

```
Du svarar en mottagningssköterska med 5 års erfarenhet.

TEKNISK NIVÅ: 2/5 (Grundläggande)
- Kan använda mejl och webben
- Kan installera program med hjälp
- Osäker på tekniska termer

ARBETSUPPGIFTER:
- Patientbemötande
- Telefonrådgivning
- Administrativt arbete

PREFERENSER:
- Vill ha steg-för-steg-instruktioner
- Föredrar enkelt språk utan tekniska termer
- Uppskattar skärmdumpar och bilder

Anpassa ditt svar för någon som inte har teknisk bakgrund.
Förklara steg för steg och undvik facktermer. Ge konkreta exempel.
```

---

## UI: Profilsida

**URL:** `/admin/ai-council/profil`

```
┌─────────────────────────────────────────────────────────────────┐
│  ← AI Council                                                    │
│                                                                  │
│  👤 Din AI-profil                                               │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Denna profil hjälper AI att ge dig bättre svar anpassade       │
│  efter din bakgrund och kunskapsnivå.                           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ROLL                                                    │    │
│  │  [Läkare ▼]     Titel: [Ortopedkirurg        ]         │    │
│  │  År i yrket: [20]                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  TEKNISK NIVÅ                                            │    │
│  │                                                          │    │
│  │  ○──────────────────────────────────────────────●        │    │
│  │  1        2        3        4        5                  │    │
│  │  Nybörjare                              Expert          │    │
│  │                                                          │    │
│  │  Aktuell nivå: Expert (5/5)                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  IT-KUNSKAPER                                            │    │
│  │                                                          │    │
│  │  ☑ Mejl  ☑ Excel  ☑ Git  ☑ Programmering              │    │
│  │  ☑ API:er  ☑ Databaser  ☑ Astro  ☐ Docker             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  SVARSSTIL                                               │    │
│  │                                                          │    │
│  │  ○ Detaljerat  ● Balanserat  ○ Koncist  ○ Steg-för-steg│    │
│  │                                                          │    │
│  │  ☑ Inkludera kodexempel                                 │    │
│  │  ☑ Inkludera källhänvisningar                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  FRITEXT                                                 │    │
│  │  ┌───────────────────────────────────────────────────┐  │    │
│  │  │ Jag är ortopedkirurg med 20 års erfarenhet.      │  │    │
│  │  │ Kodar på fritiden i TypeScript och Astro.        │  │    │
│  │  │ Föredrar detaljerade tekniska förklaringar.      │  │    │
│  │  └───────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                                        [ Spara profil ]          │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  📋 Förhandsvisning av AI-kontext:                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  "Du svarar en ortopedkirurg med 20 års erfarenhet.    │    │
│  │   Teknisk nivå: 5/5 (Expert). Kan programmera i        │    │
│  │   TypeScript, Astro, React. Föredrar detaljerade       │    │
│  │   svar med kodexempel..."                               │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration med AI Council

### Ändring i query.ts

```typescript
// Hämta användarprofil
const { data: profile } = await supabase
  .from('ai_council_profiles')
  .select('*')
  .eq('user_id', userId)
  .single();

// Generera systemprompt från profil
const systemContext = profile 
  ? generateSystemPrompt(profile)
  : '';

// Lägg till i varje AI-anrop
const fullPrompt = systemContext 
  ? `${systemContext}\n\n---\n\n${prompt}`
  : prompt;
```

### Funktion: generateSystemPrompt

```typescript
function generateSystemPrompt(profile: UserProfile): string {
  const levelNames = ['Nybörjare', 'Grundläggande', 'Mellan', 'Avancerad', 'Expert'];
  
  let prompt = `Du svarar ${profile.role_title || 'en användare'}`;
  
  if (profile.years_experience) {
    prompt += ` med ${profile.years_experience} års erfarenhet`;
  }
  
  prompt += `.\n\nTEKNISK NIVÅ: ${profile.technical_level}/5 (${levelNames[profile.technical_level - 1]})`;
  
  if (profile.it_skills?.length) {
    prompt += `\nIT-kunskaper: ${profile.it_skills.join(', ')}`;
  }
  
  if (profile.background) {
    prompt += `\n\nBAKGRUND:\n${profile.background}`;
  }
  
  // Svarsstil
  const styleInstructions = {
    detailed: 'Ge detaljerade svar med fullständiga förklaringar.',
    balanced: 'Ge balanserade svar, varken för korta eller för långa.',
    concise: 'Ge korta och kärnfulla svar.',
    'step-by-step': 'Ge steg-för-steg-instruktioner med numrerade punkter.'
  };
  
  prompt += `\n\nPREFERENSER:\n${styleInstructions[profile.response_style]}`;
  
  if (profile.include_code_examples) {
    prompt += '\nInkludera kodexempel när relevant.';
  }
  
  prompt += '\n\nAnpassa ditt svar efter denna bakgrund.';
  
  return prompt;
}
```

---

## Kostnadsvisning högst upp

Flytta kostnadsvisningen till toppen av resultatområdet:

```
┌─────────────────────────────────────────────────────────────────┐
│  💰 KOSTNAD: $0.12 (~1.25 kr)                                   │
│  ─────────────────────────────────────────────────────────────  │
│  Tokens: 2,340 in / 1,890 out • Tid: 8.2s                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  🧠 SYNTES                                                       │
│  ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementationsplan

### Fas 1: Grundläggande (denna session)
1. ✅ Dokumentation
2. ☐ Databas-migration
3. ☐ Flytta kostnad till toppen
4. ☐ Enkel profilsida (fritext + nivå)
5. ☐ Integrera i query

### Fas 2: Utökad (senare)
- Profilguide (wizard)
- Fler fält (specialiteter, kunskaper)
- Förhandsvisning av AI-kontext
- Admin-vy för att se alla profiler

---

## Prompt för Cursor

```
Implementera användarprofiler för AI Council:

1. Skapa databas-migration i supabase/migrations/010-ai-council-profiles.sql
2. Skapa profilsida: src/pages/admin/ai-council/profil.astro
3. Lägg till API endpoint: src/pages/api/ai-council/profile.ts
4. Uppdatera query.ts för att inkludera profil i systemkontext
5. Flytta kostnadsvisningen till toppen av resultaten

Profilen ska innehålla:
- Roll och titel
- Teknisk nivå (1-5)
- IT-kunskaper (checkboxar)
- Svarsstil (detaljerad/balanserad/koncis/steg-för-steg)
- Fritext för bakgrund

Se docs/framtida-utveckling/02-ANVANDARPROFILER.md för detaljer.
```
