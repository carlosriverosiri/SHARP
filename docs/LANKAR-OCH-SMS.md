# 📎 Länkar & SMS - Personalverktyg

> **Sida:** `/personal/lankar-sms`  
> **Status:** ✅ Implementerat  
> **Senast uppdaterad:** 2026-01-22

---

## 📋 Översikt

**Länkar & SMS** är ett kombinerat verktyg för personalen som löser två vanliga arbetsuppgifter:

1. **Kopiera kortlänkar** - Snabbt kopiera korta URLs till patientinformation
2. **Skicka SMS** - Skicka fördefinierade meddelanden med länkar till patienter

### Varför detta verktyg?

Personalen får ofta telefonsamtal med frågor som:
- "Vad gäller för sjukskrivning?"
- "Hur förbereder jag mig inför operation?"
- "Var hittar jag rehabövningar?"

**Tidigare lösning:** Förklara muntligt eller leta upp långa webbadresser och diktera dem.

**Nu:** Välj länk → Skriv in mobilnummer → Klicka Skicka. Patienten får ett SMS inom sekunder.

---

## 🖥️ Användargränssnitt

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📎 Kopiera länkar & Skicka SMS                                         │
├───────────────────────────────────┬─────────────────────────────────────┤
│                                   │                                     │
│  🔍 [Sök diagnos, operation...]   │  📱 SKICKA SMS                      │
│                                   │  via 46elks (~0,35 kr/SMS)          │
│  ─────────────────────────────    │  ─────────────────────────────────  │
│                                   │                                     │
│  🩺 DIAGNOSER                     │  📞 Mobilnummer                     │
│  ├─ AC-ledsartros    [Kop] [SMS]  │  +46 [701234567        ]            │
│  ├─ Impingement      [Kop] [SMS]  │                                     │
│  ├─ Rotatorcuffruptur[Kop] [SMS]  │  📁 Kategori                        │
│  └─ Frusen skuldra   [Kop] [SMS]  │  [🩺 Diagnoser           ▼]         │
│                                   │                                     │
│  🔪 OPERATIONER                   │  💬 Meddelande                      │
│  ├─ AC-ledsoperation [Kop] [SMS]  │  ┌─────────────────────────────┐   │
│  └─ Rotatorcuff-op   [Kop] [SMS]  │  │ Hej! Läs mer om AC-leds-    │   │
│                                   │  │ artros: www.specialist.se/  │   │
│  🏋️ REHAB                         │  │ d/ac /Södermalms Ortopedi   │   │
│  ├─ Rehab AC-led     [Kop] [SMS]  │  └─────────────────────────────┘   │
│  └─ Rehab cuff       [Kop] [SMS]  │                                     │
│                                   │  📊 78/160 tecken               1 SMS│
│  📋 FRÅGEFORMULÄR                 │  ████████████░░░░░░░░░░░░░░░░░░░   │
│  └─ Axelformulär     [Kop] [SMS]  │                                     │
│                                   │  [      📤 Skicka SMS         ]     │
│                                   │                                     │
└───────────────────────────────────┴─────────────────────────────────────┘
```

### Två kolumner

| Vänster: Länkar | Höger: SMS-panel |
|-----------------|------------------|
| Sökbart bibliotek med alla kortlänkar | Formulär för att skicka SMS |
| Grupperat per kategori | Förifyller automatiskt vid länkval |
| Kopiera-knapp för varje länk | Teckenräknare med färgkodning |
| SMS-knapp för att fylla i panelen | Kostnadsindikator |

---

## 🔄 Arbetsflöde

### Scenario 1: Endast kopiera länk

1. Sök eller bläddra till rätt länk
2. Klicka **"Kopiera"**
3. Klistra in länken i journalsystem, e-post eller annat

### Scenario 2: Skicka SMS till patient

1. Sök eller bläddra till rätt länk
2. Klicka **"SMS"** (eller klicka var som helst på raden)
3. SMS-panelen fylls i automatiskt med rätt mall
4. Skriv in patientens mobilnummer (utan 0:an, t.ex. `701234567`)
5. Justera texten vid behov
6. Klicka **"Skicka SMS"**
7. Patienten får SMS inom sekunder

---

## 🧩 Tampermonkey: Ring/SMS-modal (autofyll)

Ett Tampermonkey‑script kan användas för att klicka på mobilnummer i externa system och få en modal med två val:
- **Ring** (via `tel:`)
- **SMS** (öppnar `/personal/lankar-sms` med telefonnumret förifyllt)

### URL‑parametrar som stöds
Sidan `/personal/lankar-sms` kan ta emot:
- `phone` (t.ex. `+46701234567` eller `0701234567`)
- `mobil`
- `tel`

Exempel:
```
/personal/lankar-sms?phone=+46701234567
```

### Effekt
- Telefonnumret fylls automatiskt i **Mobilnummer**‑fältet.
- Personalen kan direkt klicka på **SMS** för diagnos/operation/formulär för att fylla meddelandet.

### Exempel: Tampermonkey‑script (SMS‑knappen)
```javascript
copyButton.textContent = 'SMS';

