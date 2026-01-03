# Operationssidor - Dokumentation

Guide för att skapa och redigera operationssidor på webbplatsen.

## Översikt

Operationssidorna använder ett **modulärt system** med återanvändbara komponenter. Detta innebär att gemensamma avsnitt (som förberedelser, bandage, sjukskrivning) skrivs en gång och återanvänds på alla operationssidor.

## Mappstruktur

```
src/
├── layouts/
│   └── OperationLayout.astro          # Huvudlayout för alla operationer
│
├── components/operation/              # Återanvändbara block
│   ├── OpForberedelser.astro          # Fasta, rökstopp, mediciner, Descutan
│   ├── OpOperationsdagen.astro        # Vårdprocess, bedövning, kaféer
│   ├── OpBandage.astro                # Bandageinfo
│   ├── OpSmarta.astro                 # Smärtstillande (Alvedon/Ipren/Citodon)
│   ├── OpSjukskrivning.astro          # Sjukskrivningstabell
│   ├── OpBilkorning.astro             # Bilkörningsregler
│   ├── OpSjukgymnastik.astro          # Fysioterapi
│   ├── OpAxellas.astro                # Axellås/ortos (valfri)
│   ├── OpAterbesok.astro              # Återbesöksinfo
│   └── index.ts                       # Export + lista över saknade ikoner
│
├── components/
│   └── MedicinskGranskad.astro        # "Medicinskt granskad"-blocket
│
└── pages/operation/
    ├── index.astro                    # Översiktssida /operation/
    └── axel/
        └── lateral-klavikelresektion.astro  # Exempeloperation
```

## Ikoner

Ikoner finns i `public/images/operation/`. Alla är SVG 24x24 px.

### Befintliga ikoner:
| Fil | Användning |
|-----|------------|
| `fasta-6-timmar-24x24.svg` | Förberedelser (fasta) |
| `ingen-mat-24x24.svg` | Förberedelser (fasta) |
| `ingen_rokning-24x24.svg` | Förberedelser (rökstopp) |
| `tablett-24x24.svg` | Mediciner, Smärtstillande |
| `surgeon-24x24.svg` | Operationsdagen |
| `injektion-24x24.svg` | Bedövning |
| `plaster-24x24.svg` | Bandage (placeholder) |
| `sutur-24x24.svg` | Stygn |
| `forsakringskassan-24-24.svg` | Sjukskrivning |
| `bil-24x24.svg` | Bilkörning |
| `sjukgymnastik-24x24.svg` | Fysioterapi |

### Saknade ikoner (markerade med TODO i koden):
- `descutan.svg` - Tvättsvamp
- `klocka.svg` - Vårdprocesstid
- `bandage.svg` - Förband (egen ikon)
- `axellas.svg` - Axellås/ortos
- `aterbesok.svg` - Återbesök/kalender

---

## Var redigerar jag vad?

### 🔧 Förberedelser (fasta, rökstopp, Descutan)

**Fil:** `src/components/operation/OpForberedelser.astro`

**Parametrar som kan skickas från operationssidan:**
```astro
<OpForberedelser 
  fastaTimmar={6}           // Antal timmar fasta (default: 6)
  visaDescutan={true}       // Visa Descutan-info (default: true)
  visaRokstopp={true}       // Visa rökstoppsinfo (default: true)
  extraInfo="Egen text..."  // Lägg till extra information
/>
```

**Redigera standardtext:** Öppna `OpForberedelser.astro` och ändra i HTML-texten.

---

### 🏥 Operationsdagen (vårdprocess, bedövning)

**Fil:** `src/components/operation/OpOperationsdagen.astro`

**Parametrar:**
```astro
<OpOperationsdagen 
  vardprocessTid="2-4 timmar"     // Total tid på kliniken
  operationsTid="5-30 minuter"    // Själva operationen
  bedovningstyp="kombinerad"      // 'narkos', 'lokalbedovning', 'kombinerad'
  visaLokalbedovning={true}       // Visa fördelarna med lokalbedövning
/>
```

**Kaféer i närheten:** Redigeras direkt i `OpOperationsdagen.astro` (rad ~85-95).

---

### 🩹 Bandage

**Fil:** `src/components/operation/OpBandage.astro`

**Parametrar:**
```astro
<OpBandage 
  stygnBorttagning="7-10 dagar"  // När stygnen tas bort
  visaStygn={true}               // Visa stygn-info
/>
```

---

### 💊 Smärtstillande

**Fil:** `src/components/operation/OpSmarta.astro`

**Parametrar:**
```astro
<OpSmarta 
  visaAlvedon={true}   // Visa Alvedon-info
  visaIpren={true}     // Visa Ipren-info
  visaCitodon={true}   // Visa Citodon-info
/>
```

**Dosering och varningar:** Redigeras direkt i `OpSmarta.astro`.

---

### 📋 Sjukskrivning

