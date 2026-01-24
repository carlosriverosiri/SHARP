# 🗄️ Supabase Databasschema

Denna mapp innehåller alla SQL-filer för Supabase-databasen.

## Struktur

```
supabase/
├── README.md                    # Denna fil
├── schema.sql                   # Komplett schema (alla tabeller)
└── migrations/
    ├── 001-initial-setup.sql    # Audit, SMS-statistik, rate limiting
    ├── 002-kort-varsel.sql      # Kort varsel SMS-kampanjer
    ├── 003-lakare.sql           # Läkare-funktionalitet
    ├── 004-profilbilder.sql     # Profilbilder för personal
    ├── 005-prioritet.sql        # Prioritetsfält (akut, ont, sjukskriven)
    └── 006-operationsstorlek.sql # Op-storlek, läkare[], sida (HÖ/VÄ)
```

## Hur man kör migrations

### Första gången (nytt projekt)
Kör `schema.sql` som innehåller allt.

### Befintligt projekt
Kör endast de migrations du saknar, i nummerordning.

### Steg-för-steg
1. Gå till **Supabase Dashboard** → **SQL Editor**
2. Klicka **New query**
3. Klistra in SQL-koden
4. Klicka **Run**
5. Verifiera i **Table Editor** att tabellerna skapades

## Tabeller (översikt)

### Generella
| Tabell | Beskrivning |
|--------|-------------|
| `profiles` | Personalprofiler (kopplat till auth.users) |
| `audit_logg` | Spårning av alla händelser |
| `sms_statistik` | SMS-användningsstatistik |
| `sms_rate_limit` | Förhindrar SMS-missbruk |
| `sms_mallar` | Fördefinierade SMS-mallar |
| `resurser` | Dokument, länkar, instruktionsvideor |
| `lakare` | Lista av läkare |

### Kort varsel SMS
| Tabell | Beskrivning |
|--------|-------------|
| `sms_kampanjer` | Kampanjer för lediga operationstider |
| `sms_kampanj_mottagare` | Patienter som får SMS i kampanj |
| `sms_kampanj_notifieringar` | Personal som ska notifieras |
| `kort_varsel_patienter` | Persistent patientpool |

## Prioritetsfält (nytt!)

Patienter i poolen har prioritetsfält som påverkar SMS-intervall:

| Fält | Intervall | Beskrivning |
|------|-----------|-------------|
| `akut` | 60 min | Måste opereras snarast, sitter standby |
| `sjukskriven` | 30 min | Sjukskriven, hög prioritet |
| `har_ont` | 20 min | Mycket starka smärtor |
| (normal) | 10 min | Standardintervall |

Vid kampanjskapande sorteras patienter automatiskt: **akut → sjukskriven → ont → normal**

## GDPR

- Telefonnummer krypteras med AES-256
- Auto-radering av patienter efter utgångsdatum
- Endast hashade nummer sparas permanent

## Miljövariabler

```env
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
POOL_ENCRYPTION_KEY=din-hemliga-nyckel-32-bytes
```

---

*Senast uppdaterad: 2026-01-24*
