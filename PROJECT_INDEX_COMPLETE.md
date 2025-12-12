# Komplett Projektindexering - Södermalms Ortopedi

## 📋 Översikt
Astro-webbplats för Södermalms Ortopedi med Tailwind CSS och TypeScript. Komponentbaserad arkitektur med återanvändbara komponenter och layouts.

---

## 🎨 Tailwind-färger & Designsystem

### Primära varumärkesfärger (Custom Hex)
- **Mörkblå (Banner)**: `#023550` - Toppbanner bakgrund
- **Mörkblå (Navigation)**: `#024264` - Navigationstexter, länkar
- **Ljusblå (Header)**: `#EBF8FF` - Header-bakgrund

**Användning i Tailwind**:
- `bg-[#023550]` - Toppbanner
- `bg-[#024264]` - Navigation text
- `bg-[#EBF8FF]` - Header bakgrund
- `text-[#024264]` - Navigation länkar

### Sky-färger (Primär accentfärg)
Används för primära CTA-knappar, hero-sektioner, accent-element:

| Färg | Användning | Exempel |
|------|-----------|---------|
| `sky-50` | Ljus bakgrund, sektioner | Info-boxar, kort-bakgrunder |
| `sky-100` | Ljusare accent | Badges, highlights |
| `sky-200` | Borders, outlines | Kort-borders |
| `sky-400` | Border accent | Fokus-states |
| `sky-600` | Sekundär accent | Tabs (aktiv) |
| `sky-700` | **Primär accent** | Hero-sektioner, knappar, rubriker |
| `sky-800` | Mörk accent | Hover-states, footer |

**Vanliga kombinationer**:
- Hero: `bg-sky-700 text-white`
- Knappar: `bg-sky-700 text-white hover:bg-sky-800`
- Rubriker: `text-sky-700`
- Bakgrunder: `bg-sky-50`

### Gråfärger (Text & bakgrunder)
| Färg | Användning |
|------|-----------|
| `gray-50` | Ljus bakgrund (body default) |
| `gray-100` | Mycket ljus bakgrund |
| `gray-200` | Borders, divider, placeholder |
| `gray-300` | Ljusare borders |
| `gray-400` | Sekundär text, ikoner |
| `gray-500` | Mellantext |
| `gray-600` | Sekundär text |
| `gray-700` | Primär text |
| `gray-800` | Mörk text, footer-bakgrund |
| `gray-900` | Mycket mörk text |

**Standard body**: `bg-gray-50 text-gray-800`

### Accentfärger

#### Amber (Varningar/Alert)
- `amber-50` - Ljus bakgrund för varningar
- `amber-500` - Border accent
- `amber-600` - Primär amber (knappar)
- `amber-700` - Hover-state
- `amber-800` - Text i varningar

**Användning**: Akuta meddelanden, viktiga noteringar
**Exempel**: `bg-amber-50 border-l-4 border-amber-500`

#### Grön (Success/Positiv)
- `green-100` - Ljus bakgrund
- `green-500` - Primär grön (ikon-knappar)
- `green-600` - Hover-state
- `green-700` - Text/badges

**Användning**: Frikort-badges, success-meddelanden
**Exempel**: `bg-green-100 text-green-700` (Frikort gäller)

#### Röd (Fel/Varning)
- `red-100` - Ljus bakgrund
- `red-700` - Text/badges

**Användning**: Varningar, "Frikort gäller ej"
**Exempel**: `bg-red-100 text-red-700`

#### Gul (Stjärnor/Betyg)
- `yellow-400` - Stjärnor i recensioner

### Typografi
- **Font-familj**: Inter (Google Fonts)
- **Vikter använda**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)
- **Font-loading**: Preconnect till Google Fonts i BaseLayout

**Hierarki**:
- H1: `text-4xl md:text-6xl font-bold`
- H2: `text-3xl md:text-4xl font-bold`
- H3: `text-2xl font-bold`
- H4: `text-xl font-semibold`
- Body: `text-lg` eller `text-base`
- Small: `text-sm`

