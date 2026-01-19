# 🔧 Miljövariabler för Personalportalen

> Kopiera variablerna nedan till din `.env`-fil i projektroten.

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
