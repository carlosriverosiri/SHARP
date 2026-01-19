# Kopiera Kortlänkar - Dokumentation

## Översikt

**Kopiera Kortlänkar** är ett internt verktyg för att snabbt kopiera korta URLs till patientinformation. Perfekt för SMS där teckenbegränsning finns (max 255 tecken).

**Sida:** `/copy-links`  
**Meny:** Om Oss → Admin → Kopiera länkar

---

## ⭐ Single Source of Truth

**Alla kortlänkar definieras på ETT ställe:**

```
src/data/shortLinks.json
```

Denna fil används automatiskt av:
- `astro.config.mjs` → Genererar redirects
- `copy-links.astro` → Genererar UI

**Du behöver aldrig redigera mer än EN fil för att lägga till nya länkar!**

---

## Användning

### Steg-för-steg

1. **Öppna sidan** i en flik/fönster under mottagningen
2. **Sök** efter diagnos, operation eller rehab (valfritt)
3. **Klicka "Kopiera länk"** bredvid rätt item
4. **Klistra in** i SMS till patienten (Ctrl+V / Cmd+V)

### Exempel-SMS

```
Hej! Här är info om din diagnos: www.specialist.se/d/ac
```

Endast 54 tecken – gott om plats för mer text!

### Teckenbesparingar

| Format | Tecken | Besparing |
|--------|--------|-----------|
| `https://specialist.se/sjukdomar/axel/ac-ledsartros` | 51 | - |
| `www.specialist.se/d/ac` | 23 | **28 tecken!** |

---

## URL-struktur

Korta URLs använder följande prefix:

| Prefix | Kategori | Exempel |
|--------|----------|---------|
| `/d/` | Diagnoser | `www.specialist.se/d/ac` → AC-ledsartros |
| `/o/` | Operationer | `www.specialist.se/o/ac` → Operation AC-led |
| `/r/` | Rehab | `www.specialist.se/r/ac` → Rehab efter AC-op |
| `/ff/` | Frågeformulär | `www.specialist.se/ff/axel` → Externt frågeformulär |
| `/i/` | Info (policy, riktlinjer) | `www.specialist.se/i/recept` → Policy receptändringar |

> **OBS:** `www.` används istället för `https://` för att spara 4 tecken per länk.  
> Båda fungerar – webbläsaren lägger automatiskt till `https://`.

---

## Lägga till nya kortlänkar

### 🛠 Metod 1: Använd Link Generator (Rekommenderat)

Det enklaste sättet är att använda **Link Generator-verktyget** direkt på sidan. Verktyget är designat för att vara så enkelt som möjligt:

1. **Öppna** `/copy-links`-sidan
2. **Scrolla ner** till sektionen "🛠 Lägg till ny kortlänk"
3. **Klicka** för att expandera formuläret
4. **Följ stegen:**
   - **Steg 1:** Välj kategori (Diagnoser, Operationer, Rehab, Frågeformulär eller Info)
   - **Steg 2:** Skriv namnet på länken (t.ex. "AC-ledsartros")
     - 💡 **Tips:** Kortkoden fylls i automatiskt när du skriver namnet!
   - **Steg 3:** Kortkod (fylls i automatiskt, men du kan ändra den)
     - 💡 **Tips:** Klicka på "Auto"-knappen om du vill generera om kortkoden
     - 💡 **Tips:** Du ser en förhandsvisning av hur länken kommer se ut
   - **Steg 4:** Skriv vart länken ska gå
     - Intern sida: `/sjukdomar/axel/ac-ledsartros`
     - Extern URL: `https://journalsystem.se/form/axel-123`
5. **Klicka "Generera och kopiera"**
6. **Följ instruktionerna** som visas (steg-för-steg)
7. **Kopiera** JSON-blocket
8. **Öppna** `src/data/shortLinks.json`
9. **Klistra in** JSON-objektet i rätt kategori-array
10. **Pusha** till GitHub

**Smart funktioner:**
- ✅ **Automatisk kortkod-generering** – Skriv namnet, få kortkoden automatiskt
- ✅ **Auto-fill-knapp** – Generera kortkod från namn med ett klick
- ✅ **Live-förhandsvisning** – Se hur länken ser ut medan du skriver
- ✅ **Prefix läggs till automatiskt** – Du behöver bara skriva suffix (t.ex. "ac" blir "/d/ac")
- ✅ **Extern-detektion** – Systemet ser automatiskt om det är extern URL
- ✅ **Formaterad JSON** – Korrekt syntax, redo att klistra in
- ✅ **Stegvis guide** – Varje steg är numrerat och tydligt
- ✅ **Tydliga felmeddelanden** – Om något saknas, får du exakt besked om vad

