# 👥 Användarsystem för Personalportalen - Planering

> **Status:** Planering  
> **Senast uppdaterad:** 2026-01-19

---

## Kravspecifikation

### Måste ha
- [ ] Flera användare med egna inloggningar
- [ ] Ändra eget lösenord (via webbgränssnitt)
- [ ] Admin kan skapa/ta bort användare
- [ ] Glömt lösenord-funktion
- [ ] Allt hanteras via webbgränssnitt (ingen kod/terminal)
- [ ] **2FA för admin-konton** ⚠️ (Grok + Gemini rekommenderar)
- [ ] **Rate limiting på SMS** (max 20 SMS/timme per användare)
- [ ] **SSR-mode i Astro** (säkrare än statisk export)

### Bra att ha
- [ ] Audit-logg (vem gjorde vad, när)
- [ ] SMS-statistik per användare
- [ ] Roller (admin vs vanlig personal)
- [ ] 2FA för vanlig personal (valfritt)
- [ ] Inloggningshistorik
- [ ] Magic Links (logga in via e-postlänk)
- [ ] Admin-dashboard med SMS-kostnad

### Viktiga principer
- **Ingen kodberoende:** Allt ska kunna göras via webbläsaren
- **Självbetjäning:** Personal ska kunna återställa eget lösenord
- **Låg kostnad:** Helst gratis eller mycket billigt
- **Enkel underhåll:** Ska fungera utan teknisk kompetens

### GDPR-kritiskt (från Gemini) ⚠️
- **Logga ALDRIG SMS-innehåll** i audit-loggen
- **Logga ALDRIG fullständigt telefonnummer** - max sista 4 siffror för felsökning
- Logga endast: "SMS skickat till [Kategori: Nybesök]"

---

## Alternativ

### 1. 🟢 Netlify Identity (REKOMMENDERAS)

**Vad det är:** Inbyggd användarhantering i Netlify (gratis upp till 5 användare)

**Fördelar:**
- ✅ Gratis för små team (upp till 5 användare)
- ✅ Inbyggt i Netlify (ingen extra hosting)
- ✅ Glömt lösenord via e-post (automatiskt)
- ✅ Användare kan ändra eget lösenord
- ✅ Admin-gränssnitt i Netlify Dashboard
- ✅ Säker (hanteras av Netlify)
- ✅ Ingen databas att underhålla

**Nackdelar:**
- ⚠️ Max 5 användare gratis (sedan $99/månad för 1000)
- ⚠️ Audit-logg kräver egen implementation
- ⚠️ Begränsad anpassning

**Kostnad:** Gratis (5 användare), $99/mån (1000 användare)

**Hur det fungerar:**
1. Aktivera Netlify Identity i Netlify Dashboard
2. Bjud in användare via e-post
3. Användare skapar eget lösenord
4. Glömt lösenord → e-postlänk → nytt lösenord
5. Admin hanterar användare via Netlify Dashboard

**Implementation:**
```javascript
// Inloggning
netlifyIdentity.open('login');

// Kontrollera inloggning
const user = netlifyIdentity.currentUser();

// Logga ut
netlifyIdentity.logout();
```

---

### 2. 🟡 Supabase Auth (Bra alternativ)

**Vad det är:** Gratis backend-as-a-service med inbyggd auth

**Fördelar:**
- ✅ Generös gratis tier (50,000 användare!)
- ✅ Inbyggd användarhantering via dashboard
- ✅ Glömt lösenord via e-post
- ✅ Inbyggd audit-logg
- ✅ Kan lagra SMS-statistik i samma databas
- ✅ Roller och behörigheter

**Nackdelar:**
- ⚠️ Extern tjänst (beroende)
- ⚠️ Lite mer setup
- ⚠️ Data ligger hos Supabase (EU-server finns)

**Kostnad:** Gratis (generöst), $25/mån (Pro)

**Hur det fungerar:**
1. Skapa Supabase-projekt (gratis)
2. Konfigurera auth-inställningar
3. Skapa användare via dashboard eller API
4. Inbyggd "Forgot Password"-funktion
5. Dashboard för användarhantering

**Implementation:**
```javascript
// Inloggning
const { user, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',  // Ersätt med riktig e-post
  password: '********'        // Ersätt med riktigt lösenord
});

// Glömt lösenord
await supabase.auth.resetPasswordForEmail('user@example.com');

// Logga ut
await supabase.auth.signOut();
```

---

### 3. 🟡 Clerk (Premium alternativ)

