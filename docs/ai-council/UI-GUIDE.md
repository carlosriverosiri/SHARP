# AI Council - UI & Arbetsflöde

> Snabbguide för gränssnittet och hur du använder verktyget steg för steg.

---

## Layout-översikt

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AI COUNCIL                                          │
├──────────────────┬──────────────────────────────────────────┬───────────────────┤
│                  │                                          │                   │
│  PROJEKT-        │           HUVUDOMRÅDE                    │    HISTORIK-      │
│  SIDEBAR         │                                          │    SIDEBAR        │
│                  │  ┌────────────────────────────────────┐  │                   │
│  📁 Projekt 1    │  │  Kontext                           │  │  📝 Session 1    │
│  📁 Projekt 2    │  │  [textfält]                        │  │  📝 Session 2    │
│  📁 Projekt 3    │  │                                    │  │  📝 Session 3    │
│                  │  │  Prompt                            │  │                   │
│  ─────────────   │  │  [textfält]                        │  │  ☁️ Synkad       │
│  📂 Historik     │  │                                    │  │                   │
│                  │  └────────────────────────────────────┘  │                   │
│                  │                                          │                   │
│                  │  [Profil] [Modeller] [⚡ Kör]           │                   │
│                  │                                          │                   │
│                  │  ┌─────────────────────────────────────┐ │                   │
│                  │  │  RESULTAT                           │ │                   │
│                  │  │  - Syntes                           │ │                   │
│                  │  │  - Individuella svar (accordion)    │ │                   │
│                  │  └─────────────────────────────────────┘ │                   │
│                  │                                          │                   │
└──────────────────┴──────────────────────────────────────────┴───────────────────┘
```

---

## Profiler (inställningar)

Välj profil baserat på din uppgift:

| Profil | Ikon | Modeller | Syntes | Beskrivning |
|--------|------|----------|--------|-------------|
| **Snabb** | ⚡ (blixt) | Gemini, Claude | Gemini | Snabbt svar för enkla frågor |
| **Patient** | 📈 (puls) | Gemini, Claude | Claude | Medicinska/patientfrågor |
| **Kodning** | `</>` (kod) | Gemini, Claude, OpenAI | Claude | Programmeringsfrågor |
| **Forskning** | 🧪 (provrör) | Gemini, Claude, Grok | Claude Opus | Vetenskapliga frågor |
| **Strategi** | 📊 (diagram) | Alla 4 | Claude Opus | Komplexa beslut |

> **OBS:** Alla ikoner är SVG-baserade för konsekvent design.

---

## Arbetsflöde: Steg för steg

### 1. Grundläggande körning

```
[Skriv prompt] → [Välj profil] → [⚡ Kör AI Council]
                                         ↓
                              ┌──────────────────┐
                              │  Runda 1         │
                              │  AI:er svarar    │
                              └────────┬─────────┘
                                       ↓
                              ┌──────────────────┐
                              │  Syntes          │
                              │  Sammanfattning  │
                              └──────────────────┘
```

### 2. Sekventiell körning (stabilt läge)

Om du vill köra modellerna en åt gången:

```
┌─────────────────────────────────────────────────────────┐
│  ⏱ Kör modeller sekventiellt                            │
│                                                         │
│  [▶ Kör alla i sekvens]  [🔔 Ljud]                      │
│                                                         │
│  [● Gemini] [● Claude] [● Grok] [● OpenAI]              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

> Alla ikoner är rena SVG-ikoner för konsekvent design.

- Klicka på individuella modellknappar för att köra en i taget
- Eller "Kör alla i sekvens" för att köra valda modeller automatiskt
- Ljud spelas när varje modell är klar

### 3. Efter första körningen: Nästa steg

```
┌─────────────────────────────────────────────────────────┐
│  VÄLJ NÄSTA STEG                                        │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ + (plus)    │  │ 🔍 (sök)    │  │ 💡 (lampa)  │     │
│  │ Lägg till   │  │ Fakta-      │  │ Syntes      │     │
│  │ modeller    │  │ granskning  │  │             │     │
│  │ (blå)       │  │ (lila)      │  │ (ljusblå)   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

| Kort | Färg | Funktion |
|------|------|----------|
| **Lägg till modeller** | Blå | Kör fler AI:er med samma prompt (utan att köra om befintliga) |
| **Faktagranskning** | Lila | Runda 2: Modellerna granskar varandras svar |
| **Syntes** | Ljusblå | Kör syntes på alla insamlade svar |
| **Supersyntes** | Gul/amber | Syntes efter faktagranskning (högre kvalitet) |

### 4. Iterativt arbetsflöde (nytt i v3.6)

```
┌──────────────────────────────────────────────────────────────┐
│  ITERATIVT FÖRFINA SVARSUNDERLAGET                           │
│                                                              │
│  1. Kör Gemini + Claude                                      │
│     ↓                                                        │
│  2. Få syntes baserad på 2 svar                              │
│     ↓                                                        │
│  3. "Hmm, jag vill se vad Grok tycker också..."              │
│     → Klicka [➕ Lägg till modeller]                         │
│     ↓                                                        │
│  4. Kör endast Grok (återanvänder prompt)                    │
│     ↓                                                        │
│  5. [🔄 Uppdatera syntes] visas med "3 svar, 1 nytt"        │
│     ↓                                                        │
│  6. Ny syntes med alla 3 svar!                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Synteskortet