### 📝 Metod 2: Manuell redigering

Om du föredrar att redigera direkt i filen:

Öppna `src/data/shortLinks.json` och lägg till en ny länk i rätt kategori:

```json
{
  "Diagnoser": [
    {
      "name": "AC-ledsartros (yttre nyckelbensleden)",
      "shortCode": "/d/ac",
      "target": "/sjukdomar/axel/ac-ledsartros",
      "isExternal": false
    },
    {
      "name": "NY DIAGNOS",
      "shortCode": "/d/nydiagnos",
      "target": "/sjukdomar/axel/ny-diagnos-sida",
      "isExternal": false
    }
  ]
}
```

### Fält-förklaring

| Fält | Beskrivning | Exempel |
|------|-------------|---------|
| `name` | Beskrivande namn (visas i UI) | `"Frusen skuldra"` |
| `shortCode` | Kort URL-path (inkl. prefix) | `"/d/frusen"` |
| `target` | Mål-URL (intern eller extern) | `"/sjukdomar/axel/..."` eller `"https://..."` |
| `isExternal` | `true` om extern URL (börjar med `http`) | `false` / `true` |

### Steg-för-steg (Manuell)

1. **Öppna** `src/data/shortLinks.json`
2. **Hitta rätt kategori** (Diagnoser, Operationer, Rehab, Frågeformulär, Info)
3. **Lägg till** nytt objekt med alla fält
4. **Kontrollera** att `isExternal` är korrekt (`true` för externa URLs)
5. **Pusha** till GitHub
6. **Klart!** Redirect och UI uppdateras automatiskt

---

## Frågeformulär (Externa URLs)

Frågeformulär är speciella – de redirectar till **externa URLs** i journalsystemet.

### Hur det fungerar

1. Du skickar SMS: `"Fyll i formulär: www.specialist.se/ff/axel"`
2. Patient klickar på länken
3. Redirectas automatiskt till journalsystemets långa URL
4. Patient fyller i formuläret

### Konfigurera frågeformulär

I `src/data/shortLinks.json`:

```json
{
  "Frågeformulär": [
    {
      "name": "Frågeformulär axel (före besök)",
      "shortCode": "/ff/axel",
      "target": "https://journalsystem.se/form/axel-123",
      "isExternal": true
    }
  ]
}
```

**För att ändra en formulär-URL:**
1. Öppna `src/data/shortLinks.json`
2. Hitta formuläret i kategorin "Frågeformulär"
3. Ändra `target` till den nya URL:en från journalsystemet
4. Pusha till GitHub

---

## Befintliga kortlänkar

### Diagnoser (`/d/`)

| Kort URL | Diagnos |
|----------|---------|
| `/d/ac` | AC-ledsartros |
| `/d/imp` | Impingement |
| `/d/cuff` | Rotatorcuffruptur |
| `/d/frusen` | Frusen skuldra |
| `/d/kalk` | Kalkaxel |
| `/d/instab` | Axelinstabilitet |
| `/d/slap` | SLAP-skada |
| `/d/biceps` | Bicepstendinit |
| `/d/pts` | Parsonage-Turner syndrom |

### Operationer (`/o/`)

| Kort URL | Operation |
|----------|-----------|
| `/o/ac` | AC-ledsresektion |
| `/o/sad` | Subakromiell dekompression |
| `/o/cuff` | Rotatorcuffrekonstruktion |
| `/o/kalk` | Kalkborttagning |
| `/o/stab` | Stabiliseringsoperation |
| `/o/biceps` | Bicepstenodes |

### Rehab (`/r/`)

| Kort URL | Rehab |
|----------|-------|
| `/r/ac` | Efter AC-ledsoperation |
| `/r/sad` | Efter subakromiell dekompression |
| `/r/cuff` | Efter rotatorcuffoperation |
| `/r/frusen` | Vid frusen skuldra |
| `/r/stab` | Efter stabiliseringsoperation |

### Frågeformulär (`/ff/`) - Externa

| Kort URL | Formulär |
|----------|----------|
| `/ff/axel` | Axel (före besök) |
| `/ff/armbage` | Armbåge (före besök) |
| `/ff/kna` | Knä (före besök) |

### Info (`/i/`) - Patientinformation & Riktlinjer

| Kort URL | Information |
|----------|-------------|
| `/i/recept` | Policy: Restnoterade läkemedel & förpackningsbyten |
| `/i/kallelse` | Kallelse för Operation (vanliga patienter) |
| `/i/kallelse-forsakring` | Kallelse för Operation (försäkringspatienter) |

---