**Fil:** `src/components/operation/OpSjukskrivning.astro`

**Parametrar:**
```astro
<OpSjukskrivning 
  heltid="1 vecka"                    // Heltidssjukskrivning
  deltid="1-2 veckor"                 // Deltidssjukskrivning (valfritt)
  tungtArbete="6 veckor"              // Tungt arbete (valfritt)
  kommentar="Kontorsarbete tidigare"  // Extra kommentar (valfritt)
/>
```

---

### 🚗 Bilkörning

**Fil:** `src/components/operation/OpBilkorning.astro`

**Parametrar:**
```astro
<OpBilkorning 
  timmarEfterNarkos={24}  // Timmar efter narkos (default: 24)
  harAxellas={false}      // Har patienten axellås? (visar varning)
/>
```

---

### 🏋️ Sjukgymnastik

**Fil:** `src/components/operation/OpSjukgymnastik.astro`

**Parametrar:**
```astro
<OpSjukgymnastik 
  startEfter="1 vecka"          // När rehab börjar
  antalGanger="1-2 gånger/vecka" // Frekvens (valfritt)
  langd="3-4 månader"           // Total tid (valfritt)
/>
```

---

### 🦺 Axellås (valfri - visas bara om typ !== 'ingen')

**Fil:** `src/components/operation/OpAxellas.astro`

**Parametrar:**
```astro
<OpAxellas 
  typ="standard"        // 'standard', 'bakre-instabilitet', 'ingen'
  antalVeckor={4}       // Antal veckor med axellås
  visaBild={true}       // Visa bild på axellås
/>
```

---

### 📅 Återbesök

**Fil:** `src/components/operation/OpAterbesok.astro`

**Parametrar:**
```astro
<OpAterbesok 
  typ="standard"       // 'standard', 'sutur', 'frozen-shoulder'
  efterManader={3}     // Månader till återbesök (för 'sutur'-typ)
/>
```

---

## Skapa en ny operationssida

### Steg 1: Skapa filen

Skapa en ny `.astro`-fil under `src/pages/operation/axel/` (eller `kna/`, `armbage/`).

**Exempel:** `src/pages/operation/axel/akromioplastik.astro`

### Steg 2: Grundstruktur

```astro
---
import OperationLayout from "../../../layouts/OperationLayout.astro";
import OpForberedelser from "../../../components/operation/OpForberedelser.astro";
import OpOperationsdagen from "../../../components/operation/OpOperationsdagen.astro";
import OpBandage from "../../../components/operation/OpBandage.astro";
import OpSmarta from "../../../components/operation/OpSmarta.astro";
import OpSjukskrivning from "../../../components/operation/OpSjukskrivning.astro";
import OpBilkorning from "../../../components/operation/OpBilkorning.astro";
import OpSjukgymnastik from "../../../components/operation/OpSjukgymnastik.astro";
import OpAterbesok from "../../../components/operation/OpAterbesok.astro";

const title = "Operation av impingement";
const description = "Akromioplastik - artroskopisk operation vid inklämd sena.";

// SENAST MEDICINSKT GRANSKAD
const granskadDatum = "3 januari 2026";
---

<OperationLayout 
  title={title} 
  description={description} 
  operationsTyp="Axeloperation"
  granskadDatum={granskadDatum}
>
  
  <!-- Operationsspecifik information (unik för denna operation) -->
  <section class="mb-12">
    <div class="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-8 border border-sky-100">
      <h2 class="text-2xl font-bold text-[#024264] mb-4">Om operationen</h2>
      <p class="text-slate-700">
        Beskriv operationen här...
      </p>
    </div>
  </section>

  <!-- Gemensamma komponenter -->
  <OpForberedelser />
  <OpOperationsdagen operationsTid="15-30 minuter" />
  <OpBandage stygnBorttagning="7-10 dagar" />
  <OpSmarta />
  <OpSjukskrivning heltid="1 vecka" deltid="1-2 veckor" />
  <OpBilkorning />
  <OpSjukgymnastik startEfter="1 vecka" />
  <OpAterbesok typ="standard" />

</OperationLayout>
```

### Steg 3: Lägg till i menyn

Redigera `src/components/Header.astro`:

1. **Desktop-menyn (~rad 257):** Lägg till länk i `group-hover/axel-op:flex`
2. **Mobilmenyn (~rad 660):** Lägg till länk i `menu-operation-axel`

### Steg 4: Lägg till på översiktssidan

Redigera `src/pages/operation/index.astro` och lägg till en länk under "Axeloperationer".

---

## Layout: OperationLayout.astro

**Fil:** `src/layouts/OperationLayout.astro`

Layouten hanterar:
- Hero-sektion med titel och beskrivning
- "Medicinskt granskad"-block
- **Innehållsförteckning i sidebar** (höger, desktop) / mobil (ovanför innehåll)
- Grid-layout: 9 kolumner innehåll + 3 kolumner sidebar
- Print-knapp
- Print-stilar

