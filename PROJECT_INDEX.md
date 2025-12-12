# Projektindexering - Södermalms Ortopedi

## 📋 Översikt
Detta är en Astro-webbplats för Södermalms Ortopedi, byggd med Tailwind CSS och TypeScript. Projektet använder en komponentbaserad arkitektur med återanvändbara komponenter och layouts.

---

## 🎨 Designsystem & Tailwind-färger

### Primära varumärkesfärger
- **Mörkblå (Header/Banner)**: `#023550` - Används i toppbanner
- **Mörkblå (Navigation)**: `#024264` - Används för navigationstexter och länkar
- **Ljusblå (Header-bakgrund)**: `#EBF8FF` - Används som header-bakgrund

### Sky-färger (Primär accentfärg)
- `sky-50` - Ljus bakgrund (t.ex. sektioner, kort)
- `sky-100` - Ljusare accent
- `sky-200` - Border/outline
- `sky-400` - Border accent
- `sky-600` - Sekundär accent
- `sky-700` - Primär accent (hero-sektioner, knappar, rubriker)
- `sky-800` - Mörkare accent (hover-states, footer)

### Gråfärger (Text & bakgrunder)
- `gray-50` - Ljus bakgrund
- `gray-100` - Mycket ljus bakgrund
- `gray-200` - Borders, divider
- `gray-300` - Ljusare borders
- `gray-400` - Sekundär text
- `gray-500` - Mellantext
- `gray-600` - Sekundär text
- `gray-700` - Primär text
- `gray-800` - Mörk text, footer-bakgrund
- `gray-900` - Mycket mörk text

### Accentfärger

#### Amber (Varningar/Alert)
- `amber-50` - Ljus bakgrund för varningar
- `amber-500` - Border accent
- `amber-600` - Primär amber (knappar)
- `amber-700` - Hover-state
- `amber-800` - Text i varningar

#### Grön (Success/Positiv)
- `green-100` - Ljus bakgrund
- `green-500` - Primär grön (ikon-knappar)
- `green-600` - Hover-state
- `green-700` - Text/badges

#### Röd (Fel/Varning)
- `red-100` - Ljus bakgrund
- `red-700` - Text/badges

#### Gul (Stjärnor/Betyg)
- `yellow-400` - Stjärnor i recensioner

### Typografi
- **Font-familj**: Inter (Google Fonts)
- **Vikter**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)

### Spacing & Layout
- Container: `max-w-6xl` eller `max-w-7xl` med `mx-auto`
- Padding: `px-6` (mobil), `px-4` (komponenter)
- Gap: `gap-4`, `gap-8` för grid-layouts
- Rounded corners: `rounded-full` (knappar), `rounded-2xl` (kort), `rounded-lg` (mindre element)

---

## 🧩 Komponenter

### 1. Header.astro
**Plats**: `src/components/Header.astro`

**Funktionalitet**:
- Sticky header med två delar:
  - Toppbanner (`#023550`) - Sticky `top-0`
  - Huvudheader (`#EBF8FF`) - Sticky `top-[36px]`
- Desktop-navigation med dropdown-menyer
- Mobilmeny (slide-in från höger)
- Mobil ikoner (telefon, e-post, karta) - alltid synliga på mobil

**Struktur**:
- Toppbanner med länk till "Fritt Vårdval"
- Logo (`/logo.svg`)
- Desktop-menyer: Sjukdomar, Rehab, Fråga Doktorn, Patient, Om Oss
- Mobil hamburger-meny
- JavaScript för mobilmeny-toggle

**Färger**:
- Banner: `bg-[#023550]` med `text-white`
- Header: `bg-[#EBF8FF]`
- Navigation: `text-[#024264]` med `hover:text-blue-700`
- Dropdown: `bg-[#EBF8FF]` med `hover:bg-blue-200`

### 2. footer.astro
**Plats**: `src/components/footer.astro`

**Funktionalitet**:
- Footer med 4 kolumner (2 på mobil, 4 på desktop)
- Kontaktinformation
- Adressinformation
- Länkar till patient-sidor
- Copyright-notis

**Färger**:
- Bakgrund: `bg-gray-800`
- Text: `text-gray-300`, `text-gray-400`
- Rubriker: `text-white`

