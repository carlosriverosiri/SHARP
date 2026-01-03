# Kopiera Kortlänkar - Dokumentation

## Översikt

**Kopiera Kortlänkar** är ett internt verktyg för att snabbt kopiera korta URLs till patientinformation. Perfekt för SMS där teckenbegränsning finns (max 255 tecken).

**Sida:** `/copy-links`  
**Meny:** Om Oss → Admin → Kopiera länkar

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

> **OBS:** `www.` används istället för `https://` för att spara 4 tecken per länk.  
> Båda fungerar – webbläsaren lägger automatiskt till `https://`.

---

## Frågeformulär (Externa URLs)

Frågeformulär är speciella – de redirectar till **externa URLs** i journalsystemet.

### Hur det fungerar

1. Du skickar SMS: `"Fyll i formulär: www.specialist.se/ff/axel"`
2. Patient klickar på länken
3. Redirectas automatiskt till journalsystemets långa URL
4. Patient fyller i formuläret

### Konfigurera frågeformulär

I `astro.config.mjs` pekar frågeformulär till externa URLs:

```javascript
redirects: {
  // FRÅGEFORMULÄR - Externa URLs till journalsystemet
  '/ff/axel': 'https://ditt-journalsystem.se/form/axel-formulär-id',
  '/ff/armbage': 'https://ditt-journalsystem.se/form/armbage-formulär-id',
  '/ff/kna': 'https://ditt-journalsystem.se/form/kna-formulär-id',
}
```

**För att ändra en formulär-URL:**
1. Öppna `astro.config.mjs`
2. Hitta raden för formuläret (t.ex. `/ff/axel`)
3. Byt ut URL:en till den nya från journalsystemet
4. Pusha och redeploya

---

## Befintliga kortlänkar

### Diagnoser (`/d/`)

| Kort URL | Diagnos | Full kopierad URL |
|----------|---------|-------------------|
| `/d/ac` | AC-ledsartros | `www.specialist.se/d/ac` |
| `/d/imp` | Impingement | `www.specialist.se/d/imp` |
| `/d/cuff` | Rotatorcuffruptur | `www.specialist.se/d/cuff` |
| `/d/frusen` | Frusen skuldra | `www.specialist.se/d/frusen` |
| `/d/kalk` | Kalkaxel | `www.specialist.se/d/kalk` |
| `/d/instab` | Axelinstabilitet | `www.specialist.se/d/instab` |
| `/d/slap` | SLAP-skada | `www.specialist.se/d/slap` |
| `/d/biceps` | Bicepstendinit | `www.specialist.se/d/biceps` |
| `/d/pts` | Parsonage-Turner syndrom | `www.specialist.se/d/pts` |

### Operationer (`/o/`)

| Kort URL | Operation | Full kopierad URL |
|----------|-----------|-------------------|
| `/o/ac` | AC-ledsresektion | `www.specialist.se/o/ac` |
| `/o/sad` | Subakromiell dekompression | `www.specialist.se/o/sad` |
| `/o/cuff` | Rotatorcuffrekonstruktion | `www.specialist.se/o/cuff` |
| `/o/kalk` | Kalkborttagning | `www.specialist.se/o/kalk` |
| `/o/stab` | Stabiliseringsoperation | `www.specialist.se/o/stab` |
| `/o/biceps` | Bicepstenodes | `www.specialist.se/o/biceps` |

### Rehab (`/r/`)

| Kort URL | Rehab | Full kopierad URL |
|----------|-------|-------------------|
| `/r/ac` | Efter AC-ledsoperation | `www.specialist.se/r/ac` |
| `/r/sad` | Efter subakromiell dekompression | `www.specialist.se/r/sad` |
| `/r/cuff` | Efter rotatorcuffoperation | `www.specialist.se/r/cuff` |
| `/r/frusen` | Vid frusen skuldra | `www.specialist.se/r/frusen` |
| `/r/stab` | Efter stabiliseringsoperation | `www.specialist.se/r/stab` |

### Frågeformulär (`/ff/`) - Externa

| Kort URL | Formulär | Pekar till |
|----------|----------|------------|
| `/ff/axel` | Axel (före besök) | Journalsystemet |
| `/ff/armbage` | Armbåge (före besök) | Journalsystemet |
| `/ff/kna` | Knä (före besök) | Journalsystemet |

