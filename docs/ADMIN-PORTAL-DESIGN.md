# 🔐 Personalportal för Södermalms Ortopedi

> **Status:** ✅ Fas 1 implementerad  
> **Senast uppdaterad:** 2026-01-19

---

## Översikt

En intern personalportal med inloggningsfunktion. Portalen samlar administrativa verktyg på ett ställe och är endast tillgänglig för inloggad personal på desktop.

### Kärnprinciper
- **Säkerhet först:** Kräver inloggning, endast desktop
- **Snabb tillgång:** Personalen ska kunna utföra vanliga uppgifter med få klick
- **Patientfri:** Ingen känslig patientdata lagras permanent
- **Utbyggbar:** Lätt att lägga till nya funktioner
- **Endast svenska:** All text, gränssnitt och URL:er på svenska

---

## ✅ Implementerat (Fas 1)

### Header-ikon
- **Ikon:** Kugghjul (⚙️) - placerad mellan sök-ikonen och språkväxlaren
- **Synlighet:** Endast desktop (dold på mobil)
- **Beteende:** Leder alltid till `/personal/` - om ej inloggad visas login, annars redirect till översikt
- **Färg:** Diskret grå (`text-slate-500`) som blir mörkare vid hover (`hover:text-slate-700`)

### Inloggningssida (`/personal/`)
- Modern, ren design med mörk bakgrund
- Lösenordsfält med validering
- Svenska felmeddelanden
- Varning på mobil om att portalen fungerar bäst på desktop
- "Tillbaka till hemsidan"-länk
- `noindex, nofollow` för sökmotorer

### Översiktssida (`/personal/oversikt`)
- **Sidebar (desktop):** Navigation med verktyg och administration
- **Dashboard-kort:** Snabb åtkomst till verktyg
- **Snabblänkar:** Vanliga sidor som receptpolicy, kallelser, etc.
- **Utloggning:** Via sidebar eller mobil-header

### Session-hantering (Sliding Timeout)
- **Timeout:** 1 timme inaktivitet
- **Sliding:** Sessionen förlängs vid varje sidvisning
- **Säkerhet:** httpOnly, sameSite strict, secure i produktion

---

## URL-struktur

| Sida | URL | Status |
|------|-----|--------|
| Inloggning | `/personal/` | ✅ Klar |
| Översikt | `/personal/oversikt` | ✅ Klar |
| SMS-portal | `/personal/sms` | ⏳ Kommer |
| Kopiera länkar | `/personal/lankar` | ⏳ Planerad |
| Styrdokument | `/personal/dokument` | ⏳ Planerad |
| Inställningar | `/personal/installningar` | ⏳ Planerad |

> **OBS:** Hela personalportalen är endast på svenska. Inga engelska översättningar behövs.

---

## Filstruktur (nuvarande)

```
src/
├── components/
│   └── Header.astro          # Kugghjulsikon tillagd (rad ~580, ~300)
├── lib/
│   └── auth.ts               # ✅ Autentisering med sliding timeout
└── pages/
    └── personal/
        ├── index.astro       # ✅ Inloggningssida
        └── oversikt.astro    # ✅ Dashboard/Översikt
```

---

## Konfiguration

### Miljövariabler (.env)

```env
# Lösenord för personalportalen
PERSONAL_PASSWORD=ditt-lösenord-här

# Session-hemlighet (slumpmässig sträng)
PERSONAL_SESSION_SECRET=en-lång-slumpmässig-sträng
```

**Standardvärden för test:**
- `PERSONAL_PASSWORD`: `demo123`
- `PERSONAL_SESSION_SECRET`: `default-session-secret`

### Ändra lösenord
1. Generera ett starkt lösenord
2. Lägg till i `.env`: `PERSONAL_PASSWORD=ditt-nya-lösenord`
3. Starta om servern

---

## Teknisk dokumentation

### Auth-funktioner (`src/lib/auth.ts`)

| Funktion | Beskrivning |
|----------|-------------|
| `arInloggad(cookies)` | Kontrollerar session, förlänger timeout vid aktivitet |
| `loggaIn(cookies)` | Sätter session-cookie |
| `loggaUt(cookies)` | Tar bort session-cookie |
| `valideraLosenord(losenord)` | Kontrollerar lösenord mot .env |

### Sliding Timeout

```
Inloggning kl 09:00 → Session giltig till 10:00
Sidvisning kl 09:30 → Session förlängs till 10:30
Sidvisning kl 10:15 → Session förlängs till 11:15
Ingen aktivitet     → Utloggning efter 1 timme inaktivitet
```