### 3. FooterMap.astro
**Plats**: `src/components/FooterMap.astro`

**Funktionalitet**:
- Google Maps iframe
- Visar Södermalms Ortopedi på Fatburs Brunnsgata
- Höjd: `h-96` (384px)

### 4. PhoneModal.astro
**Plats**: `src/components/PhoneModal.astro`

**Funktionalitet**:
- Dialog-modal för telefoninformation
- Visar telefonnummer och öppettider
- Stängs med X-knapp eller klick utanför
- Använder HTML5 `<dialog>` element

**Styling**:
- `max-w-sm` med `rounded-lg`
- Backdrop blur: `backdrop:bg-black/50 backdrop:backdrop-blur-sm`

---

## 📐 Layout

### BaseLayout.astro
**Plats**: `src/layouts/BaseLayout.astro`

**Funktionalitet**:
- Grundlayout för alla sidor
- Importerar global CSS
- Inkluderar Header och Footer
- Dynamiska brödsmulor (visas inte på startsidan)
- Google Maps-sektion (inkluderad direkt i layouten)
- Font: Inter från Google Fonts
- Favicon och manifest-länkar

**Struktur**:
```html
<html>
  <head>
    - Meta tags
    - Google Fonts (Inter)
    - Favicon länkar
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
- Delar upp URL-sökväg i segment
- Formaterar segment (bindestreck → mellanslag, kapitalisering)
- Visas inte på startsidan (`pathname === ''`)

---

## 📄 Sidor

### 1. index.astro (Startsida)
**Sektioner**:
- Hero (`bg-sky-700`) - Stor rubrik med CTA-knappar
- Akut skada-banner (`bg-amber-50`) - Varning med telefonnummer
- Fyra vägar till vård (`bg-gray-50`) - Grid med 4 kort
- Expertis (`bg-white`) - 3 kort (Axel, Knä, Armbåge)
- Patientinformation (`bg-sky-50`) - 2 kort
- Recensioner (`bg-white`) - 3 testimonial-kort
- Förtroende (`bg-sky-50`) - CTA-sektion

**Färger**:
- Hero: `bg-sky-700 text-white`
- Knappar: `bg-white text-sky-700` eller `bg-transparent border-2 border-white`
- Kort: `bg-white` med `shadow-lg`

### 2. akut-remiss.astro
**Struktur**:
- Hero med SVG-illustration (Vespa-olycka)
- Två kolumner: Information + Viktiga noteringar
- Digital remissuppladdning: 2 kolumner (Dator vs Mobil)
- Tidslinje-infografik (4 steg)
- JavaScript för kopiera-lösenord funktionalitet

**Färger**:
- Hero: `bg-sky-700`
- Info-boxar: `bg-blue-50` med `border-blue-200` eller `border-blue-500`
- Varningar: `bg-amber-50` med `border-amber-500`

### 3. fritt-vardval-sverige.astro
**Funktionalitet**:
- Interaktiv tab-sektion (4 tabs)
- Process-steg (3 steg med pilar)
- Jämförelse: Fritt Vårdval vs Vårdgaranti
- Tidslinje för vårdgaranti (90 + 90 dagar)
- JavaScript för tab-funktionalitet

**Färger**:
- Tabs: `bg-sky-600` (aktiv), `bg-white border-sky-600` (inaktiv)
- Process-steg: `bg-white border-sky-200`
- Jämförelse: `bg-sky-50`

### 4. patientavgifter.astro
**Struktur**:
- Header med Region Stockholm-logo
- Högkostnadsskydd-information
- Prislista med badges (Frikort gäller/Frikort gäller ej)

**Färger**:
- Header: `bg-sky-800 text-white`
- Badges: `bg-green-100 text-green-700` (frikort) eller `bg-red-100 text-red-700` (ej frikort)

### 5. privatpatient-tre-val.astro
**Struktur**:
- Header med prisinformation
- 3 kort (Axel, Knä, Armbåge) med ikoner
- Varje kort har CTA-knapp

**Färger**:
- Kort: `bg-white border-gray-200`
- Ikon-bakgrund: `bg-sky-50`
- Knappar: `bg-sky-700 text-white`

### 6. vara-forsakringsbolag.astro
**Status**: Tom fil

### 7. vardgivare.astro
**Status**: Tom fil

---

## 🎯 Designmönster & Best Practices

### Knappar
- Primär: `bg-sky-700 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:bg-sky-800`
- Sekundär: `bg-white text-sky-700 border-2 border-white rounded-full`
- Ikon-knappar (mobil): `icon-button` class (definierad i global.css)

### Kort
- Standard: `bg-white p-8 rounded-2xl shadow-lg`
- Hover: `hover:shadow-xl transition duration-300`
- Flex-col för jämn höjd: `flex flex-col flex-grow`

### Sektioner
- Alternerande bakgrunder: `bg-white` och `bg-gray-50` eller `bg-sky-50`
- Container: `max-w-6xl mx-auto px-6`
- Padding: `py-20` (desktop), `py-12` (mobil)

### Grid-layouts
- 1 kolumn mobil: `grid-cols-1`
- 2 kolumner tablet: `md:grid-cols-2`
- 3-4 kolumner desktop: `lg:grid-cols-3` eller `lg:grid-cols-4`

### Typografi
- H1: `text-4xl md:text-6xl font-bold`
- H2: `text-3xl md:text-4xl font-bold`
- H3: `text-2xl font-bold`
- Body: `text-lg` eller `text-base`

---

## 📁 Projektstruktur

```
SHARP/
├── public/                    # Statiska filer
│   ├── logo.svg
│   ├── favicon.*
│   └── ...
├── src/
│   ├── components/           # Återanvändbara komponenter
│   │   ├── Header.astro
│   │   ├── footer.astro
│   │   ├── FooterMap.astro
│   │   └── PhoneModal.astro
│   ├── layouts/              # Layout-mallar
│   │   └── BaseLayout.astro
│   ├── pages/                # Sidor (routes)
│   │   ├── index.astro
│   │   ├── akut-remiss.astro
│   │   ├── fritt-vardval-sverige.astro
│   │   ├── patientavgifter.astro
│   │   ├── privatpatient-tre-val.astro
│   │   ├── vara-forsakringsbolag.astro (tom)
│   │   └── vardgivare.astro (tom)
│   └── styles/
│       └── global.css        # Globala stilar
├── astro.config.mjs          # Astro-konfiguration
├── tailwind.config.mjs       # Tailwind-konfiguration
├── tsconfig.json             # TypeScript-konfiguration
└── package.json              # Dependencies
```

---

## 🔧 Teknisk Stack

- **Framework**: Astro 5.15.5
- **Styling**: Tailwind CSS 3.4.18
- **Integration**: @astrojs/tailwind 6.0.2
- **TypeScript**: Strict mode
- **Font**: Inter (Google Fonts)

---

## 🎨 Färgschema Sammanfattning

### Primärpalett
- **Mörkblå**: `#023550`, `#024264`
- **Ljusblå**: `#EBF8FF`
- **Sky**: `sky-50` → `sky-800`

