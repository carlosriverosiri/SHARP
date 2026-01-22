# 📱 SMS-portal för patientkommunikation

> **Status:** Delvis implementerat  
> **Personalportal:** ✅ Klar  
> **SMS-funktionalitet:** ⏳ Planerad  
> **Senast uppdaterad:** 2026-01-22

---

## ✅ Vad som är KLART

### Personalportalen (implementerad 2026-01-19 → 2026-01-22)

| Funktion | Status | Beskrivning |
|----------|--------|-------------|
| **Inloggning** | ✅ Klar | Supabase-baserad autentisering med e-post/lösenord |
| **Magic Link** | ✅ Klar | Inloggning via e-postlänk |
| **Glömt lösenord** | ✅ Klar | Självbetjäning via e-post |
| **Sessionshantering** | ✅ Klar | 1 timme sliding timeout |
| **Resurssida** | ✅ Klar | Dokument, länkar, instruktionsvideor i 3-kolumnslayout |
| **Sidomenyn** | ✅ Klar | Alla verktyg tillgängliga efter inloggning |
| **Admin-länkar** | ✅ Klar | Borttagna från publika hemsidan |

### Teknisk infrastruktur

```
✅ /personal/                → Inloggningssida
✅ /personal/oversikt        → Dashboard med alla verktyg
✅ /personal/resurser        → Dokument, länkar, instruktionsvideor
✅ /personal/aterstall-losenord → Lösenordsåterställning
```

**Autentisering:**
- Supabase (EU-server, Frankfurt)
- HttpOnly cookies (säkert)
- Row Level Security på databastabeller
- Audit-loggning förberedd

**Se även:**
- `docs/ADMIN-PORTAL-DESIGN.md` - Designspecifikation
- `docs/ANVANDARSYSTEM-PLANERING.md` - Användarhantering
- `docs/SSR-OG-COOKIES-FORKLARING.md` - Teknisk förklaring

---

## ⏳ Vad som ÅTERSTÅR: SMS-funktionalitet

### Bakgrund och syfte

Personalen får ofta administrativa frågor per telefon om t.ex.:
- Sjukskrivningspolicy
- Läkemedelsförskrivningspolicy  
- Receptförnyelse
- Väntetider och remisshantering

Istället för att förklara eller copy-pasta långa webbadresser ska personalen kunna:
1. Ha SMS-portalen öppen i personalportalen
2. Välja rätt mall från en lista
3. Klistra in patientens mobilnummer
4. Klicka "Skicka"

**Viktigt:** Envägs-SMS – patienten kan INTE svara.

---

## Planerad implementation av SMS

### Alternativ 1: Astro API Route (Rekommenderat)

Använd befintlig Astro-infrastruktur med en ny sida:

```
/personal/sms        → SMS-sändningssida (ny)
```

**Fördelar:**
- Samma inloggningssystem (Supabase)
- Samma hosting (Netlify)
- Inget separat backend-projekt

**Teknisk implementation:**
```typescript
// src/pages/api/sms/skicka.ts
import type { APIRoute } from 'astro';
import { arInloggad, hamtaAnvandare } from '../../lib/auth';
import { kontrolleraRateLimit, registreraSms } from '../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  // Kontrollera inloggning
  if (!await arInloggad(cookies)) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), { status: 401 });
  }

  const { telefonnummer, mallId } = await request.json();
  const anvandare = await hamtaAnvandare(cookies);

  // Rate limiting
  if (!await kontrolleraRateLimit(anvandare.id)) {
    return new Response(JSON.stringify({ error: 'SMS-kvot överskriden' }), { status: 429 });
  }

  // Skicka SMS via 46elks/Sinch/Twilio
  const result = await skickaSms(telefonnummer, mallText);

  // Logga (utan telefonnummer - GDPR)
  await registreraSms(anvandare.id, mallKategori, mallNamn);

  return new Response(JSON.stringify({ success: true }));
};
```

### Alternativ 2: Separat Flask-app (Original prompt)

Om man vill ha helt separat system - se prompten längre ner.

---

## SMS-API val

> **Volym:** ~1000 SMS/månad  
> **Målgrupp:** Endast svenska mobilnummer (+46)

| Leverantör | Pris/SMS | 1000 SMS/mån | Fördelar | Nackdelar |
|------------|----------|--------------|----------|-----------|
| **46elks** 🏆 | ~0,35 kr | **~350 kr** | Svenskt, enklast API, svensk support | Endast Norden |
| Sinch | ~0,40 kr | ~400 kr | Svenskt ursprung, tillförlitligt | Mer komplex |
| TextMagic | ~0,55 kr | ~550 kr | Enkel webpanel | Dyrare |
| Twilio | ~0,85 kr | ~850 kr | Mycket dokumentation | USA-baserat, dyrt |

### ✅ Rekommendation: 46elks

**Varför 46elks?**
- 🇸🇪 Svenskt företag (Göteborg) - enkel kontakt vid problem
- 💰 Billigast för svenska nummer
- 📖 Dokumentation på svenska
- 🔒 GDPR-compliance inbyggt (data lagras i Sverige)
- 🚀 Enklaste API:et - perfekt för mindre projekt
- 💳 Ingen månadsavgift - betala bara för det du skickar

