# 🔐 Personalportal för Södermalms Ortopedi

> **Status:** ✅ Implementerad  
> **Senast uppdaterad:** 2026-01-22

---

## Översikt

En intern personalportal med inloggningsfunktion. Portalen samlar administrativa verktyg på ett ställe och är endast tillgänglig för inloggad personal.

### Kärnprinciper
- **Säkerhet först:** Kräver inloggning via Supabase
- **Snabb tillgång:** Personalen ska kunna utföra vanliga uppgifter med få klick
- **Patientfri:** Ingen känslig patientdata lagras permanent
- **Utbyggbar:** Lätt att lägga till nya funktioner
- **Endast svenska:** All text, gränssnitt och URL:er på svenska

---

## ✅ Implementerade funktioner

| Funktion | URL | Beskrivning |
|----------|-----|-------------|
| **Inloggning** | `/personal/` | Supabase-autentisering med e-post/lösenord |
| **Översikt** | `/personal/oversikt` | Dashboard med alla verktyg |
| **Länkar & SMS** | `/personal/lankar-sms` | Kopiera kortlänkar och skicka SMS |
| **Resurser** | `/personal/resurser` | Dokument, länkar, instruktionsvideor |
| **Lösenordsåterställning** | `/personal/aterstall-losenord` | Självbetjäning |

---

## URL-struktur

```
/personal/                    → Inloggningssida
/personal/oversikt            → Dashboard
/personal/lankar-sms          → Kopiera länkar & Skicka SMS
/personal/resurser            → Dokument och resurser
/personal/aterstall-losenord  → Återställ lösenord
/api/sms/skicka               → API för SMS-sändning
```

---

## Filstruktur

```
src/
├── components/
│   └── Header.astro              # Kugghjulsikon till portalen
├── lib/
│   ├── auth.ts                   # Autentisering (Supabase)
│   └── supabase.ts               # Supabase-klient
├── pages/
│   ├── api/
│   │   └── sms/
│   │       └── skicka.ts         # SMS API (46elks)
│   └── personal/
│       ├── index.astro           # Inloggning
│       ├── oversikt.astro        # Dashboard
│       ├── lankar-sms.astro      # Länkar & SMS
│       ├── resurser.astro        # Resurser
│       └── aterstall-losenord.astro
└── data/
    └── shortLinks.json           # Länkdefinitioner
```

---

## Autentisering

### Supabase
- **Plattform:** Supabase (EU-server, Frankfurt)
- **Metoder:** E-post/lösenord, Magic Link
- **Session:** 1 timme sliding timeout
- **Cookies:** HttpOnly, SameSite Strict, Secure

### Miljövariabler

```env
# Supabase
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# 46elks SMS
ELKS_API_USER=xxx
ELKS_API_PASSWORD=xxx
```

---

## Moduler

### 📎 Länkar & SMS
Kombinerat verktyg för att kopiera kortlänkar och skicka SMS till patienter.

**Dokumentation:** [`docs/LANKAR-OCH-SMS.md`](./LANKAR-OCH-SMS.md)

### 📚 Resurser
Uppladdning och hantering av:
- Dokument (PDF, Word)
- Externa länkar
- Instruktionsvideor (YouTube, Vimeo)

### 🔐 Inloggning
- Supabase-baserad autentisering
- Magic Link-stöd
- Självbetjäning för glömt lösenord

---

## Design

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [Logo → Hemsidan]                              [Logga ut]   │
├────────────┬─────────────────────────────────────────────────┤
│            │                                                  │
│ Översikt   │   Välkommen till Personalportalen               │
│ Länkar&SMS │                                                  │
│ Resurser   │   [Verktyg-kort i grid]                         │
│ ────────   │                                                  │
│ Obesvarade │   [Snabblänkar]                                 │
│ Senast     │                                                  │
│            │                                                  │
│ ────────   │                                                  │
│ [Användare]│                                                  │
│ Logga ut   │                                                  │
└────────────┴─────────────────────────────────────────────────┘
```

### Färgschema
- **Sidebar:** Mörk (`#1e293b`)
- **Innehåll:** Ljus (`#f8fafc`)
- **Accent:** Sky-blue (`#0284c7`)

---

## Säkerhet

- ✅ Supabase-autentisering
- ✅ HttpOnly cookies
- ✅ Row Level Security
- ✅ Rate limiting (SMS)
- ✅ GDPR-compliance
- ✅ `noindex, nofollow` på alla sidor

---

## Relaterade dokument

- [`docs/LANKAR-OCH-SMS.md`](./LANKAR-OCH-SMS.md) - Länk- och SMS-verktyget
- [`docs/ANVANDARSYSTEM-PLANERING.md`](./ANVANDARSYSTEM-PLANERING.md) - Användarhantering
- [`docs/SSR-OG-COOKIES-FORKLARING.md`](./SSR-OG-COOKIES-FORKLARING.md) - Teknisk förklaring

---

*Dokumentet uppdaterat 2026-01-22*