### Accentpalett
- **Amber**: Varningar, akuta meddelanden
- **Grön**: Success, frikort-badges
- **Röd**: Fel, varningar
- **Gul**: Stjärnor, betyg

### Neutralpalett
- **Grå**: `gray-50` → `gray-900` (text, bakgrunder, borders)

---

## 📝 Noteringar

1. **Custom färger**: Projektet använder både Tailwind-standardfärger och custom hex-färger (`#023550`, `#024264`, `#EBF8FF`)
2. **Responsiv design**: Mobil-first approach med `md:` och `lg:` breakpoints
3. **Accessibility**: ARIA-labels, semantic HTML, screen reader-only text (`sr-only`)
4. **JavaScript**: Inline scripts i komponenter för interaktivitet (mobilmeny, tabs, modaler)
5. **Maps**: Google Maps iframe inkluderad både i BaseLayout och som separat komponent

---

## 🚀 Nästa Steg / Förbättringar

1. Fyll i tomma sidor: `vara-forsakringsbolag.astro` och `vardgivare.astro`
2. Överväg att flytta custom hex-färger till `tailwind.config.mjs` för bättre återanvändning
3. Överväg att extrahera JavaScript till separata filer för bättre maintainability
4. Lägg till TypeScript-typer för props i komponenter





