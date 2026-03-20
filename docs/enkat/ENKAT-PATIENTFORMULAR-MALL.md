# Patientenkät: referensmall för publikt frågeformulär (mobil + återanvändning)

> Dokumentet beskriver **hur den publika patientenkäten ser ut och beter sig** i den nuvarande versionen som anses färdigställande för **Patientupplevelse**-flödet.  
> Använd det som **genomgång vid demo/utbildning** och som **mall** när nya frågeformulär (andra teman eller frågor) ska byggas med samma UX-principer.

**Källkod:** `src/pages/e/[kod].astro`  
**Relaterat innehåll:** `ENKAT-PATIENTUPPLEVELSE.md`, `ENKAT-UI-SPEC.md`

---

## 1. Syfte med mallen

- Ge en **konsekvent beskrivning** av layout, färger och texter på **mobil** (primär användning via SMS-länk).
- Möjliggöra **återanvändning**: nya formulär kan kopiera samma struktur (tvådelad hero, skala, fritext, knapp) och bara byta innehåll/API.
- Undvika att designen “drar iväg” — denna version är avsiktligt **sparsam och tydlig**.

---

## 2. Översikt: vad patienten ser (i ordning)

1. **Header i två lager (hero)**  
2. **Kontexttext** om besöket (läkare + datum utan år, ingen besökstyp)  
3. **Skalförklaring** (1–5)  
4. **Fyra strukturerade frågor** med 1–5-knappar + skalförklaring under varje fråga  
5. **Två fritextfält** med grå placeholder om känsliga uppgifter  
6. **Skicka-knapp**  
7. Efter svar: **tacksida** (ersätter formuläret)

Ogiltig länk / redan svarat / utgången länk visas som **enkla tillståndssidor** utan formulär (samma kort/container).

---

## 3. Mobil (`≤ 640px`) — genomgång

### 3.1 Hela vyn

- **Ingen yttre “kort-padding”** runt innehållet: `body` har `padding: 0`, så formuläret upplevs **kant-i-kant** mot skärmen (ingen “flytande ruta” med extra marginal).
- **`.container`** fyller bredden, **ingen rundning** och **ingen skugga** på mobil — känns mer som en fullbredds-sida än ett inbäddat kort.
- **Minimihöjd** på containern: så nära helskärm som möjligt för en enhetlig känsla.

### 3.2 Hero — övre del (`.hero-top`)

- **Full bredd**, **ljus sky-blå bakgrund** `#e0f2fe` (Tailwind **sky-100**), i samma **sky**-skala som den nedre blå headern.
- **Logga** centrerad: `/images/branding/logo.svg`  
  - Bredd på mobil: **ca 230px** (max 100% av bredden).
- Syfte: **god kontrast** mot loggans blå/grå utan att behöva en “knapp” runt loggan.

### 3.3 Hero — nedre del (`.hero-bottom`)

- **Full bredd**, **mörkare sky-blå** `#0369a1` (Tailwind **sky-700**).
- **Rubrik:** “Patientupplevelse” (något mindre på mobil än desktop).
- **Brödtext:** anonymitet + att inte skriva personnummer, diagnoser eller känsliga personuppgifter i fritextfälten.  
  - Vänt vit text, god radhöjd.

### 3.4 Innehållsblock under hero (`.content`)

- **Vit bakgrund**, padding **24px** (på mobil justeras **vänster/höger** till **16px** för hero + content + state-box för jämn kolumn).
- **Kontextförklaring** (text, inte tabell): beskriver mottagningsbesök hos aktuell vårdgivare och datum **utan år** (t.ex. “15 mars”), och tackar om patientundersökningen.
- **Besökstyp** visas **inte** i denna version (mindre brus när SMS går ut nära besöket).

### 3.5 Skala och frågor

- **Informationsruta** för skala: **1–5**, “Instämmer inte alls” → “Instämmer helt”.
- **Fyra frågor**, alla med **fem stora klickytor** (radio dold, etikett som knapp).
- Under varje fråga: **mindre grå hjälptext** med skalans ändpunkter.
- **Vald knapp:** sky-blå `#0284c7` (sky-600), vit text.

### 3.6 Fritext

- Två fält: “Vad var bra?” och “Vad hade kunnat vara bättre?”
- **Placeholder (grå):** `Skriv inte känsliga uppgifter här.`  
  (ingen “valfritt” i placeholder — det framgår av att fältet är frivilligt).

### 3.7 Primär knapp

- Full bredd, **sky-600** (`#0284c7`), rundade hörn, tydlig typografi.

### 3.8 Fel / laddning

- Ett **banner** under knappen för fel eller kort status vid submit (döljs som standard).

---

## 4. Desktop (större skärmar, `> 640px`)

- **`.container`** har **maxbredd 680px**, **centrerad** på sidan med **ljus yttre padding** på `body` (16px).
- Kortet får **lite rundning, kant och skugga** — mer “kort” i en stor webbläsare.
- Logga kan visas **något större** (ca 280px bredd).
- Hero-rubrik något större än på mobil.

Övriga block och typografi följer samma struktur som på mobil.

---

## 5. Färg- och typreferens (snabb tabell)

| Element | Färg / notering |
|--------|------------------|
| Sidbakgrund (body) | Gradient `#eff6ff` → `#f8fafc` |
| Hero övre | `#e0f2fe` (sky-100) |
| Hero nedre | `#0369a1` (sky-700), vit text |
| Primär knapp / vald skala | `#0284c7` (sky-600) |
| Brödtext | `#0f172a` (slate-900) |
| Hjälptext skala | `#475569` (slate-600) |

---

## 6. Återanvändning som mall för andra formulär

När du bygger ett **nytt** publikt formulär med samma “känsla”:

1. **Behåll layouten:** tvådelad hero (logotyp + varumärke) / (titel + kort policytext), sedan innehållsblock.
2. **Behåll mobilreglerna:** kant-i-kant på små skärmar, undvik dubbel “kort-inuti-kort”-padding.
3. **Behåll tydlig skala** om det är Likert 1–5: ändpunkter synliga under varje fråga.
4. **Fritext:** behåll kort placeholder om **inte** skriva känsliga uppgifter (servern maskar ändå, men UI ska påminna).
5. **Kopiera inte** affärslogik i onödan: nya formulär kan behöva **nytt API** eller **nya fält** — mallen är **UX/visual**, inte nödvändigtvis samma databasrad.

**Teknisk pekare:** börja från `src/pages/e/[kod].astro` och extrahera vid behov gemensamma CSS-mönster till en delad fil om flera formulär ska dela samma stil.

---

## 7. Demo / genomgång (förslag till manus)

1. Öppna en giltig länk `/e/[kod]` på **telefon** eller i webbläsarens responsiva läge (≤ 640px).  
2. Visa **övre hero** (ljusblå + logga), sedan **nedre hero** (mörkblå + rubrik + anonymitet).  
3. Scrolla till **kontexttexten** om besöket.  
4. Gå igenom **en** strukturerad fråga + skalförklaring.  
5. Visa **fritext** med placeholder.  
6. Förklara att **ingen** besökstyp visas i denna version.  
7. Efter test: visa **tacksida** (eller tillståndet “redan svarat” i testmiljö).

---

## 8. Versionsnotering

- Dokumentet speglar **nuvarande** implementation i `src/pages/e/[kod].astro`.  
- Om formuläret ändras: uppdatera detta dokument i **samma commit** (se projektets regel för dokumentationssynk).