**Kom igång:**
1. Skapa konto på [46elks.se](https://46elks.se)
2. Ladda på kredit (minsta insättning ~100 kr)
3. Hämta API-nycklar från dashboard
4. Klar att skicka!

---

## Databastabeller (redan förberedda i Supabase)

```sql
-- Finns i docs/SUPABASE-SCHEMA.sql

-- SMS-mallar
CREATE TABLE sms_mallar (
  id UUID PRIMARY KEY,
  kategori TEXT NOT NULL,
  rubrik TEXT NOT NULL,
  meddelande TEXT NOT NULL,
  lank TEXT,
  aktiv BOOLEAN DEFAULT true,
  skapad_vid TIMESTAMPTZ DEFAULT NOW()
);

-- SMS-statistik (GDPR-säker)
CREATE TABLE sms_statistik (
  id BIGSERIAL PRIMARY KEY,
  anvandare_id UUID REFERENCES auth.users(id),
  mall_kategori TEXT NOT NULL,
  mall_namn TEXT NOT NULL,
  mottagare_suffix TEXT,  -- Endast sista 2 siffror
  skickad_vid TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting
CREATE TABLE sms_rate_limit (
  id BIGSERIAL PRIMARY KEY,
  anvandare_id UUID REFERENCES auth.users(id),
  skickad_vid TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Exempelmallar

### Kategori: Policyer & regler
| Rubrik | Meddelande |
|--------|------------|
| Receptpolicy | "Hej! Info om vår receptpolicy: sodermalmsortopedi.se/info/recept-policy /Södermalms Ortopedi" |
| Sjukskrivning | "Hej! Info om sjukskrivning finns här: [LÄNK] /Södermalms Ortopedi" |

### Kategori: Inför besök
| Rubrik | Meddelande |
|--------|------------|
| Kallelse operation | "Hej! Viktig info inför din operation: sodermalmsortopedi.se/info/kallelse-operation /Södermalms Ortopedi" |
| Hitta till oss | "Hej! Vägbeskrivning: sodermalmsortopedi.se/om-oss/om-kliniken-hitta-hit /Södermalms Ortopedi" |

### Kategori: Efter besök
| Rubrik | Meddelande |
|--------|------------|
| Rehabprogram | "Hej! Här är ditt rehabprogram: [LÄNK] /Södermalms Ortopedi" |

---

## GDPR-krav (KRITISKT)

- ❌ Spara ALDRIG fullständigt telefonnummer
- ❌ Logga ALDRIG meddelandeinnehåll  
- ✅ Logga endast metadata (vem, när, vilken malltyp)
- ✅ Endast sista 2 siffror i telefonnummer (för felsökning)
- ✅ Informera att SMS-leverantören har egen loggning

---

## Nästa steg för SMS-implementation

### Fas 1: Förberedelse (1 timme)
- [ ] Skapa konto hos 46elks eller Sinch
- [ ] Hämta API-nycklar
- [ ] Lägga till miljövariabler i Netlify

### Fas 2: Backend (2-3 timmar)
- [ ] Skapa `/personal/sms` sida
- [ ] Implementera `/api/sms/skicka` endpoint
- [ ] Rate limiting med befintlig Supabase-tabell
- [ ] GDPR-säker loggning

### Fas 3: Frontend (2-3 timmar)
- [ ] Mallväljare (kategorier + mallar)
- [ ] Telefonnummer-fält med validering
- [ ] Förhandsgranskning
- [ ] Teckenräknare
- [ ] Bekräftelsemeddelande

### Fas 4: Test & Deploy (1 timme)
- [ ] Testa lokalt
- [ ] Pusha till Netlify
- [ ] Testa i produktion

**Total tid:** ~6-8 timmar

---

## Relaterade sidor på hemsidan (för mallar)

- `/info/recept-policy` - Receptpolicy & förpackningsbyten
- `/info/kallelse-operation` - Inför operation (regionpatient)
- `/info/kallelse-operation-forsakring` - Inför operation (försäkring)
- `/patient/remiss-vantetid/` - Remiss & väntetid
- `/patient/forsakringar-betalning/` - Försäkringar & betalning
- `/om-oss/om-kliniken-hitta-hit/` - Hitta till oss

---

## Kostnad

| Post | Kostnad |
|------|---------|
| 46elks SMS | ~0,35 kr/SMS |
| Supabase | Gratis (nuvarande användning) |
| Netlify hosting | Gratis (nuvarande plan) |

### Månadsberäkning

| Volym | SMS-kostnad | Total |
|-------|-------------|-------|
| 100 SMS | ~35 kr | **~35 kr/mån** |
| 500 SMS | ~175 kr | **~175 kr/mån** |
| 1000 SMS | ~350 kr | **~350 kr/mån** |

> 💡 **Jämförelse:** Att manuellt ringa/mejla samma information tar betydligt längre tid och kostar mer i arbetstid.

---

*Dokumentet uppdaterat 2026-01-22 för att spegla implementerad personalportal.*