---

## Lägga till nya kortlänkar

### För diagnoser/operationer/rehab (interna sidor)

#### Steg 1: Lägg till redirect i `astro.config.mjs`

```javascript
redirects: {
  // DIAGNOSER
  '/d/ac': '/sjukdomar/axel/ac-ledsartros',
  '/d/nydiagnos': '/sjukdomar/axel/ny-diagnos-sida',  // <-- NY RAD
}
```

#### Steg 2: Lägg till i länklistan

Öppna `src/pages/copy-links.astro` och lägg till i `links`-arrayen:

```javascript
const links = [
  {
    category: "Diagnoser",
    icon: "🩺",
    items: [
      { name: "AC-ledsartros", shortPath: "/d/ac" },
      { name: "Ny diagnos", shortPath: "/d/nydiagnos" },  // <-- NY RAD
    ]
  },
];
```

#### Steg 3: Redeploy

Pusha ändringarna till GitHub.

---

### För frågeformulär (externa URLs)

#### Steg 1: Lägg till redirect till extern URL

```javascript
redirects: {
  // FRÅGEFORMULÄR - Externa URLs
  '/ff/axel': 'https://journalsystem.se/form/axel-123',
  '/ff/nytt': 'https://journalsystem.se/form/nytt-formulär-456',  // <-- NY
}
```

#### Steg 2: Lägg till i länklistan

```javascript
{
  category: "Frågeformulär",
  icon: "📋",
  items: [
    { name: "Frågeformulär axel", shortPath: "/ff/axel" },
    { name: "Nytt formulär", shortPath: "/ff/nytt" },  // <-- NY RAD
  ]
}
```

#### Steg 3: Redeploy

---

## Teknisk information

### Filer

| Fil | Beskrivning |
|-----|-------------|
| `src/pages/copy-links.astro` | Själva verktygssidan |
| `astro.config.mjs` | Redirect-konfiguration (alla kortlänkar) |
| `docs/KOPIERA-LANKAR.md` | Denna dokumentation |

### Hur redirects fungerar

**Interna sidor (diagnoser, operationer, rehab):**
1. Patient besöker `www.specialist.se/d/ac`
2. Astro redirectar till `/sjukdomar/axel/ac-ledsartros`
3. Sidan på din hemsida visas

**Externa sidor (frågeformulär):**
1. Patient besöker `www.specialist.se/ff/axel`
2. Astro redirectar till `https://journalsystem.se/form/...`
3. Journalsystemets sida visas

### Varför `www.` istället för `https://`?

- `https://specialist.se/d/ac` = 25 tecken
- `www.specialist.se/d/ac` = 21 tecken
- **Besparing: 4 tecken per länk**

Med 4000-5000 SMS/månad och potentiellt flera länkar per SMS blir detta betydande.

> **Fungerar det?** Ja! Moderna webbläsare lägger automatiskt till `https://` när du skriver `www.`.

---

## Felsökning

### "Kunde inte kopiera länken"

- Kontrollera att du använder HTTPS (inte HTTP)
- Försök med en annan webbläsare
- Kontrollera att du har tillåtit clipboard-åtkomst

### Redirect fungerar inte

1. Kontrollera att redirecten finns i `astro.config.mjs`
2. Kontrollera att målsidan existerar (för interna) eller att URL:en är korrekt (för externa)
3. Redeploy om du nyss lagt till redirecten

### Frågeformulär går till fel sida

1. Öppna `astro.config.mjs`
2. Hitta raden för formuläret (t.ex. `/ff/axel`)
3. Kontrollera att URL:en är korrekt
4. Om journalsystemet bytt URL – uppdatera och redeploya

---

## Tips

- **Ha sidan öppen** i en egen flik under hela mottagningen
- **Använd sökfunktionen** för att snabbt hitta rätt länk
- **Testa nya länkar** innan du skickar till patienter
- **Uppdatera frågeformulär-URLs** om journalsystemet ändras
- **Kortare = bättre** – varje tecken räknas i SMS!

---

*Senast uppdaterad: 3 januari 2026*