## Teknisk information

### Arkitektur: Single Source of Truth

```
src/data/shortLinks.json    ← EN fil att redigera
        ↓
    ┌───┴───┐
    ↓       ↓
astro.config.mjs    copy-links.astro
(genererar redirects)    (genererar UI)
```

### Filer

| Fil | Beskrivning |
|-----|-------------|
| `src/data/shortLinks.json` | **Central datafil** - Alla kortlänkar definieras här |
| `astro.config.mjs` | Importerar JSON och genererar redirects automatiskt |
| `src/pages/copy-links.astro` | Importerar JSON och genererar UI automatiskt |
| `docs/KOPIERA-LANKAR.md` | Denna dokumentation |

### Hur det fungerar

**Vid build-tid:**
1. `astro.config.mjs` läser `shortLinks.json`
2. Genererar redirects-objektet dynamiskt
3. Astro skapar redirect-regler för alla kortlänkar

**Vid runtime:**
1. `copy-links.astro` importerar `shortLinks.json`
2. Genererar UI med alla kategorier och länkar
3. JavaScript hanterar kopiering och sökning

### Varför `www.` istället för `https://`?

- `https://specialist.se/d/ac` = 25 tecken
- `www.specialist.se/d/ac` = 21 tecken
- **Besparing: 4 tecken per länk**

Med 4000-5000 SMS/månad och potentiellt flera länkar per SMS blir detta betydande.

---

## Felsökning

### "Kunde inte kopiera länken"

- Kontrollera att du använder HTTPS (inte HTTP)
- Försök med en annan webbläsare
- Kontrollera att du har tillåtit clipboard-åtkomst

### Redirect fungerar inte

1. Kontrollera att länken finns i `src/data/shortLinks.json`
2. Kontrollera att `target` är korrekt (intern path eller extern URL)
3. Redeploy om du nyss lagt till länken
4. Kör `npm run build` lokalt för att testa

### Länk visas inte i UI

1. Kontrollera att objektet har alla obligatoriska fält (`name`, `shortCode`, `target`, `isExternal`)
2. Kontrollera JSON-syntax (kommatecken, citattecken)
3. Starta om dev-servern (`npm run dev`)

### JSON-valideringsfel

Använd en JSON-validator (t.ex. [jsonlint.com](https://jsonlint.com)) för att hitta syntaxfel.

---

## Tips

### För daglig användning
- **Ha sidan öppen** i en egen flik under hela mottagningen
- **Använd sökfunktionen** för att snabbt hitta rätt länk (söker i både namn och shortcode)
- **Testa nya länkar** innan du skickar till patienter
- **Uppdatera frågeformulär-URLs** om journalsystemet ändras

### För att lägga till nya länkar
- **Använd Link Generator** – Det är det enklaste sättet!
- **Lita på automatiken** – Kortkoden genereras automatiskt från namnet
- **Använd "Auto"-knappen** om du vill generera om kortkoden
- **Kolla förhandsvisningen** – Se hur länken ser ut innan du genererar
- **En fil = all underhåll** – redigera bara `shortLinks.json`

### Tekniska regler
- **Kortkod-regler:** Endast små bokstäver (a-z), siffror (0-9) och bindestreck (-)
- **Exempel:** `ac-ledsartros`, `impingement`, `rotatorcuff-ruptur`
- **Åäö konverteras automatiskt** till aao när du använder Auto-funktionen

---

*Senast uppdaterad: 3 januari 2026*  
*Link Generator-verktyg tillagt: 3 januari 2026*  
*Automatisk kortkod-generering och förbättringar: 3 januari 2026*

- **Testa nya länkar** innan du skickar till patienter
- **Uppdatera frågeformulär-URLs** om journalsystemet ändras

### För att lägga till nya länkar
- **Använd Link Generator** – Det är det enklaste sättet!
- **Lita på automatiken** – Kortkoden genereras automatiskt från namnet
- **Använd "Auto"-knappen** om du vill generera om kortkoden
- **Kolla förhandsvisningen** – Se hur länken ser ut innan du genererar
- **En fil = all underhåll** – redigera bara `shortLinks.json`

### Tekniska regler
- **Kortkod-regler:** Endast små bokstäver (a-z), siffror (0-9) och bindestreck (-)
- **Exempel:** `ac-ledsartros`, `impingement`, `rotatorcuff-ruptur`
- **Åäö konverteras automatiskt** till aao när du använder Auto-funktionen

---

*Senast uppdaterad: 3 januari 2026*  
*Link Generator-verktyg tillagt: 3 januari 2026*  
*Automatisk kortkod-generering och förbättringar: 3 januari 2026*