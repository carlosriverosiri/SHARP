# Projektindexering - Södermalms Ortopedi

**Senast uppdaterad:** 2026-01-04

## 📋 Översikt
Astro-webbplats för Södermalms Ortopedi med Tailwind CSS och TypeScript. Komponentbaserad arkitektur med modulära system för operationer, diagnoser och Fråga Doktorn.

---

## 🏗️ Huvudsystem

### 1. Operationssystem
Modulärt system för operationsbeskrivningar med återanvändbara komponenter.

**Layout:** `src/layouts/OperationLayout.astro`
- JSON-LD strukturerad data (MedicalProcedure, FAQPage)
- SEO-optimering (OG, Twitter Cards)
- Innehållsförteckning (sticky sidebar på desktop)
- Medicinsk granskning-block

**Komponenter:** `src/components/operation/`
| Komponent | Funktion |
|-----------|----------|
| `OpForberedelser.astro` | Fasta, rökning, mediciner, Descutan/Hibiwash |
| `OpOperationsdagen.astro` | Vårdprocessen, bedövning |
| `OpBandage.astro` | Bandage-instruktioner med bilder |
| `OpDuscha.astro` | Dusch/bad-instruktioner |
| `OpSmarta.astro` | Smärtlindring |
| `OpSjukskrivning.astro` | Sjukskrivningstider |
| `OpBilkorning.astro` | Bilkörningsregler |
| `OpSjukgymnastik.astro` | Rehabilitering |
| `OpAxellas.astro` | Axelläs/mitella |
| `OpAterbesok.astro` | Återbesöksinformation |
| `OpRelateratInnehall.astro` | Länkar till relaterat innehåll |

**Operationssidor:** `src/pages/operation/`
- `/operation/axel/lateral-klavikelresektion` - AC-ledsartros operation

**Ikoner:** `public/images/operation/` (20+ SVG-filer)
**Bilder:** `src/assets/images/operation/` (WebP-bilder)

**Dokumentation:** `docs/OPERATION-SIDOR.md`

---

### 2. Kortlänkssystem
System för korta SMS-vänliga länkar till patientinformation.

**Single Source of Truth:** `src/data/shortLinks.json`

**Admin-verktyg:** `src/pages/copy-links.astro`
- Sök och kopiera kortlänkar
- Link Generator för nya länkar

**Prefix-struktur:**
| Prefix | Kategori |
|--------|----------|
| `/d/` | Diagnoser |
| `/o/` | Operationer |
| `/r/` | Rehab |
| `/ff/` | Frågeformulär |

**Dokumentation:** `docs/KOPIERA-LANKAR.md`

---

### 3. Fråga Doktorn
Innehållssamling med 649 frågor och svar.

**Innehåll:** `src/content/fraga-doktorn/*.md`
**Konfiguration:** `src/content/config.ts`

**Sidor:**
- `/fraga-doktorn/` - Översikt
- `/fraga-doktorn/axel/` - Axelfrågor
- `/fraga-doktorn/kna/` - Knäfrågor  
- `/fraga-doktorn/armbage/` - Armbågsfrågor

---

### 4. Sjukdomssidor
Diagnosinformation med referenser och FAQ.

**Sidor:** `src/pages/sjukdomar/`
- `/sjukdomar/axel/ac-ledsartros`
- `/sjukdomar/axel/biceps-*`
- `/sjukdomar/axel/frusen-skuldra`
- `/sjukdomar/axel/impingement`
- `/sjukdomar/axel/instabilitet`
- `/sjukdomar/axel/kalkaxel`
- `/sjukdomar/axel/pts` (Parsonage-Turner)
- `/sjukdomar/axel/rotatorcuff`
- `/sjukdomar/axel/slap-skada`

**Komponenter:**
- `RefLink.astro` - Referenslänkar med tooltip
- `RefDrawer.astro` - Referenslåda

---

## 🧩 Grundkomponenter

### Header.astro
**Plats:** `src/components/Header.astro`

**Struktur:**
- Toppbanner (`#023550`) - Fritt Vårdval-länk
- Huvudheader (`#EBF8FF`) - Logo + navigation
- Mobilmeny (slide-in)

**Menyer:**
- Sjukdomar → Axel, Knä, Armbåge
- **Operation** → AC-ledsartros (nytt!)
- Rehab → Axel, Knä, Armbåge
- Fråga Doktorn → Axel, Knä, Armbåge
- Om oss → Team, Kontakt, **Admin** (nytt!)

**Admin-undermeny:**
- Senast redigerade
- Obesvarade frågor
- Kopiera länkar

### footer.astro
4-kolumns footer med kontaktinfo, adress, patientlänkar.

### Övriga komponenter
- `FooterMap.astro` - Google Maps
- `PhoneModal.astro` - Telefonmodal
- `MedicinskGranskad.astro` - Granskningsblock
- `SEO.astro` - SEO-metablock
- `AuthorCard.astro` - Författarkort

---

## 📐 Layouts

| Layout | Användning |
|--------|------------|
| `BaseLayout.astro` | Standard för de flesta sidor |
| `OperationLayout.astro` | Operationssidor med TOC |
| `RehabLayout.astro` | Rehabprogram |

---

## 📄 Statiska sidor