**Vad det är:** Modern auth-tjänst med fantastiskt UI

**Fördelar:**
- ✅ Fantastiskt användargränssnitt
- ✅ Inbyggd användarhantering
- ✅ Glömt lösenord, 2FA, etc.
- ✅ Mycket säkert
- ✅ Färdiga React/Astro-komponenter

**Nackdelar:**
- ⚠️ Gratis endast 10,000 MAU (monthly active users)
- ⚠️ $25/mån för fler funktioner
- ⚠️ Kan vara overkill för litet team

**Kostnad:** Gratis (10k MAU), $25/mån (Pro)

---

### 4. 🟠 Egen SQLite-lösning

**Vad det är:** Bygg allt själv med SQLite-databas

**Fördelar:**
- ✅ Full kontroll
- ✅ Gratis
- ✅ Ingen extern beroende
- ✅ Kan anpassas exakt

**Nackdelar:**
- ❌ Mycket mer arbete att bygga
- ❌ Säkerhet måste hanteras noggrant
- ❌ Glömt lösenord måste byggas (e-postsystem)
- ❌ Kräver underhåll

**Kostnad:** Gratis (men tid)

**Vad som behöver byggas:**
- Databas-schema för användare
- Lösenords-hashning (bcrypt)
- Session-hantering
- Glömt lösenord-flöde (kräver e-posttjänst)
- Admin-gränssnitt för användarhantering
- Audit-logg

---

## Rekommendation

### För er situation (15 användare): **Supabase** ✅

**Varför:**
1. **Gratis för 50,000 användare** - mer än tillräckligt
2. **Glömt lösenord fungerar** - automatiskt via e-post
3. **Admin-gränssnitt finns** - i Supabase Dashboard
4. **Inbyggd audit-logg** - vem gjorde vad, när
5. **Databas för SMS-statistik** - populäraste mallar, användning per person
6. **EU-servrar** - GDPR-vänligt
7. **Säkert** - hanteras av proffs

**Kostnadsjämförelse för 15 användare:**
| Tjänst | Kostnad/månad |
|--------|---------------|
| Supabase | **$0** (gratis) |
| Netlify Identity | $99 |
| Clerk | $0 (gratis upp till 10k MAU) |

### Så här skulle det fungera med Supabase:

```
┌─────────────────────────────────────────────────────────────┐
│                    ANVÄNDARFLÖDE                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Admin skapar ny användare via Supabase Dashboard         │
│     → Personal får e-post med inbjudan                       │
│                                                              │
│  2. Personal klickar länk och skapar lösenord                │
│     → Konto är aktivt                                        │
│                                                              │
│  3. Personal loggar in på /personal/                         │
│     → Ser personalportalen                                   │
│                                                              │
│  4. Personal glömmer lösenord                                │
│     → Klickar "Glömt lösenord"                              │
│     → Får e-post med återställningslänk (automatiskt!)      │
│     → Skapar nytt lösenord                                  │
│                                                              │
│  5. Admin vill se vem som skickat SMS                        │
│     → Går till Supabase Dashboard → Table Editor            │
│     → Ser audit-loggen med all aktivitet                    │
│                                                              │
│  6. Admin vill ta bort/ändra användare                       │
│     → Går till Supabase Dashboard → Authentication          │
│     → Hanterar användare direkt i webbgränssnitt            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Jämförelsetabell

| Funktion | Netlify Identity | Supabase | Clerk | Egen SQLite |
|----------|-----------------|----------|-------|-------------|
| Gratis användare | 5 | 50,000 | 10,000 | ∞ |
| Glömt lösenord | ✅ Auto | ✅ Auto | ✅ Auto | ❌ Bygg |
| Admin-gränssnitt | ✅ Netlify | ✅ Supabase | ✅ Clerk | ❌ Bygg |
| Audit-logg | ❌ Bygg | ✅ Inbyggd | ✅ Inbyggd | ❌ Bygg |
| Setup-tid | 30 min | 1-2 tim | 1-2 tim | 1-2 dagar |
| Underhåll | Låg | Låg | Låg | Hög |
| Beroende av tjänst | Netlify | Supabase | Clerk | Nej |

---

## Implementation med Netlify Identity

### Steg 1: Aktivera i Netlify Dashboard
1. Gå till Netlify → Site → Identity
2. Klicka "Enable Identity"
3. Under Settings → Registration → "Invite only"
4. Under Settings → External providers → Valfritt (Google, etc.)

### Steg 2: Installera Netlify Identity Widget
```bash
npm install netlify-identity-widget
```

### Steg 3: Uppdatera inloggningssidan
```astro
---
// src/pages/personal/index.astro
---
<html>
<head>
  <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