### Säkerhet
- **Cookie-flaggor:** httpOnly, sameSite strict, secure (prod)
- **Robots:** noindex, nofollow på alla /personal/* sidor
- **Validering:** Lösenord valideras server-side

---

## Moduler

### ✅ Dashboard/Översikt (Klar)
Snabbåtkomst till:
- Kopiera länkar (befintlig `/copy-links`)
- Obesvarade frågor (`/admin/obesvarade`)
- Senast redigerade (`/senast-redigerade`)
- Kallelse operation (`/info/kallelse-operation`)

### 📱 SMS-portal (Kommande)
**Baserad på:** `docs/FRAMTIDA-SMS-PORTAL.md`

- Färdiga SMS-mallar organiserade i kategorier
- Klistra in mobilnummer → välj mall → skicka
- Envägs-SMS (patienten kan inte svara)
- Rate limiting (max 30 SMS/timme)

### 🔗 Kopiera länkar (Förbättring planerad)
**Befintlig:** `/copy-links`

Planerade förbättringar:
- Integrera med SMS-portal
- QR-kod för varje länk
- Favorit-länkar

### 📄 Styrdokument (Kommande)
PDF-bibliotek med:
- Interna policyer
- Patientinformation
- Formulär

---

## UI/UX Design

### Layout (Implementerad)

```
┌──────────────────────────────────────────────────────────┐
│  [Logo]         Personalportal              [Logga ut]   │
├────────────┬─────────────────────────────────────────────┤
│            │                                              │
│ Översikt ● │   Välkommen till Personalportalen           │
│ Kopiera    │                                              │
│ SMS ○      │   [Verktyg-kort i grid]                     │
│ Dokument ○ │                                              │
│ ────────   │   [Snabblänkar]                             │
│ Obesvarade │                                              │
│ Senast     │                                              │
│            │                                              │
│ ────────   │                                              │
│ Logga ut   │                                              │
└────────────┴─────────────────────────────────────────────┘
```

### Färgschema
- **Sidebar:** Mörk (`bg-slate-800`, `#1e293b`)
- **Innehåll:** Ljus (`bg-slate-100`, `#f1f5f9`)
- **Kort:** Vit (`bg-white`)
- **Accent:** Sky-blue (`#0284c7`)
- **Ikon-färger:**
  - Blå: Länkar
  - Grön: SMS
  - Lila: Dokument
  - Amber: Obesvarade
  - Orange: Senast redigerade

### Responsivt
- **Desktop (1024px+):** Full layout med sidebar
- **Mobil/Tablet:** Förenklad layout med varning, mobil-nav och utloggning

---

## Implementation - Checklista

### Fas 1: Grundläggande portal ✅
- [x] Kugghjulsikon i header (svenska och engelska menyn)
- [x] Inloggningssida `/personal/`
- [x] Session-hantering med sliding timeout
- [x] Översiktssida `/personal/oversikt`
- [x] Dashboard med verktyg-kort
- [x] Snabblänkar till vanliga sidor
- [x] Länk till befintliga admin-sidor
- [x] Utloggning

### Fas 2: SMS-portal ⏳
- [ ] Skapa Sinch/Twilio-konto
- [ ] Implementera SMS-service
- [ ] Skapa mall-hantering
- [ ] Rate limiting
- [ ] Audit-logg

### Fas 3: Förbättringar ⏳
- [ ] Kopiera länkar med QR-kod
- [ ] PDF-bibliotek för styrdokument
- [ ] Favorit-länkar
- [ ] Individuella användarkonton

---

## Framtida utvidgningar

### Fas 4
- [ ] SMS-statistik och rapporter
- [ ] Schemaläggning av SMS
- [ ] Integration med bokningssystem

### Fas 5
- [ ] Mobilapp (PWA)
- [ ] Push-notifikationer
- [ ] Automatiserade SMS vid bokning

---

## Kostnad

| Komponent | Kostnad |
|-----------|---------|
| Personalportalen | Gratis (del av befintlig site) |
| SMS (Sinch/Twilio) | ~0,50-1,00 kr/SMS |
| Hosting | Inkluderat i Netlify |

**Uppskattad SMS-kostnad:** 
- 20 SMS/dag × 22 arbetsdagar × 0,75 kr = ~330 kr/månad

---

## Relaterade dokument
- `docs/FRAMTIDA-SMS-PORTAL.md` - Detaljerad SMS-specifikation
- `docs/KOPIERA-LANKAR.md` - Befintligt länksystem

---

*Dokumentet uppdaterades 2026-01-19 efter implementation av Fas 1.*