När syntesen är klar visas:

```
┌─────────────────────────────────────────────────────────────────┐
│  💡  Syntes                                                     │
│      Claude Sonnet · ●●● Gemini, Claude, Grok · ⚡ Snabb       │
│                      ↑                          ↑               │
│                 Modeller som                Profil som          │
│                 ingår (med färgade prickar)  användes           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 KONSENSUSANALYS                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                    │
│  Överensstämmelse: HÖG - 3/4 modeller överens                  │
│                                                                 │
│  ✅ Alla modeller överens om:                                   │
│  • [punkt 1]                                                    │
│  • [punkt 2]                                                    │
│                                                                 │
│  ⚠️ Konflikter/skillnader:                                      │
│  • [vad de är oeniga om]                                        │
│                                                                 │
│  💡 Unika insikter (endast en modell):                          │
│  • [modell]: [insikt] ← Verifiera denna!                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                    │
│                                                                 │
│  [Resten av syntesen...]                                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [📋 Kopiera] [📥 Export .md] [🔖 Spara] [→ KB]  12.3s · $0.02 │
└─────────────────────────────────────────────────────────────────┘
```

> **Supersyntes** (efter faktagranskning) visas med ⭐-ikon och gul färg, och inkluderar även lösta/olösta konflikter samt förkastade påståenden.

### Konsensusanalys (NY i v3.7)

Varje syntes börjar nu med en konsensusanalys som visar:
- **Överensstämmelse** (HÖG/MEDEL/LÅG)
- **Vad alla är överens om** - säkra påståenden
- **Konflikter** - var modellerna skiljer sig
- **Unika insikter** - flaggas med "Verifiera!" (hög hallucinationsrisk)

**Modell-prickar:**
- 🟢 Gemini (grön)
- 🟠 Claude (orange)  
- 🔵 Grok (blå)
- ⚫ OpenAI (grå)

---

## Individuella svar (accordion)

Klicka på rubriken för att expandera/kollapsa:

```
┌─────────────────────────────────────────────────────────────────┐
│  ▼ Gemini 2.0 Flash                           ✓ 3.2s          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Geminis svar visas här när expanderad...]                    │
│                                                                 │
│  [📋 Kopiera] [🔄 Kör igen]                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ► Claude Sonnet                              ✓ 8.7s          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Färgspråk

Konsekvent färgkodning genom hela gränssnittet:

| Element | Färg | Hex |
|---------|------|-----|
| **Syntes** | Ljusblå | `#EFF6FF` → `#DBEAFE` |
| **Supersyntes** | Gul/Amber | `#FFFBEB` → `#FEF3C7` |
| **Faktagranskning** | Lila | `#7c3aed` |
| **Lägg till modeller** | Blå | `#3b82f6` |

### Historik-kort
Sessioner i historiken har färgad bakgrund och vänsterkant baserat på typ:
- **Supersyntes:** Gul gradient + gul kant + ⭐
- **Syntes:** Blå gradient + blå kant + 💡
- **Svar:** Grå gradient + grå kant

---

## Session-hantering

### Spara session
Efter varje körning visas en popup för att spara med valfritt namn.

### Historik-sidebar (höger)
- Visar sparade sessioner
- Klicka för att ladda tillbaka
- ☁️ = Synkad med Supabase
- 💾 = Endast lokal lagring

### Cross-device sync
- Pågående arbete (draft) sparas automatiskt
- Synkas mellan datorer via Supabase
- 7 dagars retention
- Fortsätt där du var även om du byter dator

---

## Snabbtangenter

| Tangent | Funktion |
|---------|----------|
| `Ctrl+Enter` | Kör AI Council |
| `Ctrl+V` | Klistra in bild |
| `Escape` | Stäng modal/popup |

---

## Statusindikationer

| Indikator | Betydelse |
|-----------|-----------|
| ⏳ Kör... | Modellen arbetar |
| ✓ 3.2s | Klar, tog 3.2 sekunder |
| ❌ Fel | Något gick fel |
| 🔴/🟠/🟡 | Misstänkt faktafel (hög/medel/låg) |

---

## Tips

1. **Börja snabbt** - Använd "Snabb" profilen för enkla frågor
2. **Bygg iterativt** - Starta med 2 modeller, lägg till fler vid behov
3. **Sekventiellt för stabilitet** - Kör en modell i taget om parallella körningar timeout:ar
4. **Spara viktiga svar** - Använd Spara-knappen för att bevara bra sessioner
5. **Exportera för dokumentation** - Export .md skapar en komplett rapport