copyButton.onclick = () => {
  let smsNumber = number.startsWith('07') ? '+46' + number.substring(1) : number;
  const smsUrl = `/personal/lankar-sms?phone=${encodeURIComponent(smsNumber)}`;
  window.open(smsUrl, '_blank');
  closeModal();
};
```

**Tips:** Använd full domän om scriptet körs utanför personalportalen:
```
https://sodermalm.netlify.app/personal/lankar-sms?phone=+46701234567
```

### Hela scriptet (referens)
```javascript
// ==UserScript==
// @name         Infinity Telefonval – Custom modal med Ring/SMS
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Vid klick på mobilnummer: centrerad modal med Ring eller SMS.
// @author       Grok-hjälp
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  let overlay = document.createElement('div');
  overlay.id = 'infinity-modal-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.6); z-index: 9998; display: none;
    justify-content: center; align-items: center;
  `;

  let modal = document.createElement('div');
  modal.style.cssText = `
    background: white; padding: 24px; border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3); text-align: center;
    min-width: 300px; z-index: 9999;
  `;

  let numberDisplay = document.createElement('p');
  numberDisplay.style.cssText = 'font-size: 18px; margin: 0 0 24px 0; font-weight: bold;';

  let buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; gap: 16px; justify-content: center;';

  let ringButton = document.createElement('button');
  ringButton.textContent = 'Ring';
  ringButton.style.cssText = `
    padding: 12px 24px; font-size: 16px; background: #007bff; color: white;
    border: none; border-radius: 8px; cursor: pointer;
  `;

  let copyButton = document.createElement('button');
  copyButton.textContent = 'SMS';
  copyButton.style.cssText = `
    padding: 12px 24px; font-size: 16px; background: #28a745; color: white;
    border: none; border-radius: 8px; cursor: pointer;
  `;

  buttonContainer.appendChild(ringButton);
  buttonContainer.appendChild(copyButton);
  modal.appendChild(numberDisplay);
  modal.appendChild(buttonContainer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function showModal(number, href) {
    let formatted = number.replace(/(\+46|0)/, '+46 ').replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4').trim();
    numberDisplay.textContent = formatted;

    overlay.style.display = 'flex';

    let closeModal = () => {
      overlay.style.display = 'none';
      ringButton.onclick = null;
      copyButton.onclick = null;
      overlay.onclick = null;
      document.onkeydown = null;
    };

    ringButton.onclick = () => {
      closeModal();
      location.href = href;
    };

    copyButton.onclick = () => {
      let smsNumber = number.startsWith('07') ? '+46' + number.substring(1) : number;
      const smsUrl = `https://sodermalm.netlify.app/personal/lankar-sms?phone=${encodeURIComponent(smsNumber)}`;
      window.open(smsUrl, '_blank');
      closeModal();
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };

    document.onkeydown = (e) => {
      if (e.key === 'Escape') closeModal();
    };
  }

  document.addEventListener('click', function(e) {
    let link = e.target.closest('a[href^="tel:"]');
    if (!link) return;

    let href = link.href;
    let number = href.substring(4);

    let isMobile = number.startsWith('+467') || number.startsWith('07');
    if (!isMobile) return;

    e.preventDefault();
    e.stopPropagation();

    showModal(number, href);
  }, true);
})();
```

---

## 📝 SMS-mallar

Varje kategori har en fördefinierad mall som fylls i automatiskt:

| Kategori | Mall |
|----------|------|
| **Diagnoser** | "Hej! Läs mer om {diagnos}: {länk} /Södermalms Ortopedi" |
| **Operationer** | "Hej! Du är planerad för {operation}. Läs mer här: {länk} /Södermalms Ortopedi" |
| **Rehab** | "Hej! Efter din operation, läs igenom rehabinformationen: {länk} /Södermalms Ortopedi" |
| **Frågeformulär** | "Hej! Vänligen fyll i detta formulär inför ditt besök: {länk} /Södermalms Ortopedi" |
| **Info** | "Hej! Här finns information som kan vara bra att läsa: {länk} /Södermalms Ortopedi" |

**Mallarna kan redigeras** innan sändning - personalen kan anpassa texten efter behov.

---

## 📊 Teckenräknare & Kostnad

### SMS-längd och kostnad

| Tecken | Antal SMS | Kostnad (46elks) |
|--------|-----------|------------------|
| 1-160 | 1 SMS | ~0,35 kr |
| 161-306 | 2 SMS | ~0,70 kr |
| 307-459 | 3 SMS | ~1,05 kr |

### Visuell indikator

```
📊 78/160 tecken                               1 SMS
████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   (grön)