### Spacing & Layout
- **Container**: `max-w-6xl` (standard) eller `max-w-7xl` (footer) med `mx-auto`
- **Padding**: 
  - Mobil: `px-6`
  - Desktop: `px-4` (komponenter), `px-6` (sidor)
- **Gap**: `gap-4`, `gap-8` för grid-layouts
- **Rounded corners**: 
  - `rounded-full` (knappar)
  - `rounded-2xl` (kort, större element)
  - `rounded-lg` (mindre element, modaler)
  - `rounded-xl` (kort med mer padding)

### Shadows
- `shadow-lg` - Standard kort
- `shadow-xl` - Hover-state, modaler
- `shadow-md` - Mindre element

---

## 🧩 Komponenter i /src/components

### 1. Header.astro
**Plats**: `src/components/Header.astro`

**Struktur**:
```
Header
├── Toppbanner (sticky top-0)
│   └── Länk till "Fritt Vårdval"
├── Huvudheader (sticky top-[36px])
│   ├── Logo
│   ├── Desktop-navigation (lg:flex)
│   │   ├── Sjukdomar (dropdown)
│   │   ├── Rehab (dropdown)
│   │   ├── Fråga Doktorn (dropdown)
│   │   ├── Patient (dropdown)
│   │   └── Om Oss (dropdown)
│   ├── Mobil hamburger-meny (lg:hidden)
│   └── Mobil ikoner (lg:hidden)
│       ├── Telefon (öppnar modal)
│       ├── E-post (mailto:)
│       └── Karta (Google Maps)
└── Mobilmeny (slide-in från höger)
    ├── Huvudmenyer
    └── "Mer för dig som patient"-sektion
```

**Färger**:
- Toppbanner: `bg-[#023550] text-white border-b border-blue-400`
- Header: `bg-[#EBF8FF] shadow-xl`
- Navigation: `text-[#024264] hover:text-blue-700`
- Dropdown: `bg-[#EBF8FF] hover:bg-blue-200`
- Mobilmeny: `bg-[#EBF8FF]`

**JavaScript-funktionalitet**:
- Toggle mobilmeny (slide-in från höger)
- Stäng mobilmeny vid klick på länk
- ARIA-expanded states
- Body overflow-hantering

**Dropdown-menyer**:
- **Sjukdomar**: `/sjukdomar/axel/`, `/sjukdomar/kna/`, `/sjukdomar/armbage/`
- **Rehab**: `/rehab/axel/`, `/rehab/kna/`, `/rehab/armbage/`
- **Fråga Doktorn**: `/fraga-doktorn/axel/`, `/fraga-doktorn/kna/`, `/fraga-doktorn/armbage/`, `/fraga-doktorn/stall-ny-fraga/`
- **Patient**: `/patient/kom-till-oss/`, `/patient/remiss-vantetid/`, `/patient/forsakringar-betalning/`, `/patient/boka-omboka/`
- **Om Oss**: `/om-oss/vart-team/`, `/om-oss/kvalitet-forskning/`, `/om-oss/om-kliniken-hitta-hit/`, `/om-oss/faq/`

**Notering**: Många länkar pekar på sidor som ännu inte finns skapade.

### 2. footer.astro
**Plats**: `src/components/footer.astro`

**Struktur**:
```
Footer (bg-gray-800)
├── Grid (2 kolumner mobil, 4 kolumner desktop)
│   ├── Kontakt
│   │   ├── Telefon: 08-55 11 04 22
│   │   ├── E-post: info@sodermalmsortopedi.se
│   │   └── Fax: 08-55 11 04 24
│   ├── Södermalms Ortopedi
│   │   ├── Besöksadress: Fatburs Brunnsgata 15-17
│   │   └── Postadress: XZA 561-C BILLO, 106 46 Stockholm
│   ├── Patient
│   │   ├── Frågeformulär (Privat)
│   │   ├── Fritt Vårdval
│   │   ├── Patientavgifter
│   │   └── Försäkringsbolag
│   └── Länkar
│       ├── Rehabprogram
│       ├── Patientinformation
│       └── Om oss
└── Copyright (border-t)
```

