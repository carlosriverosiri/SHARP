# 🔧 Miljövariabler för Personalportalen

> Kopiera variablerna nedan till din `.env.local`-fil i projektroten.

## 🚀 Snabbstart för lokal utveckling

### Steg 1: Hämta värden från Netlify

1. Gå till [Netlify Dashboard](https://app.netlify.com)
2. Välj ditt projekt
3. Gå till **Site settings** → **Environment variables**
4. Kopiera följande variabler:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PERSONAL_SESSION_SECRET`
   - `SITE`

### Steg 2: Skapa `.env.local`-fil

```bash
# I projektroten
cp .env.example .env.local
```

### Steg 3: Fyll i värdena

Öppna `.env.local` och klistra in värdena från Netlify.

### Steg 4: Starta om dev-servern

```bash
npm run dev
```

---

## 📝 Alternativ: Hämta från Supabase direkt

Om du vill hämta värdena direkt från Supabase:

1. Gå till [Supabase Dashboard](https://app.supabase.com)
2. Välj ditt projekt
3. Gå till **Settings** → **API**
4. Kopiera:
   - **Project URL** → `PUBLIC_SUPABASE_URL`
   - **anon public** key → `PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ HEMLIG!)

---

## Enkelt läge (nuvarande)

```bash
# Delat lösenord för all personal
PERSONAL_PASSWORD=byt-till-ett-starkt-losenord

# Hemlig nyckel för session-cookies
# Generera med: openssl rand -hex 32
PERSONAL_SESSION_SECRET=en-lang-slumpmassig-strang-minst-32-tecken
```

---

## Supabase-läge (framtid)

```bash
# Sätt till 'true' för att aktivera Supabase-autentisering
USE_SUPABASE_AUTH=false

# Supabase Project URL (från Supabase Dashboard → Settings → API)
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# Supabase Anon Key (publik, kan exponeras i frontend)
PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx...

# Supabase Service Role Key (HEMLIG! Endast backend)
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx...
```

---

## Site URL

```bash
# Din webbplats URL (utan avslutande /)
SITE=https://axelspecialisten.se
```

---

## SMS-portal (framtid)

```bash
# Sinch API-nycklar (eller Twilio)
SINCH_SERVICE_PLAN_ID=xxxxx
SINCH_API_TOKEN=xxxxx
SINCH_SENDER_NUMBER=+46xxxxxxxxx
```

---

## Aktivera Supabase

1. Skapa Supabase-projekt på supabase.com
2. Hämta URL och nycklar från Settings → API
3. Sätt `USE_SUPABASE_AUTH=true` i `.env`
4. Kör SQL-schemat i `docs/SUPABASE-SCHEMA.sql`
5. Starta om dev-servern

---

*Se `docs/ANVANDARSYSTEM-PLANERING.md` för fullständig dokumentation.*
