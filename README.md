# Södermalms Ortopedi - Website

Astro-webbplats för Södermalms Ortopedi med Tailwind CSS v4. Specialistklinik för axel, knä och armbåge.

## 🖥️ Kör projektet på en ny dator

När du klonar projektet till en ny dator (hemdator, MacBook, arbete), följ dessa steg:

### 1. Klona från GitHub
```bash
git clone https://github.com/[ditt-användarnamn]/SHARP.git
cd SHARP
```

### 2. Installera dependencies (VIKTIGT!)
```bash
npm install
```
⚠️ **Detta måste köras på varje ny dator!** GitHub sparar inte `node_modules/`-mappen.

### 3. Starta development server
```bash
npm run dev
```

Webbplatsen öppnas automatiskt i din webbläsare på `http://localhost:4321/` (eller `4322` om 4321 är upptagen).

## 📋 Daglig arbetsflöde

### När du börjar jobba:
```bash
# 1. Hämta senaste ändringarna från GitHub
git pull origin main

# 2. Om det var länge sedan, uppdatera dependencies
npm install

# 3. Starta dev server
npm run dev
```

### När du är klar:
```bash
# 1. Se vad som ändrats
git status

# 2. Lägg till ändringarna
git add .

# 3. Commit med beskrivning
git commit -m "Beskrivning av vad du ändrat"

# 4. Pusha till GitHub
git push origin main
```

## 🛠️ Teknisk stack

- **Framework:** Astro 5.16.5
- **Styling:** Tailwind CSS v4.1.18
- **Node.js:** v18+ rekommenderat
- **Package Manager:** npm

## 📁 Projektstruktur

```
SHARP/
├── src/
│   ├── components/       # Återanvändbara komponenter (Header, Footer, etc)
│   ├── layouts/          # Layout-komponenter (BaseLayout, RehabLayout)
│   ├── pages/            # Alla sidor på webbplatsen
│   │   ├── index.astro           # Startsida
│   │   ├── sjukdomar/            # Sjukdomssidor
│   │   ├── fraga-doktorn/        # Fråga doktorn-sektion
│   │   ├── rehab/                # Rehabiliteringsprogram
│   │   └── om-oss/               # Om oss-sidor
│   ├── styles/           # Global CSS
│   ├── content/          # Content collections (fråga-doktorn artiklar)
│   └── data/             # Datastrukturer (conditions, topics)
├── public/               # Statiska filer (bilder, ikoner, etc)
├── prompts/              # AI-prompts för innehållsgenrering
└── scripts/              # Utility scripts
```

## 🧞 Kommandon

| Kommando | Beskrivning |
|----------|-------------|
| `npm install` | Installerar alla dependencies |
| `npm run dev` | Startar dev server (öppnar automatiskt i webbläsare) |
| `npm run build` | Bygger produktionsversion till `./dist/` |
| `npm run preview` | Förhandsvisar byggd version lokalt |

## 🐛 Felsökning

### Problem: "Port 4321 is in use"
**Lösning:** Servern körs redan eller en annan process använder porten
```bash
# Windows
netstat -ano | findstr :4321
taskkill /PID [process-id] /F

# Mac/Linux
lsof -ti:4321 | xargs kill -9
```

### Problem: "Cannot find module" eller Tailwind-fel
**Lösning:** Dependencies är inte installerade korrekt
```bash
# Ta bort och installera om
rm -rf node_modules package-lock.json  # Mac/Linux
# ELLER
Remove-Item -Recurse -Force node_modules, package-lock.json  # Windows PowerShell

npm install
```

### Problem: Sidan laddar men ser konstig ut
**Lösning:** Tailwind CSS kompilerar inte korrekt
1. Stoppa servern (Ctrl+C)
2. Ta bort `.astro` cache-mappen
3. Kör `npm run dev` igen

### Problem: Git-konflikter när du pullar
**Lösning:** 
```bash
# Se vad som är i konflikt
git status

# Om du vill behålla dina ändringar
git stash
git pull origin main
git stash pop

# Om du vill ta bort dina ändringar och använda GitHub-versionen
git reset --hard origin/main
```

## 🔄 Synka mellan datorer

### Scenario 1: Hemdator → MacBook
```bash
# På hemdator
git add .
git commit -m "Beskrivning"
git push origin main

# På MacBook
git pull origin main
npm install  # Endast om package.json ändrats
npm run dev
```

### Scenario 2: MacBook → Arbetsdator
```bash
# På MacBook
git add .
git commit -m "Beskrivning"
git push origin main

# På arbetsdator
git pull origin main
npm install  # Endast om package.json ändrats
npm run dev
```

## ⚙️ Tailwind CSS v4

Projektet använder Tailwind CSS v4 med den nya syntaxen:
- Använd `@import "tailwindcss"` istället för `@tailwind` directives
- `@apply` fungerar annorlunda - använd vanilla CSS eller utility classes direkt i HTML

## 📝 Viktiga filer att förstå

- **`src/layouts/BaseLayout.astro`** - Huvudlayout för alla sidor
- **`src/components/Header.astro`** - Sidhuvud med navigation
- **`src/styles/global.css`** - Global CSS (Tailwind import)
- **`astro.config.mjs`** - Astro-konfiguration
- **`tailwind.config.mjs`** - Tailwind-konfiguration (kan vara tom i v4)

## 🚀 Deploya till produktion

Projektet är konfigurerat för Netlify med automatisk deploy vid push till main:

1. Push till GitHub: `git push origin main`
2. Netlify bygger automatiskt med: `npm run build && npx pagefind --site dist`
3. Sidan är live på: https://sodermalmsortopedi.se

## 📞 Support

Om något inte fungerar:
1. Kolla detta README först
2. Sök i [Astro dokumentation](https://docs.astro.build)
3. Sök i [Tailwind v4 dokumentation](https://tailwindcss.com/docs)

---

**Senast uppdaterad:** 2026-01-02
**Version:** 0.0.1