**Layout-struktur:**
- Desktop: Huvudinnehåll (9 kolumner) + Sidebar med innehållsförteckning (3 kolumner)
- Mobil: Innehållsförteckning ovanför innehållet (accordion)

**Parametrar:**
```astro
<OperationLayout 
  title="Operationsnamn"
  description="Kort beskrivning"
  operationsTyp="Axeloperation"      // Visas i breadcrumb
  granskadDatum="3 januari 2026"     // Datum för granskning
  tableOfContents={[             // Anpassa innehållsförteckning (valfritt)
    { id: "forberedelser", title: "Förberedelser", icon: "1" },
    { id: "operationsdagen", title: "Operationsdagen", icon: "2" },
    // ...
  ]}
>
```

**Standard innehållsförteckning:**
Om du inte skickar `tableOfContents` används standard:
- Förberedelser
- Operationsdagen
- Eftervård
- Sjukskrivning
- Återbesök

---

## Tips

### Ändra text som gäller ALLA operationer
Redigera direkt i komponentfilen (t.ex. `OpForberedelser.astro`). Ändringen slår igenom på alla operationssidor.

### Ändra text för EN specifik operation
Lägg till operationsspecifikt innehåll **före** eller **efter** komponenterna i operationssidans fil.

### Lägg till en helt ny sektion
1. Skapa ny komponent: `src/components/operation/OpNySektion.astro`
2. Exportera i `index.ts`
3. Importera och använd i operationssidan

### Dölja en sektion för en specifik operation
Importera inte komponenten, eller skicka parametrar som döljer den (t.ex. `visaDescutan={false}`).

---

## SEO & Sociala Medier

Operationssidorna är optimerade för:

### Google Search
- **JSON-LD Schema:** MedicalProcedure, MedicalWebPage, BreadcrumbList, FAQPage
- **Meta-taggar:** description, keywords, robots, author
- **Strukturerad data:** Operationstid, kroppsdel, utförare, klinik

### AI Search (ChatGPT, Perplexity, etc.)
- **llms.txt:** Uppdaterad med operationsinformation (`public/llms.txt`)
- **Meta-taggar:** `ai-content-type`, `ai-summary`
- **Strukturerad data:** Hjälper AI förstå innehållet

### Facebook & Twitter
- **Open Graph:** `og:type="article"`, bild 1200x630
- **Twitter Cards:** `summary_large_image`
- **Article-taggar:** published_time, author, section

### Parametrar för SEO

```astro
<OperationLayout 
  title="Operation av AC-ledsartros"
  description="Kort, sökbar beskrivning (150-160 tecken)"
  operationsTyp="Axeloperation"
  kroppsdel="axel"                              // För schema
  granskadDatum="3 januari 2026"               // Visas på sidan
  granskadDatumISO="2026-01-03"                // För schema
  operationsTid="5-30 minuter"                 // För schema
  ogImage="/images/og/ac-ledsartros.jpg"       // 1200x630 px
  keywords={["ac-ledsartros", "operation"]}    // SEO-nyckelord
  faq={[                                       // FAQ-schema för Google
    { question: "Fråga?", answer: "Svar." }
  ]}
>
```

### FAQ-schema

Lägg till FAQ för att få "People also ask"-rutor i Google:

```javascript
const faq = [
  {
    question: "Hur lång är operationen?",
    answer: "Operationen tar vanligen 5-30 minuter."
  },
  {
    question: "Hur länge är man sjukskriven?",
    answer: "Normalt 1 vecka heltid, sedan 1-2 veckor deltid."
  }
];
```

---

### Relaterat innehåll

**Fil:** `src/components/operation/OpRelateratInnehall.astro`

Lägg till länkar till sjukdomssidan, rehab och Fråga doktorn för bättre användarupplevelse och SEO.

**Parametrar:**
```astro
<OpRelateratInnehall 
  sjukdomUrl="/sjukdomar/axel/ac-ledsartros"
  sjukdomNamn="AC-ledsartros"
  sjukdomBeskrivning="Symtom, diagnos, behandlingsalternativ..."
  rehabUrl="/rehab/axel/..."              // Valfritt
  rehabNamn="Rehabprogram"                // Valfritt
  fragaDoktornUrl="/fraga-doktorn/axel/"
  fragaDoktornNamn="Fråga doktorn om axel"
/>
```

**Varför lägga till detta?**
- ✅ Användare som hittar operationssidan via sökning kan läsa mer om sjukdomen
- ✅ Förbättrar SEO genom interna länkar
- ✅ Minskar bounce rate
- ✅ Matchar sökmönster: "diagnos + operation"

---

## Exempel: Fullständig operationssida

Se `src/pages/operation/axel/lateral-klavikelresektion.astro` för ett komplett exempel med SEO.