**Färger**:
- Bakgrund: `bg-gray-800`
- Text: `text-gray-300`, `text-gray-400`
- Rubriker: `text-white`
- Länkar: `hover:text-white`

**Responsiv design**:
- Mobil: `grid-cols-2`
- Desktop: `md:grid-cols-4`

### 3. FooterMap.astro
**Plats**: `src/components/FooterMap.astro`

**Funktionalitet**:
- Google Maps iframe
- Visar Södermalms Ortopedi på Fatburs Brunnsgata
- Höjd: `h-96` (384px)
- Lazy loading: `loading="lazy"`
- Accessibility: `title` attribut, `sr-only` rubrik

**Notering**: Detta är en separat komponent, men Google Maps är också inkluderad direkt i BaseLayout. Överväg att använda endast komponenten.

### 4. PhoneModal.astro
**Plats**: `src/components/PhoneModal.astro`

**Funktionalitet**:
- HTML5 `<dialog>` element
- Visar telefonnummer: 08-55 11 04 22
- Visar öppettider: Måndag-Fredag 08.00-16.00
- Visar fax: 08-55 11 04 24
- Stängs med X-knapp eller klick utanför

**Styling**:
- `max-w-sm` med `rounded-lg`
- Backdrop: `backdrop:bg-black/50 backdrop:backdrop-blur-sm`
- Shadow: `shadow-xl`

**JavaScript**:
- Event listeners för stängning
- TypeScript-typer för dialog-element

**Notering**: Modal öppnas från mobil ikon-knapp i Header, men det finns ingen trigger-knapp i desktop-vyn.

---

## 📐 Layout

### BaseLayout.astro
**Plats**: `src/layouts/BaseLayout.astro`

**Props**:
- `title` (string) - Sidans titel

**Struktur**:
```html
<!doctype html>
<html lang="sv">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="Google Fonts Inter" />
    <link rel="icon" ... />
    <link rel="apple-touch-icon" ... />
    <link rel="manifest" href="/site.webmanifest" />
  </head>
  <body class="bg-gray-50 text-gray-800 font-sans min-h-screen flex flex-col pt-20">
    <Header />
    {Breadcrumbs (conditional)}
    <slot /> <!-- Sidans innehåll -->
    <Google Maps section>
    <Footer />
  </body>
</html>
```

**Brödsmulor-logik**:
```javascript
// 1. Hämtar pathname och tar bort avslutande /
const pathname = Astro.url.pathname.replace(/\/$/, '');

// 2. Delar upp i segment
const segments = pathname.split('/').filter(s => s.length > 0);

// 3. Formaterar segment (bindestreck → mellanslag, kapitalisering)
function formatSegment(segment) {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// 4. Visas inte på startsidan
const shouldShowBreadcrumbs = pathname !== '';
```

**Brödsmulor-styling**:
- Container: `max-w-6xl mx-auto w-full px-6 pt-4 pb-2`
- Text: `text-sm text-gray-500`
- Länkar: `hover:text-sky-700`
- Sista segment: `font-semibold text-gray-700`

**Google Maps**:
- Inkluderad direkt i layouten (inte som komponent)
- Höjd: `h-96`
- Lazy loading: `loading="lazy"`
- Accessibility: `sr-only` rubrik, `title` attribut

**Global CSS**:
- Importeras: `import "../styles/global.css"`

---

## 📄 Sidor

### 1. index.astro (Startsida)
**Route**: `/`

**Sektioner**:
1. **Hero** (`bg-sky-700`)
   - H1: "Specialistvård för axel, knä och armbåge"
   - CTA-knappar: "Patienter", "Vårdgivare"
   - Padding: `pt-24 pb-32`

2. **Akut skada-banner** (`bg-amber-50`)
   - Varning om 24-timmars handläggning
   - Telefonnummer: 08-55 11 04 22
   - Länkar: För Patienter, För Vårdgivare
   - Border: `border-l-4 border-amber-600`

