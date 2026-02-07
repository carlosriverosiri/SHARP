# Kunskapsbas

> Organisera din forskning i projekt med AI-stöd

**Senast uppdaterad:** 2026-02-07 (v1.0)

---

## Översikt

Kunskapsbasen är ett verktyg för att samla, organisera och analysera forskningsmaterial. Den fungerar som en "första station" där du samlar dokument innan du använder AI Council för analys.

**URL:** `/admin/kunskapsbas`

**Krav:** Inloggad användare (personal eller admin)

---

## Funktioner

### Dashboard med projektkort

Projekten visas som visuella kort i ett rutnät, liknande personalportalens design:

- **Färgade ikoner** - Varje projekt får en unik färg (blå, lila, grön, orange, rosa, teal)
- **Beskrivning** - Kort sammanfattning av projektets syfte
- **Kategori-taggar** - Snabbåtkomst till olika dokumenttyper
- **Dokumenträknare** - Visar antal dokument per projekt
- **"Fråga AI"-länk** - Direkt koppling till AI Council

### Drag-and-drop sortering

Sortera dina projekt manuellt genom att dra och släppa:

1. Håll in musknappen på ett projektkort
2. Dra till önskad position
3. Släpp - ordningen sparas automatiskt

### Mikrofon-diktering

Skapa projekt snabbare med röstinmatning:

**Projektnamn:**
- Klicka på mikrofon-ikonen
- Diktera namnet
- Klicka igen för att stoppa

**Beskrivning med AI-sammanfattning:**
- Klicka på mikrofon-ikonen vid beskrivningsfältet
- Prata fritt om ditt projekt
- Klicka för att stoppa
- AI sammanfattar automatiskt till en kort beskrivning (~15 ord)

---

## Kategorier

Varje projekt har sex fördefinierade kategorier:

| Kategori | Beskrivning | Användning |
|----------|-------------|------------|
| **Dokument** | Anteckningar, sammanfattningar | Egna texter och noteringar |
| **Litteratur** | Zotero, referenser, PDF:er | Vetenskapliga artiklar |
| **Ljud** | Transkriberade inspelningar | Föreläsningar, möten |
| **AI-sessioner** | Sparade AI Council-samtal | Analysresultat |
| **Prompter** | Återanvändbara prompter | Mallar för AI-frågor |
| **Rådata** | Övrigt material | Bilder, filer, etc. |

---

## Integration med AI Council

### Spara sessioner till Kunskapsbasen

Från AI Council kan du spara sessioner direkt till ett projekt:

1. Kör en fråga i AI Council
2. Klicka på mapp-ikonen i historiken
3. Välj projekt att spara till
4. Sessionen sparas med prompt och svar

### Öppna AI Council från projekt

Varje projektkort har en "Fråga AI"-länk som öppnar AI Council med projektet förvalt.

---

## API-endpoints

### Projekt

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/kunskapsbas/projects` | Hämta alla projekt med kategoriräknare |
| POST | `/api/kunskapsbas/projects` | Skapa nytt projekt |
| PUT | `/api/kunskapsbas/projects` | Uppdatera projekt (t.ex. sort_order) |
| DELETE | `/api/kunskapsbas/projects` | Radera projekt |

### Dokument

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/kunskapsbas/items` | Hämta dokument (med filter) |
| POST | `/api/kunskapsbas/items` | Skapa nytt dokument |
| PUT | `/api/kunskapsbas/items` | Uppdatera dokument |
| DELETE | `/api/kunskapsbas/items` | Radera dokument |

---

## Framtida utveckling

### Planerat

- [ ] **PDF-visare** - Visa PDF:er direkt i gränssnittet
- [ ] **Zotero-snabbimport** - Importera referenser direkt till projekt
- [ ] **Dokumenttaggar** - Egna taggar utöver kategorier
- [ ] **Sökfunktion** - Sök över alla projekt och dokument
- [ ] **Delning** - Dela projekt med kollegor
- [ ] **Export** - Exportera projekt som ZIP

### Vision

- [ ] **Embeddings/RAG** - Sök semantiskt i alla dokument
- [ ] **Auto-kategorisering** - AI sorterar nya dokument automatiskt
- [ ] **Koppling till AI Council** - Använd projekt som kontext automatiskt

---

## Changelog

### v1.0 (2026-02-07)
- Dashboard med kortlayout
- Drag-and-drop sortering
- Mikrofon-diktering med AI-sammanfattning
- Integration med AI Council (spara sessioner)
- Sex fördefinierade kategorier