📊 145/160 tecken                              1 SMS  
██████████████████████████████████████░░░░░░   (gul - närmar sig gräns)

📊 185/160 tecken                              2 SMS (~0,70 kr)
████████████████████████████████████████████   (röd - kostar extra)
```

---

## 🔐 Säkerhet

### Inloggning krävs
- Endast inloggad personal kan komma åt sidan
- Sessionen gäller i 1 timme (sliding timeout)

### Rate limiting
- Max **30 SMS per timme** per användare
- Förhindrar missbruk och oavsiktlig spamming

### GDPR-compliance
- ❌ Telefonnummer sparas **ALDRIG** i databasen
- ❌ Meddelandeinnehåll loggas **ALDRIG**
- ✅ Endast metadata loggas (vem skickade, när, vilken kategori)
- ✅ 46elks lagrar data i Sverige

---

## 🏗️ Teknisk arkitektur

### Filer

```
src/
├── pages/
│   ├── personal/
│   │   └── lankar-sms.astro      ← Huvudsida (SSR)
│   └── api/
│       └── sms/
│           └── skicka.ts         ← API-endpoint (serverless)
└── data/
    └── shortLinks.json           ← Länkdefinitioner (Single Source of Truth)
```

### Dataflöde

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Användare  │───▶│  Frontend    │───▶│  API Route   │───▶│   46elks     │
│   (browser)  │    │  (Astro SSR) │    │  /api/sms/   │    │   SMS API    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                           │                    │
                           ▼                    ▼
                    ┌──────────────┐    ┌──────────────┐
                    │ shortLinks   │    │  Rate Limit  │
                    │    .json     │    │   (memory)   │
                    └──────────────┘    └──────────────┘
```

### API-endpoint: `/api/sms/skicka`

**Request:**
```json
POST /api/sms/skicka
Content-Type: application/json

{
  "phone": "+46701234567",
  "message": "Hej! Läs mer om AC-ledsartros: www.specialist.se/d/ac /Södermalms Ortopedi"
}
```

**Response (success):**
```json
{
  "success": true,
  "smsCount": 1,
  "id": "s1234567890abcdef"
}
```

**Response (error):**
```json
{
  "error": "Du har skickat max antal SMS (30/timme). Vänta till nästa timme."
}
```

---

## ⚙️ Konfiguration

### Miljövariabler

| Variabel | Beskrivning | Var |
|----------|-------------|-----|
| `ELKS_API_USER` | 46elks API-användarnamn | Netlify Environment Variables |
| `ELKS_API_PASSWORD` | 46elks API-lösenord | Netlify Environment Variables |

