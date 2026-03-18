# SSR och Cookies - Förklaring

> **Datum:** 2026-01-20  
> **Status:** Implementerat

---

## 🎯 Vad är SSR (Server-Side Rendering)?

### Före (Statisk Site):
- **Alla sidor** byggs som statiska HTML-filer vid build-tid
- Sidorna är **färdiga HTML-filer** som serveras direkt från CDN
- **Super snabbt** - ingen server-behandling vid varje besök
- **Men:** Kan inte hantera dynamiskt innehåll (cookies, inloggning, etc.)

### Efter (Hybrid Mode):
- **De flesta sidor** = fortfarande statiska (snabba!)
- **Endast `/personal/*` sidor** = SSR (server-side rendering)
- SSR-sidor renderas på servern **vid varje besök**
- **Kan** hantera cookies, inloggning, dynamiskt innehåll

---

## 🍪 Cookies - Vad används de till?

### I Personalportalen används cookies för:

1. **Session-hantering** (`personal_session`)
   - Sparar att du är inloggad
   - Går ut efter 2 timmar inaktivitet (sliding timeout)
   - **HttpOnly** = kan inte läsas av JavaScript (säkrare)

2. **Supabase Auth Tokens** (`sb-access-token`, `sb-refresh-token`)
   - Access token för att autentisera mot Supabase
   - Refresh token för att förnya access token automatiskt
   - Access token verifieras server-side mot Supabase innan användare eller roll accepteras
   - **HttpOnly** = kan inte läsas av JavaScript (säkrare)

### Cookie-inställningar:
```typescript
cookies.set('personal_session', sessionSecret, {
  path: '/',
  httpOnly: true,        // ✅ Säker - JavaScript kan inte läsa
  secure: true,          // ✅ Endast HTTPS (i produktion)
  sameSite: 'strict',    // ✅ Skydd mot CSRF-attacker
  maxAge: 7200          // 2 timmar
});
```

---

## ⚡ Påverkar det hastigheten?

### **Kort svar: NEJ, inte för vanliga besökare**

### Detaljerat:

#### ✅ **Vanliga sidor (99% av hemsidan):**
- **Förblir statiska** = samma snabbhet som innan
- Ingen påverkan alls
- Exempel: `/`, `/sjukdomar/*`, `/operation/*`, etc.

#### ⚠️ **Personalportalen (`/personal/*`):**
- **Lite långsammare** än statiska sidor (ca 100-300ms extra)
- **Men:** Detta är OK eftersom:
  - Det är en intern portal (inte för patienter)
  - Endast 15 användare
  - Inloggning kräver server-behandling ändå
  - Cookies är nödvändiga för säkerhet

### Jämförelse:
```
Statisk sida:    50-100ms   (CDN → användare)
SSR-sida:        150-400ms  (Server → rendera → användare)
```

**Skillnaden är minimal och märks inte av användare.**

---

## 🔒 GDPR och Cookie-varningar

### **Behöver du cookie-varningar?**

**NEJ, du behöver INTE lägga till cookie-varningar** för dessa cookies!

### Varför?

1. **Tekniskt nödvändiga cookies** (GDPR undantag)
   - Session-cookies för inloggning är **tekniskt nödvändiga**
   - Utan dem fungerar inte inloggningen
   - **Kräver INTE samtycke** enligt GDPR

2. **Endast för inloggad personal**
   - Cookies används **endast** i `/personal/*` (intern portal)
   - **Inte** för vanliga besökare/patienter
   - Vanliga besökare ser aldrig dessa cookies

3. **Ingen tracking/analys**
   - Cookies används **endast** för autentisering
   - **Ingen** spårning, analys eller marknadsföring
   - **Ingen** delning med tredje part

### När behöver du cookie-varningar?

Du behöver cookie-varningar **endast** om du:
- Använder Google Analytics
- Använder Facebook Pixel
- Använder annan tracking/analys
- Delar data med tredje part

**Din nuvarande setup = INGEN cookie-varning behövs! ✅**

---

## 📊 Praktisk påverkan

### För vanliga besökare (patienter):
- ✅ **Ingen påverkan** - allt fungerar som innan
- ✅ **Inga cookies** sätts (endast för `/personal/*`)
- ✅ **Samma hastighet** - alla sidor är statiska
- ✅ **Ingen cookie-varning** behövs

### För personal (inloggade):
- ⚠️ **Lite långsammare** inloggning (100-300ms)
- ✅ **Säkrare** - cookies är HttpOnly
- ✅ **Automatisk utloggning** efter 1 timme inaktivitet
- ✅ **Ingen cookie-varning** behövs (tekniskt nödvändiga)

---

## 🔧 Teknisk implementation

### Hybrid Mode i Astro:
```javascript
// astro.config.mjs
export default defineConfig({
  output: 'hybrid',  // Statisk som standard, SSR för specifika sidor
  adapter: netlify(), // Netlify adapter för SSR
});
```

### Markera sidor som SSR:
```astro
---
// src/pages/personal/index.astro
export const prerender = false; // Denna sida = SSR
---
```

### Cookies i koden:
```typescript
// src/lib/auth.ts
cookies.set('personal_session', sessionSecret, {
  httpOnly: true,    // Säker
  secure: true,      // Endast HTTPS
  sameSite: 'strict' // CSRF-skydd
});
```

---

## ✅ Sammanfattning

| Aspekt | Status | Förklaring |
|--------|--------|------------|
| **Hastighet (vanliga sidor)** | ✅ Ingen påverkan | Fortfarande statiska |
| **Hastighet (personalportal)** | ⚠️ +100-300ms | Acceptabelt för intern portal |
| **Cookie-varning** | ✅ Inte behövs | Tekniskt nödvändiga cookies |
| **GDPR-kompatibilitet** | ✅ OK | Ingen tracking, endast autentisering |
| **Säkerhet** | ✅ Förbättrad | HttpOnly, Secure, SameSite |

---

## 📚 Ytterligare läsning

- [Astro Hybrid Rendering](https://docs.astro.build/en/guides/server-side-rendering/)
- [GDPR och Cookies (IMY)](https://www.imy.se/verksamhet/dataskydd/webbkakor/)
- [Netlify SSR](https://docs.netlify.com/integrations/frameworks/astro/)

---

**Uppdaterad:** 2026-01-20