</head>
<body>
  <div id="login-container">
    <h1>Personalportal</h1>
    <button id="login-btn">Logga in</button>
    <a href="#" id="forgot-password">Glömt lösenord?</a>
  </div>

  <script>
    // Initiera Netlify Identity
    netlifyIdentity.init();
    
    // Logga in-knapp
    document.getElementById('login-btn').onclick = () => {
      netlifyIdentity.open('login');
    };
    
    // Vid lyckad inloggning
    netlifyIdentity.on('login', user => {
      window.location.href = '/personal/oversikt';
    });
    
    // Glömt lösenord
    document.getElementById('forgot-password').onclick = (e) => {
      e.preventDefault();
      const email = prompt('Ange din e-postadress:');
      if (email) {
        // Netlify skickar automatiskt återställningslänk
        fetch('/.netlify/identity/recover', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
        alert('Om kontot finns skickas en återställningslänk till ' + email);
      }
    };
  </script>
</body>
</html>
```

### Steg 4: Skydda sidor
```astro
---
// src/pages/personal/oversikt.astro
---
<script>
  // Kontrollera inloggning
  netlifyIdentity.on('init', user => {
    if (!user) {
      window.location.href = '/personal/';
    }
  });
</script>
```

### Steg 5: Bjud in användare
1. Gå till Netlify Dashboard → Identity → Invite users
2. Ange e-postadress
3. Användaren får inbjudan via e-post
4. Användaren skapar sitt lösenord

---

## Audit-logg (tillägg)

Även med Netlify Identity kan vi bygga en enkel audit-logg:

```javascript
// Vid varje SMS som skickas
async function loggaHandelse(anvandare, typ, detaljer) {
  // Skicka till Netlify Function som sparar till extern databas
  // eller använd Supabase bara för loggning
  await fetch('/.netlify/functions/audit-logg', {
    method: 'POST',
    body: JSON.stringify({
      anvandare: anvandare.email,
      typ: typ, // 'SMS_SKICKAT', 'INLOGGNING', etc.
      detaljer: detaljer,
      tidpunkt: new Date().toISOString()
    })
  });
}
```

---

## SMS-statistik

Med Supabase eller egen databas kan vi spara:

```sql
CREATE TABLE sms_logg (
  id SERIAL PRIMARY KEY,
  anvandare_email TEXT NOT NULL,
  mall_kategori TEXT NOT NULL,
  mall_namn TEXT NOT NULL,
  skickad_vid TIMESTAMP DEFAULT NOW()
  -- OBS: Spara INTE telefonnummer (GDPR)
);

-- Statistik: Mest använda mallar
SELECT mall_namn, COUNT(*) as antal
FROM sms_logg
GROUP BY mall_namn
ORDER BY antal DESC;

-- Statistik: SMS per användare denna månad
SELECT anvandare_email, COUNT(*) as antal
FROM sms_logg
WHERE skickad_vid > NOW() - INTERVAL '30 days'
GROUP BY anvandare_email;
```

---

## Nästa steg (Supabase rekommenderas)

### Fas 1: Grundläggande setup (~2 timmar)
1. [ ] Skapa gratis Supabase-konto på supabase.com
2. [ ] Skapa nytt projekt (välj EU-region för GDPR)
3. [ ] Konfigurera auth-inställningar (e-postmallar på svenska)
4. [ ] Skapa första admin-användaren

### Fas 2: Integration med hemsidan (~4 timmar)
5. [ ] Installera @supabase/supabase-js
6. [ ] Uppdatera inloggningssidan (/personal/)
7. [ ] Skydda alla /personal/*-sidor
8. [ ] Testa inloggning och utloggning

### Fas 3: Audit-logg (~2 timmar)
9. [ ] Skapa databas-tabell för audit-logg
10. [ ] Logga alla SMS som skickas
11. [ ] Skapa vy för statistik i dashboard

### Fas 4: Go-live
12. [ ] Bjud in alla 15 användare
13. [ ] Testa "glömt lösenord"-flödet
14. [ ] Dokumentera för personal

---

## Beslut tagna ✅

1. **Hur många användare behövs?**
   - ✅ **15 användare** → Supabase (gratis)

2. **Behövs audit-logg?**
   - ✅ **Ja** → Ingår i Supabase

3. **Behövs SMS-statistik?**
   - ✅ **Ja** → Ingår i Supabase

4. **Budget?**
   - ✅ **$0/månad** med Supabase

---

## Supabase - Detaljerad Implementation

### Skapa projekt

1. Gå till [supabase.com](https://supabase.com) → "Start your project"
2. Logga in med GitHub (rekommenderas)
3. Klicka "New project"
4. **Organization:** Skapa ny eller välj befintlig
5. **Project name:** `axelspecialist-personal`
6. **Database password:** Skapa starkt lösenord (spara!)
7. **Region:** `eu-central-1` (Frankfurt) för GDPR
8. Klicka "Create new project" (tar ~2 min)

### Konfigurera Auth

1. Gå till **Authentication** → **Settings**
2. Under **Email**:
   - ✅ Enable email signups
   - ✅ Confirm email (för säkerhet)
   - ✅ **Enable Magic Links** (Gemini-förslag: eliminerar "glömt lösenord"-support)
3. Under **Multi-Factor Authentication** (Grok-förslag):
   - ✅ Enable MFA (TOTP)
   - Aktivera för admin-konton via app_metadata
4. Under **Email Templates** (svenska):

**Confirm signup:**
```
Välkommen till Personalportalen!

Klicka här för att bekräfta din e-post:
{{ .ConfirmationURL }}

/Axelspecialisten
```

**Reset password:**
```
Återställ ditt lösenord

Klicka här för att välja nytt lösenord:
{{ .ConfirmationURL }}

Länken är giltig i 24 timmar.

/Axelspecialisten
```

### Databas-schema för audit-logg

Kör i Supabase SQL Editor:

```sql
-- ============================================
-- TABELL: Audit-logg (förbättrad med Grok/Gemini-feedback)
-- ============================================
CREATE TABLE audit_logg (
  id BIGSERIAL PRIMARY KEY,
  anvandare_id UUID REFERENCES auth.users(id),
  anvandare_email TEXT NOT NULL,
  handelse_typ TEXT NOT NULL,
  detaljer JSONB,
  ip_adress TEXT,                    -- Grok: Lägg till för spårning
  user_agent TEXT,                   -- Grok: Lägg till för spårning
  skapad_vid TIMESTAMPTZ DEFAULT NOW()
);

-- Index för snabba sökningar
CREATE INDEX idx_audit_anvandare ON audit_logg(anvandare_email);
CREATE INDEX idx_audit_typ ON audit_logg(handelse_typ);
CREATE INDEX idx_audit_datum ON audit_logg(skapad_vid);

-- Row Level Security (säkerhet)
ALTER TABLE audit_logg ENABLE ROW LEVEL SECURITY;

-- Endast admin kan läsa loggen
CREATE POLICY "Admin kan läsa logg" ON audit_logg
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- Alla inloggade kan skriva (för sin egen aktivitet)
CREATE POLICY "Inloggade kan logga" ON audit_logg
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- KRITISKT (Gemini): Ingen kan radera sina egna loggar!
CREATE POLICY "Ingen kan radera logg" ON audit_logg
  FOR DELETE USING (false);

-- ============================================
-- TABELL: SMS-statistik (GDPR-säker)
-- ============================================
CREATE TABLE sms_statistik (
  id BIGSERIAL PRIMARY KEY,
  anvandare_id UUID REFERENCES auth.users(id),
  mall_kategori TEXT NOT NULL,
  mall_namn TEXT NOT NULL,
  -- GDPR: Endast sista 4 siffrorna för felsökning
  mottagare_suffix TEXT,             -- T.ex. "**67" (sista 2 siffror)
  skickad_vid TIMESTAMPTZ DEFAULT NOW()
  -- OBS: Lagra ALDRIG fullständigt telefonnummer!
);

-- RLS för SMS-statistik
ALTER TABLE sms_statistik ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personal ser egen statistik" ON sms_statistik
  FOR SELECT USING (auth.uid() = anvandare_id);

CREATE POLICY "Admin ser all statistik" ON sms_statistik
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- ============================================
-- TABELL: Rate limiting (Gemini-förslag)
-- ============================================
CREATE TABLE sms_rate_limit (
  id BIGSERIAL PRIMARY KEY,
  anvandare_id UUID REFERENCES auth.users(id) NOT NULL,
  skickad_vid TIMESTAMPTZ DEFAULT NOW()
);

-- Funktion för att kontrollera rate limit
CREATE OR REPLACE FUNCTION kontrollera_rate_limit(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  antal_sms INTEGER;
BEGIN
  SELECT COUNT(*) INTO antal_sms
  FROM sms_rate_limit
  WHERE anvandare_id = user_id
    AND skickad_vid > NOW() - INTERVAL '1 hour';
  
  RETURN antal_sms < 20;  -- Max 20 SMS per timme
END;
$$ LANGUAGE plpgsql;

-- Rensa gamla rate limit-poster (kör dagligen via cron)
CREATE OR REPLACE FUNCTION rensa_rate_limit()
RETURNS void AS $$
BEGIN
  DELETE FROM sms_rate_limit WHERE skickad_vid < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VYER: Statistik
-- ============================================

-- Vy för populäraste mallar (Admin-dashboard)
CREATE VIEW populara_mallar AS
SELECT 
  mall_namn,
  mall_kategori,
  COUNT(*) as antal,
  MAX(skickad_vid) as senast_anvand
FROM sms_statistik
GROUP BY mall_namn, mall_kategori
ORDER BY antal DESC
LIMIT 10;

-- Vy för användning per person
CREATE VIEW anvandning_per_person AS
SELECT 
  u.email,
  COUNT(s.id) as antal_sms,
  MAX(s.skickad_vid) as senast_aktivitet
FROM auth.users u
LEFT JOIN sms_statistik s ON u.id = s.anvandare_id
GROUP BY u.email
ORDER BY antal_sms DESC;

-- Vy för SMS denna månad (kostnadskontroll)
CREATE VIEW sms_denna_manad AS
SELECT 
  COUNT(*) as antal_sms,
  COUNT(*) * 0.50 as uppskattad_kostnad_kr  -- ~0.50 kr/SMS
FROM sms_statistik
WHERE skickad_vid > DATE_TRUNC('month', NOW());
```

### Integration med Astro

**Installera:**
```bash
npm install @supabase/supabase-js
```

**Skapa klient (src/lib/supabase.ts):**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**.env:**
```
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx...  # Spara säkert!
```

**astro.config.mjs (Gemini: använd SSR-mode):**
```javascript
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

export default defineConfig({
  output: 'server',  // KRITISKT: SSR för säker auth
  adapter: netlify(),
});
```

**Middleware för behörighet (src/middleware.ts) - Gemini-förslag:**
```typescript
import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

export const onRequest = defineMiddleware(async (context, next) => {
  // Skydda alla /personal/-sidor utom inloggningssidan
  if (context.url.pathname.startsWith('/personal') && 
      context.url.pathname !== '/personal/' &&
      context.url.pathname !== '/personal/login') {
    
    // Hämta session från cookie
    const accessToken = context.cookies.get('sb-access-token')?.value;
    
    if (!accessToken) {
      return context.redirect('/personal/');
    }
    
    // Verifiera token
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return context.redirect('/personal/');
    }
    
    // Lägg till user i context för sidorna
    context.locals.user = user;
  }
  
  return next();
});
```

> **Gemini:** "Detta garanterar att ingen sida under /personal kan nås utan giltig session, oavsett om man glömt lägga till scriptet på en ny sida."

**Inloggningssida (src/pages/personal/index.astro):**
```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
---

<BaseLayout title="Personalportal - Logga in">
  <main class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
      <h1 class="text-2xl font-bold text-center mb-6">Personalportal</h1>
      
      <form id="login-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">E-postadress</label>
          <input type="email" id="email" required
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">Lösenord</label>
          <input type="password" id="password" required
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
        </div>
        
        <button type="submit"
          class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
          Logga in
        </button>
      </form>
      
      <button id="forgot-btn" class="w-full mt-4 text-blue-600 hover:underline">
        Glömt lösenord?
      </button>
      
      <div id="message" class="mt-4 text-center hidden"></div>
    </div>
  </main>
</BaseLayout>

<script>
  import { supabase } from '../../lib/supabase';
  
  const form = document.getElementById('login-form');
  const forgotBtn = document.getElementById('forgot-btn');
  const messageDiv = document.getElementById('message');
  
  // Logga in
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      showMessage('Fel e-post eller lösenord', 'error');
    } else {
      // Logga inloggning
      await supabase.from('audit_logg').insert({
        anvandare_id: data.user?.id,
        anvandare_email: email,
        handelse_typ: 'INLOGGNING'
      });
      
      window.location.href = '/personal/oversikt';
    }
  });
  
  // Glömt lösenord
  forgotBtn?.addEventListener('click', async () => {
    const email = prompt('Ange din e-postadress:');
    if (!email) return;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/personal/aterstall-losenord'
    });
    
    if (error) {
      showMessage('Kunde inte skicka återställningslänk', 'error');
    } else {
      showMessage('Om kontot finns skickas en länk till ' + email, 'success');
    }
  });
  
  function showMessage(text: string, type: 'error' | 'success') {
    messageDiv.textContent = text;
    messageDiv.className = 'mt-4 text-center p-3 rounded ' + 
      (type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700');
    messageDiv.classList.remove('hidden');
  }
</script>
```

### Skapa admin-användare

1. Gå till Supabase Dashboard → **Authentication** → **Users**
2. Klicka **Add user** → **Send invitation**
3. Ange e-postadress
4. Användaren får e-post och skapar sitt lösenord

### Hantera användare (utan kod!)

**Allt sköts i Supabase Dashboard:**

| Uppgift | Var |
|---------|-----|
| Skapa ny användare | Authentication → Users → Add user |
| Ta bort användare | Authentication → Users → ... → Delete |
| Se alla användare | Authentication → Users |
| Se audit-logg | Table Editor → audit_logg |
| Se SMS-statistik | Table Editor → populara_mallar |
| Ändra e-postmallar | Authentication → Settings → Email Templates |

---

## 🤖 AI-feedback sammanfattning

### Granskad av:
- **Grok (xAI)** - 2026-01-19
- **Gemini (Google)** - 2026-01-19
- **Claude Opus 4.5 (Anthropic)** - 2026-01-19 (ursprunglig plan)

### Implementerade förbättringar:

| Förslag | Källa | Status |
|---------|-------|--------|
| 2FA för admin-konton | Grok + Gemini | ✅ Lagt till |
| IP-adress + user-agent i audit-logg | Grok | ✅ Lagt till |
| Ingen kan radera egna loggar (RLS) | Gemini | ✅ Lagt till |
| Rate limiting på databasnivå | Gemini | ✅ Lagt till |
| SSR-mode i Astro | Gemini | ✅ Lagt till |
| Middleware för behörighet | Gemini | ✅ Lagt till |
| Magic Links som alternativ | Gemini | ✅ Lagt till |
| GDPR: Logga ej fullständigt nummer | Gemini | ✅ Lagt till |
| SMS-kostnad i dashboard | Gemini | ✅ Lagt till |
| Topp 10 mallar-vy | Gemini | ✅ Lagt till |

### Ytterligare rekommendationer (för framtiden):

**Från Grok:**
- Koppla egen e-postdomän via Resend/SendGrid för bättre deliverability
- Lägg till HSTS-header
- Ladda ner Supabase-backup manuellt månadsvis
- Skapa "Instruktion för ny personal"-dokument

**Från Gemini:**
- Visa SMS-saldo/kostnad i admin-dashboard om API-koppling finns
- Session lifetime: 8 timmar + "remember me"-option

---

## Backup och säkerhet

### Säkerhetskopior
- Supabase har **automatiska dagliga backups** (gratis tier)
- Ladda ner manuellt månadsvis som extra säkerhet
- Spara project URL + anon key + service_role key i 1Password eller liknande

### Nycklar att spara säkert
```
SUPABASE_PROJECT_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx...  # HEMLIG - endast backend!
DATABASE_PASSWORD=xxxxxxxx
```

---

## Dokumentation för personal

### Skapa: "Så använder du personalportalen"

1. **Gå till:** axelspecialisten.se/personal/
2. **Logga in:** Ange din e-post och lösenord
3. **Glömt lösenord?** Klicka länken → ange e-post → kolla din inbox
4. **Magic Link:** Du kan även få en inloggningslänk skickad till din e-post
5. **Utloggning:** Sker automatiskt efter 8 timmar eller manuellt via knappen

### För admin:
1. Hantera användare: supabase.com → Ditt projekt → Authentication → Users
2. Se audit-logg: supabase.com → Table Editor → audit_logg
3. Se SMS-statistik: supabase.com → Table Editor → populara_mallar

---

*Dokumentet skapades 2026-01-19 som planering för användarsystem.*  
*Uppdaterat 2026-01-19: Ändrad rekommendation till Supabase (15 användare).*  
*Uppdaterat 2026-01-19: Feedback från Grok och Gemini integrerad.*