### Hämta API-nycklar

1. Logga in på [46elks.se](https://46elks.se)
2. Gå till **Account**
3. Kopiera **API username** och **API password**

### Lägg till i Netlify

1. Gå till [Netlify Dashboard](https://app.netlify.com)
2. Välj projektet → **Project configuration**
3. **Environment variables** → **Add a variable**
4. Lägg till `ELKS_API_USER` och `ELKS_API_PASSWORD`
5. **Deploys** → **Trigger deploy** → **Clear cache and deploy**

---

## 📱 SMS-leverantör: 46elks

### Varför 46elks?

| Fördelar | |
|----------|---|
| 🇸🇪 Svenskt företag | Enkel support, faktura i SEK |
| 💰 Billigast | ~0,35 kr/SMS för svenska nummer |
| 🔒 GDPR | Data lagras i Sverige |
| 📖 Enkelt API | Basic Auth + form-data |
| 💳 Ingen månadsavgift | Betala per SMS |

### Kostnadsberäkning

| Månadsvolym | Kostnad |
|-------------|---------|
| 100 SMS | ~35 kr |
| 500 SMS | ~175 kr |
| 1000 SMS | ~350 kr |

### Saldo

- Ladda på kredit via 46elks dashboard
- Minsta insättning: ~100 kr
- Saldot visas i dashboarden

---

## 🔗 Länkbiblioteket

### Single Source of Truth

Alla länkar definieras i **`src/data/shortLinks.json`**.

Samma fil används av:
1. **Redirect-systemet** (astro.config.mjs) - kortlänkar fungerar
2. **Kopiera länkar-sidan** (lankar-sms.astro) - visas i UI
3. **Gamla /copy-links** (om den finns kvar) - samma data

### Lägga till ny länk

1. Öppna `src/data/shortLinks.json`
2. Lägg till ny länk i rätt kategori:
```json
{
  "name": "Ny diagnos",
  "shortCode": "/d/ny",
  "target": "/sjukdomar/axel/ny-diagnos",
  "isExternal": false
}
```
3. Pusha till GitHub
4. Klart! Länken syns automatiskt i UI och redirect fungerar.

### Kategorier och prefix

| Kategori | Prefix | Exempel |
|----------|--------|---------|
| Diagnoser | `/d/` | `/d/ac`, `/d/cuff` |
| Operationer | `/o/` | `/o/ac`, `/o/cuff` |
| Rehab | `/r/` | `/r/ac`, `/r/cuff` |
| Frågeformulär | `/ff/` | `/ff/axel` |
| Info | `/i/` | `/i/recept`, `/i/kallelse` |

---

## 🐛 Felsökning

### "Unexpected token '<'"
**Orsak:** API-endpointen är inte korrekt konfigurerad för SSR.
**Lösning:** Kontrollera att `export const prerender = false;` finns i `skicka.ts`.

### "SMS-tjänsten är inte konfigurerad"
**Orsak:** Miljövariabler saknas.
**Lösning:** Lägg till `ELKS_API_USER` och `ELKS_API_PASSWORD` i Netlify.

### "Fel API-nycklar"
**Orsak:** Felaktiga värden i miljövariablerna.
**Lösning:** Kontrollera att du kopierat rätt värden från 46elks Account-sidan.

### "Otillräckligt saldo"
**Orsak:** 46elks-kontot har slut på kredit.
**Lösning:** Ladda på mer kredit via 46elks dashboard.

### "Du har skickat max antal SMS"
**Orsak:** Rate limiting (30 SMS/timme).
**Lösning:** Vänta till nästa timme, eller kontakta admin om gränsen behöver höjas.

---

## 📚 Relaterad dokumentation

- `docs/ADMIN-PORTAL-DESIGN.md` - Översikt av personalportalen
- `docs/ANVANDARSYSTEM-PLANERING.md` - Användarhantering och Supabase
- `docs/SSR-OG-COOKIES-FORKLARING.md` - Teknisk förklaring av SSR

---

*Dokumentet skapat 2026-01-22*
