# Bildhantering och Optimering i Astro

## Översikt

Denna guide beskriver hur du hanterar bilder i Astro-projektet för bästa prestanda. Följ dessa regler för att säkerställa snabba laddtider och bra användarupplevelse.

---

## 📁 Var ska bilderna ligga?

### Struktur

```
public/
├── favicons/              ← Favicons och ikoner för webbläsare
│   ├── favicon.svg
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   └── site.webmanifest
│
└── images/                ← Statiska bilder (refereras direkt)
    ├── branding/          ← Logotyper, QR-koder (SVG)
    ├── icons/             ← Ikoner för navigation (SVG)
    ├── operation/         ← Ikoner för operationsidor (SVG, 24x24)
    ├── og/                ← Open Graph-bilder för sociala medier (SVG)
    ├── diseases/          ← Illustrationsbilder för diagnoser (SVG)
    └── team/              ← Profilbilder (WebP eller JPG)

src/assets/images/         ← Bilder som behöver optimering (WebP, PNG, JPG)
├── ac-ledsartros/         ← Diagnos-specifika bilder
├── operation/             ← Operationsbilder (bandage, produkter)
└── suprascapular-nerve/   ← Andra diagnosbilder
```

### Regel: När ska bilder ligga var?

| Bildtyp | Plats | Användning |
|---------|-------|------------|
| **SVG-ikoner** | `public/images/operation/` | Ikoner som används direkt i HTML (`<img src="/images/...">`) |
| **SVG-logotyper** | `public/images/branding/` | Logotyper och QR-koder |
| **WebP/PNG/JPG** | `src/assets/images/` | Bilder som importeras i Astro-komponenter för optimering |
| **Favicons** | `public/favicons/` | Webbläsarikoner |

---

## 🎨 Bildformat och när de ska användas

### SVG (Scalable Vector Graphics)
**När:** Ikoner, logotyper, illustrationer, diagram

**Fördelar:**
- ✅ Oändlig skalning utan kvalitetsförlust
- ✅ Mycket små filstorlekar
- ✅ Perfekt för ikoner och illustrationer

**Var:** `public/images/` (statiska SVG) eller `src/assets/images/` (om de behöver optimering)

**Exempel:**
- Ikoner: `/images/operation/medicine.svg`
- Logotyper: `/images/branding/logo.svg`
- Illustrationer: `/images/diseases/ac-ledsartros/ac-pain-distribution.svg`

### WebP (Rekommenderat för fotografier)
**När:** Foton, produktbilder, medicinska bilder (röntgen, MR)

**Fördelar:**
- ✅ 25-35% mindre än JPG med samma kvalitet
- ✅ Stödjer transparens (som PNG)
- ✅ Moderne webbläsare stödjer det

**Var:** `src/assets/images/` (importeras i Astro-komponenter)

**Exempel:**
- Operationsbilder: `src/assets/images/operation/bandage-stygn.webp`
- Profilbilder: `src/assets/images/team/carlos-rivero-siri.webp`

### JPG (Endast om WebP inte går)
**När:** Foton där WebP inte är möjligt (sällan nödvändigt)

**Var:** `src/assets/images/`

**OBS:** Konvertera alltid till WebP om möjligt!

### PNG (Endast för transparens när SVG inte fungerar)
**När:** Bilder med transparens där SVG inte är lämpligt

**Var:** `src/assets/images/`

**OBS:** Använd SVG istället om möjligt. PNG är större än WebP.

---

## 📐 Bildstorlekar och Dimensioner

### Ikoner (SVG)
- **Storlek:** 24x24 pixlar (för operation-ikoner)
- **Filstorlek:** < 5 KB (ofta < 2 KB)
- **Var:** `public/images/operation/`

### Logotyper (SVG)
- **Storlek:** Anpassad efter design
- **Filstorlek:** < 10 KB
- **Var:** `public/images/branding/`

### Produktbilder / Operationsbilder (WebP)
- **Storlek:** Max 1200px bredd (för desktop)
- **Filstorlek:** < 100 KB (helst < 50 KB)
- **Kvalitet:** 85% (bra balans mellan kvalitet och storlek)
- **Var:** `src/assets/images/operation/`

### Profilbilder (WebP)
- **Storlek:** 400x400px (för thumbnails) eller 800x800px (för större visning)
- **Filstorlek:** < 50 KB
- **Kvalitet:** 85%
- **Var:** `src/assets/images/team/`