| Sida | Route | Status |
|------|-------|--------|
| Startsida | `/` | ✅ |
| Akut remiss | `/akut-remiss` | ✅ |
| Fritt vårdval | `/fritt-vardval-sverige` | ✅ |
| Patientavgifter | `/patientavgifter` | ✅ |
| Privatpatient | `/privatpatient-tre-val` | ✅ |
| Försäkringsbolag | `/vara-forsakringsbolag` | ✅ |
| Vårdgivare | `/vardgivare` | ✅ |
| Om oss | `/om-oss` | ✅ |
| Kopiera länkar | `/copy-links` | ✅ |
| Senast redigerade | `/senast-redigerade` | ✅ |
| Sök | `/sok` | ✅ |

---

## 🎨 Designsystem

### Primärfärger
- `#023550` - Toppbanner
- `#024264` - Navigationstext, rubriker
- `#EBF8FF` - Header-bakgrund

### Accentfärger
- `sky-700` - Primär accent (hero, knappar)
- `amber-*` - Varningar
- `green-*` - Success
- `red-*` - Fel/varning

### Typografi
- **Font:** Inter (Google Fonts)
- **H1:** `text-4xl md:text-6xl font-bold`
- **H2:** `text-3xl md:text-4xl font-bold`
- **Body:** `text-base` eller `text-lg`

### Innehållsförteckning
- Färg: `bg-sky-700` (konsekvent över hela sidan)

---

## 📁 Projektstruktur

```
SHARP/
├── public/
│   ├── favicons/           # Favicon-filer
│   ├── images/
│   │   ├── branding/       # Logo, QR-koder
│   │   ├── diseases/       # Sjukdomsillustrationer
│   │   ├── icons/          # Generella ikoner
│   │   ├── og/             # Open Graph-bilder
│   │   ├── operation/      # Operationsikoner (SVG)
│   │   └── team/           # Teamfoton
│   ├── video/              # Videofiler
│   ├── llms.txt            # AI-sökoptimering
│   └── robots.txt
│
├── src/
│   ├── assets/images/      # Optimerade bilder (WebP)
│   │   └── operation/      # Descutan, Hibiwash, bandage
│   │
│   ├── components/
│   │   ├── operation/      # Operationskomponenter
│   │   └── *.astro         # Grundkomponenter
│   │
│   ├── content/
│   │   ├── config.ts       # Innehållskonfiguration
│   │   └── fraga-doktorn/  # 649 markdown-filer
│   │
│   ├── data/
│   │   ├── shortLinks.json # Kortlänkar (SSOT)
│   │   ├── conditions.ts   # Diagnosdata
│   │   └── topics.ts       # Ämnesdata
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── OperationLayout.astro
│   │   └── RehabLayout.astro
│   │
│   ├── pages/
│   │   ├── d/              # Diagnosredirects
│   │   ├── en/             # Engelska sidor
│   │   ├── fraga-doktorn/  # Fråga Doktorn-sidor
│   │   ├── o/              # Operationsredirects
│   │   ├── om-oss/         # Om oss-sidor
│   │   ├── operation/      # Operationssidor
│   │   ├── r/              # Rehabredirects
│   │   ├── rehab/          # Rehabsidor
│   │   └── sjukdomar/      # Sjukdomssidor
│   │
│   └── styles/
│       └── global.css
│
├── docs/                   # Intern dokumentation
│   ├── BILDHANTERING.md    # Bildoptimering
│   ├── CHANGELOG.md
│   ├── CHECKLIST.md
│   ├── KOPIERA-LANKAR.md   # Kortlänkssystem
│   ├── OPERATION-SIDOR.md  # Operationssystem
│   └── ...
│
├── prompts/                # AI-prompts för innehåll
│
├── astro.config.mjs        # Astro + redirects
├── netlify.toml            # Netlify-konfiguration
├── tailwind.config.mjs
└── package.json
```

---

## 🔧 Teknisk Stack

- **Framework:** Astro 5.x
- **Styling:** Tailwind CSS 4.x
- **TypeScript:** Strict mode
- **Font:** Inter (Google Fonts)
- **Hosting:** Netlify
- **Bildoptimering:** Astro Image (Sharp)
- **Sökning:** Pagefind

---

## ⚙️ Konfiguration

### astro.config.mjs
- Dynamiska redirects från `shortLinks.json`
- Sitemap med i18n (sv/en)
- Sharp bildoptimering
- HTML-komprimering

### netlify.toml
- Cache-headers för statiska assets (1 år)
- WebP-specifika headers
- Astro-bildoptimering (Netlify Image CDN avstängt)

---

## 📝 Dokumentation

| Dokument | Innehåll |
|----------|----------|
| `docs/OPERATION-SIDOR.md` | Hur man skapar/redigerar operationssidor |
| `docs/KOPIERA-LANKAR.md` | Kortlänkssystemet och Link Generator |
| `docs/BILDHANTERING.md` | Bildformat, storlekar, optimering |
| `docs/CHECKLIST.md` | Checklista för nya sidor |
| `README.md` | Snabbstart och deployment |

---

## 🚀 Vanliga uppgifter

### Lägga till ny operation
1. Skapa sida i `src/pages/operation/[kroppsdel]/`
2. Importera komponenter från `src/components/operation/`
3. Lägg till i Header.astro (meny)
4. Lägg till kortlänk i `src/data/shortLinks.json`

### Lägga till ny kortlänk
1. Öppna `/copy-links` i webbläsaren
2. Använd Link Generator längst ner
3. Kopiera JSON och lägg till i `shortLinks.json`
4. Pusha till GitHub

### Lägga till ny diagnossida
1. Skapa sida i `src/pages/sjukdomar/[kroppsdel]/`
2. Använd `BaseLayout` eller skapa specifik layout
3. Lägg till i Header.astro (meny)
4. Lägg till kortlänk

---

*Dokument underhålls manuellt. Uppdatera vid större förändringar.*