3. **Fyra vägar till vård** (`bg-gray-50`)
   - Grid: 4 kolumner (desktop)
   - Kort för: Region Stockholm, Annan region, Privatpatient, Försäkringsbolag
   - Ytterligare 2 kort: Sjukvårdspersonal, Flytta remiss

4. **Expertis** (`bg-white`)
   - 3 kort: Axel, Knä, Armbåge
   - Ikoner från extern URL (specialist.se)
   - Länkar till sjukdomsinformation (ännu inte skapade)

5. **Patientinformation** (`bg-sky-50`)
   - 2 kort: Patientinformation, Rehabprogram
   - Länkar (ännu inte skapade)

6. **Recensioner** (`bg-white`)
   - 3 testimonial-kort
   - Stjärnor: `text-yellow-400`
   - Border: `border border-gray-200`

7. **Förtroende** (`bg-sky-50`)
   - CTA-sektion
   - Länk till "Lär känna våra läkare"

### 2. akut-remiss.astro
**Route**: `/akut-remiss`

**Notering**: Denna sida använder INTE BaseLayout! Den har egen HTML-struktur.

**Struktur**:
- Egen `<head>` med Tailwind CDN (inte rekommenderat)
- Hero med SVG-illustration (Vespa-olycka)
- Två kolumner: Information + Viktiga noteringar
- Digital remissuppladdning: 2 kolumner (Dator vs Mobil)
- Tidslinje-infografik (4 steg)
- JavaScript för kopiera-lösenord funktionalitet

**SEO**:
- `<title>`: "Akutremiss - Handläggning"
- `<meta name="description">`: "Akut ortopedisk skada? Skicka in din remiss digitalt..."

**Färger**:
- Hero: `bg-sky-700`
- Info-boxar: `bg-blue-50` med `border-blue-200` eller `border-blue-500`
- Varningar: `bg-amber-50` med `border-amber-500`

**JavaScript**:
- Kopiera-lösenord funktionalitet med clipboard API
- Fallback för äldre webbläsare
- Visual feedback vid kopiering

**Förbättringar behövs**:
- Konvertera till BaseLayout
- Ta bort Tailwind CDN (använd Astro-integration)

### 3. fritt-vardval-sverige.astro
**Route**: `/fritt-vardval-sverige`

**Funktionalitet**:
- Interaktiv tab-sektion (4 tabs)
- Process-steg (3 steg med pilar)
- Jämförelse: Fritt Vårdval vs Vårdgaranti
- Tidslinje för vårdgaranti (90 + 90 dagar)
- JavaScript för tab-funktionalitet

**Tabs**:
1. "Vad är Fritt Vårdval?"
2. "Hur fungerar det?"
3. "En Vanlig Myt"
4. "Varför Välja Oss?"

**Färger**:
- Tabs aktiv: `bg-sky-600 text-white`
- Tabs inaktiv: `bg-white border-sky-600 text-sky-600`
- Process-steg: `bg-white border-sky-200`
- Jämförelse: `bg-sky-50`

**JavaScript**:
- Tab-switching funktionalitet
- Fade-in animation för innehåll

### 4. patientavgifter.astro
**Route**: `/patientavgifter`

**Struktur**:
- Header med Region Stockholm-logo
- Högkostnadsskydd-information
- Prislista med badges

**Priser**:
- Nybesök: 275 kr (Frikort gäller)
- Återbesök: 275 kr (Frikort gäller)
- Operation: 275 kr (Frikort gäller)
- Uteblivet besök: 400 kr (Frikort gäller ej)

**Färger**:
- Header: `bg-sky-800 text-white`
- Badges frikort: `bg-green-100 text-green-700`
- Badges ej frikort: `bg-red-100 text-red-700`

### 5. privatpatient-tre-val.astro
**Route**: `/privatpatient-tre-val`

**Struktur**:
- Header med prisinformation (1450:-)
- 3 kort (Axel, Knä, Armbåge) med ikoner
- Varje kort har CTA-knapp

