# 🔧 Miljökonfiguration

> Kopiera variablerna nedan till `.env` eller `.env.local` i projektroten.

## ✅ Nuvarande läge

Projektet använder i dagsläget:

- Supabase för datalager och API-data
- 46elks för SMS
- sessionscookies för personalinloggning
- AI-nycklar för AI Council-funktioner

---

## 🚀 Snabbstart (lokalt)

1. Hämta variabler från Netlify (**Site settings → Environment variables**)
2. Klistra in i `.env.local`
3. Starta om utvecklingsservern:

```bash
npm run dev
```

---

## 🔐 Kärnvariabler (personalportal)

```bash
# Delat personal-lösenord (nuvarande inloggningsläge)
PERSONAL_PASSWORD=byt-till-ett-starkt-losenord

# Session-secret för cookies (minst 32 tecken)
PERSONAL_SESSION_SECRET=slumpmassig-hemlig-strang

# Site URL (utan trailing slash)
SITE=https://sodermalmsortopedi.se
PUBLIC_SITE_URL=https://sodermalmsortopedi.se
```

---

## 🗄️ Supabase

```bash
# Frontend
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Backend (hemlig)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Används bland annat av:

- `/api/personal/kort-lankar`
- `/personal/lankar-sms`
- AI Council-sessioner/profiler

---

## 📱 SMS (46elks)

```bash
ELKS_API_USER=xxxxxxxx
ELKS_API_PASSWORD=xxxxxxxx
```

Används av:

- `/api/sms/skicka`
- kampanj- och kort-varsel-endpoints

---

## 🧠 AI Council (valfritt men rekommenderat)

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...
XAI_API_KEY=xai-...
SERPAPI_KEY=...
```

---

## 🧰 Övriga nycklar i projektet

```bash
POOL_ENCRYPTION_KEY=...
ZOTERO_ENCRYPTION_KEY=...
```

---

## Felsökning

- **"Inga API-nycklar konfigurerade"**: kontrollera att `.env.local` är laddad och servern är omstartad
- **Supabase 401/403**: verifiera att rätt `anon` respektive `service_role`-nyckel används
- **SMS ej tillgängligt**: verifiera `ELKS_API_USER` och `ELKS_API_PASSWORD`

---

*Se även `docs/LANKAR-OCH-SMS.md` och `docs/ANVANDARSYSTEM-PLANERING.md`.*