### Medicinska bilder (Röntgen, MR) (WebP)
- **Storlek:** Max 1600px bredd
- **Filstorlek:** < 200 KB (helst < 150 KB)
- **Kvalitet:** 85-90%
- **Var:** `src/assets/images/[diagnos]/`

### Open Graph-bilder (Sociala medier)
- **Storlek:** 1200x630px (standard för Facebook, Twitter, LinkedIn)
- **Format:** SVG (för enkla) eller WebP (för fotografier)
- **Filstorlek:** < 200 KB
- **Var:** `public/images/og/` eller `src/assets/images/`

---

## 🖼️ Komprimering och Export i Affinity Designer & Photo

### Affinity Photo (för fotografier och WebP)

#### Steg 1: Förbered bilden
1. Öppna bilden i Affinity Photo
2. **Beskär** till rätt dimensioner (se tabellen ovan)
3. **Justera** ljusstyrka/kontrast om nödvändigt

#### Steg 2: Exportera som WebP
1. Gå till **File → Export**
2. Välj **WebP** som format
3. **Export Settings:**
   - **Quality:** 85% (standard, använd 90% för medicinska bilder)
   - **Lossless:** Av (om du vill ha mindre filstorlek)
   - **Preset:** Custom
4. Klicka **Export**
5. **Spara i:** `src/assets/images/[mapp]/`

#### Steg 3: Kontrollera filstorlek
- Öppna filen i Windows Explorer
- Kontrollera att storleken är inom rekommenderade gränser
- Om för stor: Minska kvaliteten till 80% eller minska dimensionerna

### Affinity Designer (för SVG-ikoner)

#### Steg 1: Skapa ikonen
1. Skapa nytt dokument: **24x24 px** (för operation-ikoner)
2. Designa ikonen
3. Använd **Vector**-verktyg (inte raster)

#### Steg 2: Exportera som SVG
1. Gå till **File → Export**
2. Välj **SVG** som format
3. **Export Settings:**
   - **Rasterize:** Av (behåll vektorer)
   - **Flatten transforms:** Av
   - **Add size attributes:** På (lägger till width/height)
   - **Use viewBox:** På
4. Klicka **Export**
5. **Spara i:** `public/images/operation/` (eller rätt mapp)

#### Steg 3: Optimera SVG (valfritt men rekommenderat)
1. Öppna SVG-filen i en texteditor
2. Ta bort onödiga metadata (om det finns)
3. Kontrollera att filstorleken är < 5 KB

### Affinity Photo → WebP (för fotografier)

#### Snabbguide:
```
1. Öppna bild → Affinity Photo
2. Beskär till rätt dimensioner
3. File → Export → WebP
4. Quality: 85%
5. Spara i src/assets/images/[mapp]/
6. Kontrollera filstorlek
```

### Affinity Designer → SVG (för ikoner)

#### Snabbguide:
```
1. Skapa 24x24 px dokument → Affinity Designer
2. Designa ikonen (använd vektorer)
3. File → Export → SVG
4. Rasterize: Av
5. Spara i public/images/operation/
6. Kontrollera filstorlek (< 5 KB)
```

---

## 🔄 Konvertering till WebP (om Affinity inte stödjer WebP)

Om Affinity Photo inte stödjer WebP-export direkt:

### Metod 1: Online-konvertering (Rekommenderat)
1. **Exportera som PNG** från Affinity Photo (Quality: 100%)
2. Gå till [Squoosh.app](https://squoosh.app) (Google's bildoptimering)
3. Ladda upp PNG-filen
4. Välj **WebP** som format
5. Sätt kvalitet till **85%**
6. Ladda ner och spara i `src/assets/images/[mapp]/`

### Metod 2: Affinity Photo → PNG → WebP
1. Exportera som **PNG** (Quality: 100%)
2. Använd [CloudConvert](https://cloudconvert.com/png-to-webp) eller liknande
3. Konvertera till WebP med 85% kvalitet
4. Spara i `src/assets/images/[mapp]/`

---

## 📦 Hur man använder bilder i Astro

### SVG (från `public/images/`)
```astro
<!-- Direkt referens (statisk) -->
<img src="/images/operation/medicine.svg" alt="Medicin" class="w-10 h-10" />
```

### WebP/PNG/JPG (från `src/assets/images/`)
```astro
---
// Importera bilden
import productImage from '../../assets/images/operation/bandage-stygn.webp';
---

<!-- Använd med Astro's optimering -->
<img 
  src={productImage.src} 
  alt="Bandage" 
  width="40"
  height="40"
  loading="lazy"
  decoding="async"
  class="w-10 h-10"
/>
```

### Med Astro Image-komponent (för större bilder)
```astro
---
import { Image } from 'astro:assets';
import heroImage from '../../assets/images/operation/hero.webp';
---

<Image 
  src={heroImage} 
  alt="Operation" 
  width={1200}
  height={630}
  loading="lazy"
  quality={85}
/>
```

---

## 🎯 Favicon-hantering

### Var favicons ska ligga
```
public/favicons/
├── favicon.svg          ← Modern favicon (rekommenderat)
├── favicon.ico          ← Fallback för äldre webbläsare
├── favicon-96x96.png    ← Fallback PNG
├── apple-touch-icon.png ← iOS (180x180px)
├── web-app-manifest-192x192.png
├── web-app-manifest-512x512.png
└── site.webmanifest     ← Manifest-fil
```

### Skapa favicons i Affinity Designer

#### favicon.svg
1. Skapa **32x32 px** dokument
2. Designa favicon
3. Exportera som **SVG**
4. Spara som `public/favicons/favicon.svg`

#### apple-touch-icon.png
1. Skapa **180x180 px** dokument
2. Designa ikonen (samma som favicon)
3. Exportera som **PNG** (Quality: 100%)
4. Spara som `public/favicons/apple-touch-icon.png`

#### favicon.ico (valfritt, för äldre webbläsare)
1. Använd [RealFaviconGenerator](https://realfavicongenerator.net/)
2. Ladda upp `favicon.svg`
3. Ladda ner genererade filer
4. Kopiera till `public/favicons/`

---

## ⚡ Prestanda-optimering

### Lazy Loading
**Alltid använd på bilder som inte är ovanför fold:**
```astro
<img 
  src={image.src} 
  alt="Beskrivning"
  loading="lazy"        ← Laddar bilden först när den syns
  decoding="async"       ← Dekodar asynkront
/>
```

### Width och Height
**Alltid ange width/height för att undvika layout shift:**
```astro
<img 
  src={image.src} 
  alt="Beskrivning"
  width="400"           ← Faktisk bredd i pixlar
  height="300"          ← Faktisk höjd i pixlar
  class="w-full h-auto" ← CSS för responsivitet
/>
```

### Responsiva bilder
**För större bilder, använd Astro Image:**
```astro
---
import { Image, Picture } from 'astro:assets';
import heroImage from '../../assets/images/hero.webp';
---

<Image 
  src={heroImage}
  alt="Hero"
  widths={[400, 800, 1200]}  ← Genererar flera storlekar
  sizes="(max-width: 768px) 100vw, 1200px"
  loading="eager"            ← För hero-bilder ovanför fold
/>
```

---

## 📊 Checklista för nya bilder

### Innan du lägger till en bild:

- [ ] **Rätt format?**
  - SVG för ikoner/illustrationer
  - WebP för fotografier
  - PNG endast om transparens behövs och SVG inte fungerar

- [ ] **Rätt dimensioner?**
  - Ikoner: 24x24px
  - Produktbilder: Max 1200px bredd
  - Profilbilder: 400x400px eller 800x800px
  - OG-bilder: 1200x630px

- [ ] **Rätt kvalitet?**
  - WebP: 85% (90% för medicinska bilder)
  - PNG: 100% (endast om nödvändigt)

- [ ] **Rätt plats?**
  - SVG-ikoner → `public/images/`
  - WebP/PNG/JPG → `src/assets/images/`
  - Favicons → `public/favicons/`

- [ ] **Rätt filstorlek?**
  - SVG-ikoner: < 5 KB
  - WebP-bilder: < 100 KB (helst < 50 KB)
  - Profilbilder: < 50 KB

- [ ] **Lazy loading?**
  - `loading="lazy"` på bilder under fold
  - `loading="eager"` på hero-bilder

- [ ] **Width/height?**
  - Alltid ange width och height-attribut

---

## 🛠️ Verktyg för bildoptimering

### Online-verktyg
- **[Squoosh.app](https://squoosh.app)** - Google's bildoptimering (WebP, PNG, JPG)
- **[TinyPNG](https://tinypng.com)** - PNG/JPG-komprimering
- **[SVGOMG](https://jakearchibald.github.io/svgomg/)** - SVG-optimering
- **[RealFaviconGenerator](https://realfavicongenerator.net/)** - Favicon-generator

### Desktop-verktyg
- **Affinity Photo** - För WebP-export (om stöd finns)
- **Affinity Designer** - För SVG-export
- **ImageOptim** (Mac) - Batch-optimering
- **FileOptimizer** (Windows) - Batch-optimering

---

## 📝 Exempel: Komplett arbetsflöde

### Scenario: Lägga till en ny produktbild (Descutan)

1. **Förbered i Affinity Photo:**
   - Öppna originalbilden
   - Beskär till 800x800px (eller max 1200px bredd)
   - Justera ljusstyrka/kontrast om nödvändigt

2. **Exportera:**
   - File → Export → WebP
   - Quality: 85%
   - Spara som `descutan-tvattsvamp.webp`

3. **Kontrollera:**
   - Filstorlek: < 100 KB? ✅
   - Om större: Minska kvalitet till 80% eller dimensionerna

4. **Lägg i rätt mapp:**
   - Spara i `src/assets/images/operation/descutan-tvattsvamp.webp`

5. **Använd i komponent:**
   ```astro
   ---
   import descutanImage from '../../assets/images/operation/descutan-tvattsvamp.webp';
   ---
   
   <img 
     src={descutanImage.src} 
     alt="Descutan tvättsvamp" 
     width="48"
     height="48"
     loading="lazy"
     decoding="async"
     class="w-12 h-12 rounded"
   />
   ```

### Scenario: Skapa ny operation-ikon

1. **Skapa i Affinity Designer:**
   - Nytt dokument: 24x24px
   - Designa ikonen med vektorer

2. **Exportera:**
   - File → Export → SVG
   - Rasterize: Av
   - Spara som `medicine.svg`

3. **Kontrollera:**
   - Filstorlek: < 5 KB? ✅
   - Öppna i texteditor och ta bort onödiga metadata

4. **Lägg i rätt mapp:**
   - Spara i `public/images/operation/medicine.svg`

5. **Använd i komponent:**
   ```astro
   <img 
     src="/images/operation/medicine.svg" 
     alt="Medicin" 
     class="w-10 h-10" 
   />
   ```

---

## 🎯 Mål för prestanda

### Filstorlekar (mål)
- **SVG-ikoner:** < 5 KB (ofta < 2 KB)
- **WebP-bilder:** < 100 KB (helst < 50 KB)
- **Profilbilder:** < 50 KB
- **Medicinska bilder:** < 200 KB (helst < 150 KB)

### Laddtider (mål)
- **Initial load:** < 2 sekunder
- **Time to Interactive:** < 3 sekunder
- **Largest Contentful Paint (LCP):** < 2.5 sekunder

### Pingdom-resultat (mål)
- **Performance grade:** 95-100
- **Page size:** < 500 KB
- **Load time:** < 200 ms
- **Compress components:** A 100

---

## ❓ Vanliga frågor

### Varför WebP istället för JPG?
WebP är 25-35% mindre än JPG med samma kvalitet. Alla moderna webbläsare stödjer det.

### Varför SVG för ikoner?
SVG är vektorbaserat, så det skalas perfekt till vilken storlek som helst. Filstorleken är ofta mycket mindre än PNG.

### Kan jag använda PNG istället för WebP?
Ja, men WebP är alltid bättre. Använd PNG endast om du behöver transparens och SVG inte fungerar.

### Hur vet jag om en bild är för stor?
Kontrollera filstorleken i Windows Explorer. Om den är större än rekommenderade gränser, optimera den.

### Behöver jag optimera bilder som redan är på sidan?
Ja, om de är större än rekommenderade gränser. Använd Squoosh.app eller liknande för att optimera.

---

## 📚 Ytterligare resurser

- [Astro Image Optimization](https://docs.astro.build/en/guides/images/)
- [Web.dev - Image Optimization](https://web.dev/fast/#optimize-your-images)
- [Squoosh.app](https://squoosh.app) - Bildoptimering
- [SVGOMG](https://jakearchibald.github.io/svgomg/) - SVG-optimering

---

*Senast uppdaterad: 3 januari 2026*