**Prisinformation**:
- Fast pris: 1450:-
- Inkluderar: Ultraljudsundersökning (550:-) och/eller kortisoninjektion (350:-)

**Färger**:
- Kort: `bg-white border-gray-200`
- Ikon-bakgrund: `bg-sky-50`
- Knappar: `bg-sky-700 text-white`

**Notering**: Länkar till formulär (ännu inte skapade)

### 6. vara-forsakringsbolag.astro
**Route**: `/vara-forsakringsbolag`
**Status**: Tom fil

### 7. vardgivare.astro
**Route**: `/vardgivare`
**Status**: Tom fil

---

## 🏥 Sjukdomssidor - Struktur

### Nuvarande status
**Sjukdomssidor finns INTE ännu skapade**, men headern länkar till:
- `/sjukdomar/axel/`
- `/sjukdomar/kna/`
- `/sjukdomar/armbage/`

### Förväntad struktur (baserat på header-länkar)
```
/sjukdomar/
  ├── axel/
  ├── kna/
  └── armbage/

/rehab/
  ├── axel/
  ├── kna/
  └── armbage/

/fraga-doktorn/
  ├── axel/
  ├── kna/
  ├── armbage/
  └── stall-ny-fraga/

/patient/
  ├── kom-till-oss/
  ├── remiss-vantetid/
  ├── forsakringar-betalning/
  └── boka-omboka/

/om-oss/
  ├── vart-team/
  ├── kvalitet-forskning/
  ├── om-kliniken-hitta-hit/
  └── faq/
```

### Mall för nya sidor
**Plats**: `src/pages/Mall-for-header-banner-footer.txt`

**Struktur**:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="Titel för din nya sida här">

    <main>
        
        <section class="py-12 md:py-20">
            <div class="max-w-6xl mx-auto px-6">
                
                <h1>Huvudrubrik för min nya sida</h1>
                <p>Detta är det unika innehållet som visas i `<slot />` i BaseLayout.</p>
                </div>
        </section>

    </main>
    
    <style>
        /* CSS unikt för denna sida */
    </style>
    <script>
        // JavaScript unikt för denna sida
    </script>

</BaseLayout>
```

---

## 📝 Formulär

### Nuvarande status
**Inga faktiska formulär finns ännu**, men det finns referenser till:

1. **Frågeformulär för privatpatienter**:
   - Länk från: `/privatpatient-tre-val`
   - Tre val: Axel, Knä, Armbåge
   - Länkar pekar på `#` (ännu inte skapade)

2. **Digitalt frågeformulär** (efter bokning):
   - Nämns i `akut-remiss.astro`
   - Fylls i efter att remiss är godkänd och tid är bokad
   - Om skada och hälsa

3. **Remissuppladdning**:
   - Externa länkar till Storegate
   - Lösenord: `2026nyår`
   - BankID-autentisering krävs

### Förväntad formulärstruktur
Baserat på referenser i koden, formulär behöver skapas för:
- Privatpatient-frågeformulär (3 varianter: Axel, Knä, Armbåge)
- Digitalt frågeformulär efter bokning
- "Ställ ny fråga" (`/fraga-doktorn/stall-ny-fraga/`)

---

## 🔍 SEO-setup

### Nuvarande SEO-implementation

#### BaseLayout.astro
**Meta tags**:
- `<meta charset="UTF-8" />`
- `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`
- `<title>{title}</title>` (dynamisk via props)

**Saknas**:
- ❌ Meta description
- ❌ Open Graph tags
- ❌ Twitter Card tags
- ❌ Canonical URL
- ❌ Structured data (JSON-LD)
- ❌ Language alternates

#### akut-remiss.astro
**Har**:
- ✅ `<meta name="description">`: "Akut ortopedisk skada? Skicka in din remiss digitalt..."

**Saknas**:
- ❌ Open Graph
- ❌ Twitter Cards
- ❌ Structured data

