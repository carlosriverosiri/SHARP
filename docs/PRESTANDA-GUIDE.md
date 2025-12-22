# 🚀 Prestanda-guide för nya sidor

## Automatiskt inkluderat (ingen åtgärd krävs)

Följande är redan inbyggt i sajten och gäller automatiskt för alla nya sidor:

- ✅ **Cache-headers** (netlify.toml)
- ✅ **Preconnect** för externa resurser (BaseLayout.astro)
- ✅ **Lazy-load karta** i footern (FooterMap.astro)
- ✅ **Lokala SVG-ikoner** i header (Header.astro)
- ✅ **Optimerad författarbild** (WebP, 5 KB)

---

## Checklista för nya SJUKDOMSSIDOR

### 1. Bilder - ALLTID WebP-format

```bash
# Kör detta script för att optimera nya bilder
node scripts/optimize-images.cjs <mapp>

# Exempel:
node scripts/optimize-images.cjs src/assets/images/ny-diagnos/
```

### 2. Bildstorlekar - Rekommendationer

| Bildtyp | Max bredd | Format | Max storlek |
|---------|-----------|--------|-------------|
| Hero/header | 1200px | WebP | 100 KB |
| Illustrationer | 800px | WebP/SVG | 50 KB |
| Ikoner | 64px | SVG | 5 KB |
| Röntgen/MR | 1200px | WebP | 80 KB |

### 3. Lazy-loading för bilder nedanför "above the fold"

```astro
<!-- För bilder som INTE syns direkt vid sidladdning -->
<Image 
  src={minBild} 
  alt="Beskrivning" 
  loading="lazy"
  decoding="async"
/>
```

### 4. Använd Astro Image-komponenten

```astro
---
import { Image } from 'astro:assets';
import minBild from '../assets/images/diagnos/bild.webp';
---

<Image 
  src={minBild} 
  alt="Beskrivande text" 
  width={800}
  quality={85}
/>
```

---

## Checklista för nya Q&A-SIDOR

Q&A-sidor är redan optimerade via Content Collections. Följ bara:

1. ✅ Använd markdown-formatet i `src/content/fraga-doktorn/`
2. ✅ Inga externa bilder i svaren
3. ✅ Länka till diagnossidor med relativa URLs

---

## Snabbtest av prestanda

1. Bygg sajten lokalt:
   ```bash
   npm run build
   ```

2. Kolla byggstorlek:
   ```bash
   # Se storleken på dist-mappen
   dir dist /s
   ```

3. Testa på Pingdom:
   - https://tools.pingdom.com
   - Mål: **A-betyg (90+)**
   - Mål: **Sidstorlek < 100 KB** (utan stora bilder)

---

## Vanliga misstag att undvika

❌ **PNG-bilder** → Använd WebP istället  
❌ **Bilder > 200 KB** → Optimera med scriptet  
❌ **Externa bildlänkar** → Ladda upp lokalt  
❌ **Stora hero-bilder** → Max 1200px bredd  
❌ **GIF-animationer** → Använd video eller CSS  

---

## Script för bildoptimering

### Optimera enstaka bild:
```bash
node scripts/optimize-image.cjs
```

### Optimera hel mapp:
```bash
node scripts/optimize-images.cjs <sökväg>
```

---

## Målvärden

| Sida | Storlek | Laddtid | Requests |
|------|---------|---------|----------|
| Q&A-sida | < 50 KB | < 300 ms | < 15 |
| Diagnossida | < 100 KB | < 600 ms | < 20 |
| Startsida | < 150 KB | < 800 ms | < 25 |