#### Andra sidor
- ❌ Ingen meta description
- ❌ Inga Open Graph tags
- ❌ Inga Twitter Cards

### Web App Manifest
**Plats**: `public/site.webmanifest`

**Nuvarande innehåll** (behöver uppdateras):
```json
{
  "name": "MyWebSite",
  "short_name": "MySite",
  "theme_color": "#ffffff",
  "background_color": "#ffffff"
}
```

**Bör innehålla**:
- `name`: "Södermalms Ortopedi"
- `short_name`: "Södermalms Ortopedi"
- `theme_color`: `#023550` eller `#024264`
- `background_color`: `#EBF8FF` eller `#ffffff`

### Favicon & Icons
**Finns**:
- ✅ `/favicon.svg`
- ✅ `/favicon.ico`
- ✅ `/favicon-96x96.png`
- ✅ `/apple-touch-icon.png`
- ✅ `/web-app-manifest-192x192.png`
- ✅ `/web-app-manifest-512x512.png`

### Förbättringar behövs
1. **Lägg till meta description i BaseLayout** (via props)
2. **Lägg till Open Graph tags**
3. **Lägg till Twitter Card tags**
4. **Lägg till canonical URL**
5. **Lägg till structured data (JSON-LD)** för:
   - MedicalBusiness/Organization
   - BreadcrumbList
6. **Uppdatera site.webmanifest** med korrekt information
7. **Lägg till sitemap.xml**
8. **Lägg till robots.txt**

---

## 🎯 Designmönster & Best Practices

### Knappar

#### Primär knapp
```html
<a href="#" class="bg-sky-700 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:bg-sky-800 transition duration-300 text-lg">
  Text
</a>
```

#### Sekundär knapp
```html
<a href="#" class="bg-white text-sky-700 border-2 border-white rounded-full font-bold py-3 px-8 hover:bg-white hover:text-sky-700 transition duration-300 text-lg">
  Text
</a>
```

#### Ikon-knappar (mobil)
```html
<button class="icon-button" aria-label="Beskrivning">
  <!-- SVG ikon -->
</button>
```
Definierad i `global.css`:
```css
.icon-button {
  @apply w-10 h-10 flex items-center justify-center rounded-full bg-green-500 text-white transition-colors hover:bg-green-600;
}
```

### Kort

#### Standard kort
```html
<div class="bg-white p-8 rounded-2xl shadow-lg flex flex-col transition duration-300 hover:shadow-xl">
  <!-- Innehåll -->
</div>
```

#### Kort med ikon-bakgrund
```html
<div class="border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
  <div class="h-64 w-full bg-sky-50 flex items-center justify-center p-4">
    <img src="..." alt="..." class="h-full w-full object-contain"/>
  </div>
  <div class="p-8 bg-white flex flex-col flex-grow">
    <!-- Innehåll -->
  </div>
</div>
```

### Sektioner

#### Standard sektion
```html
<section class="py-20 bg-white">
  <div class="max-w-6xl mx-auto px-6">
    <!-- Innehåll -->
  </div>
</section>
```

#### Alternerande bakgrunder
- `bg-white` → `bg-gray-50` → `bg-sky-50` → `bg-white`

### Grid-layouts

#### Responsiv grid
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
  <!-- Kort -->
</div>
```

### Info-boxar

#### Varning (Amber)
```html
<div class="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg">
  <!-- Innehåll -->
</div>
```

#### Info (Blue)
```html
<div class="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
  <!-- Innehåll -->
</div>
```

#### Success (Green)
```html
<div class="bg-green-100 text-green-700 px-3 py-1 rounded-full">
  Frikort gäller
</div>
```

### Badges
```html
<span class="text-sm font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full">
  Frikort gäller
</span>
```

---

## 📁 Komplett Projektstruktur

```
SHARP/
├── public/                          # Statiska filer
│   ├── logo.svg
│   ├── favicon.svg
│   ├── favicon.ico
│   ├── favicon-96x96.png
│   ├── apple-touch-icon.png
│   ├── site.webmanifest
│   ├── web-app-manifest-192x192.png
│   ├── web-app-manifest-512x512.png
│   └── qrcode-akut-remiss.svg
│
├── src/
│   ├── components/                   # Återanvändbara komponenter
│   │   ├── Header.astro             # Navigation med dropdown-menyer
│   │   ├── footer.astro             # Footer med 4 kolumner
│   │   ├── FooterMap.astro          # Google Maps komponent
│   │   └── PhoneModal.astro         # Dialog-modal för telefoninfo
│   │
│   ├── layouts/                     # Layout-mallar
│   │   └── BaseLayout.astro         # Grundlayout med brödsmulor
│   │
│   ├── pages/                       # Sidor (routes)
│   │   ├── index.astro              # Startsida ✅
│   │   ├── akut-remiss.astro        # Akut remiss (ej BaseLayout) ⚠️
│   │   ├── fritt-vardval-sverige.astro ✅
│   │   ├── patientavgifter.astro   ✅
│   │   ├── privatpatient-tre-val.astro ✅
│   │   ├── vara-forsakringsbolag.astro ❌ (tom)
│   │   ├── vardgivare.astro         ❌ (tom)
│   │   └── Mall-for-header-banner-footer.txt (mall)
│   │
│   └── styles/
│       └── global.css               # Globala stilar (icon-button)
│
├── astro.config.mjs                 # Astro-konfiguration
├── tailwind.config.mjs              # Tailwind-konfiguration
├── tsconfig.json                    # TypeScript-konfiguration
├── package.json                     # Dependencies
└── PROJECT_INDEX_COMPLETE.md       # Denna fil
```

**Legend**:
- ✅ = Komplett
- ⚠️ = Behöver förbättringar
- ❌ = Tom/Ofullständig

---

## 🔧 Teknisk Stack

- **Framework**: Astro 5.15.5
- **Styling**: Tailwind CSS 3.4.18
- **Integration**: @astrojs/tailwind 6.0.2
- **TypeScript**: Strict mode (astro/tsconfigs/strict)
- **Font**: Inter (Google Fonts)
- **Build**: Astro build system

---

## 📝 Viktiga Noteringar

### 1. Custom färger
Projektet använder både Tailwind-standardfärger och custom hex-färger:
- `#023550`, `#024264`, `#EBF8FF` används direkt i klasser
- **Rekommendation**: Flytta till `tailwind.config.mjs` för bättre återanvändning

### 2. akut-remiss.astro
- Använder INTE BaseLayout
- Använder Tailwind CDN (inte rekommenderat)
- **Rekommendation**: Konvertera till BaseLayout och använd Astro Tailwind-integration

### 3. Saknade sidor
Många länkar i headern pekar på sidor som ännu inte finns:
- Alla `/sjukdomar/*` sidor
- Alla `/rehab/*` sidor
- Alla `/fraga-doktorn/*` sidor
- Alla `/patient/*` sidor
- Alla `/om-oss/*` sidor

### 4. Formulär
Inga formulär finns ännu, men refereras till i flera sammanhang.

### 5. SEO
Minimal SEO-implementation. Behöver:
- Meta descriptions
- Open Graph tags
- Twitter Cards
- Structured data
- Sitemap
- Robots.txt

### 6. Google Maps
Inkluderas både i BaseLayout och som separat komponent (FooterMap.astro). Överväg att använda endast komponenten.

---

## 🚀 Rekommenderade Nästa Steg

1. **Konvertera akut-remiss.astro till BaseLayout**
2. **Flytta custom färger till tailwind.config.mjs**
3. **Lägg till SEO-meta tags i BaseLayout**
4. **Skapa saknade sidor** (eller ta bort länkar)
5. **Skapa formulär-komponenter**
6. **Uppdatera site.webmanifest**
7. **Lägg till sitemap.xml och robots.txt**
8. **Förenkla Google Maps** (använd endast komponent)

---

*Dokument skapad: 2025-01-27*
*Senast uppdaterad: 2025-01-27*





