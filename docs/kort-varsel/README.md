# Kort varsel-SMS: Dokumentation

> System för att fylla avbokade operationstider via SMS-utskick

**Utbrytning / extern AI:** Allt i **en** fil (denna README + `MASTER.md` + del 1–7) finns i [MASTER-DOCUMENT.md](./MASTER-DOCUMENT.md). Bygg om med (från repo-rot): `powershell -ExecutionPolicy Bypass -File docs/kort-varsel/build-master-document.ps1` (eller `pwsh` om du har PowerShell 7).

---

## Innehåll

| # | Dokument | Beskrivning |
|---|----------|-------------|
| 1 | [Teknisk dokumentation](./01-TEKNISK.md) | Huvuddokumentation - arkitektur, API:er, prioriteringslogik |
| 2 | [Statistik](./02-STATISTIK.md) | Statistikfunktionen - svarstider, trender, dashboard |
| 3 | [Prediktion](./03-PREDIKTION.md) | Prediktionssystem - beräkna chans att fylla utskick |
| 4 | [GDPR](./04-GDPR.md) | GDPR-compliance, 46elks, IMY-kommunikation |
| 5 | [Open Source](./05-OPEN-SOURCE.md) | Plan för att göra systemet tillgängligt som öppen källkod |
| 6 | [Vision](./06-VISION.md) | Kommersiell vision och långsiktig roadmap |
| 7 | [AI-förberedelse](./07-AI-FORBEREDELSE.md) | Datasamling och schema för framtida ML/AI-integration |

---

## Snabbstart

### Vad är Kort varsel-SMS?

Ett system som automatiskt kontaktar patienter på väntelistan när operationstider blir lediga. Patienter får SMS och kan svara JA/NEJ via en enkel webbsida.

### Flöde

```
1. Tid blir ledig → Personal skapar SMS-utskick
2. System skickar SMS i prioritetsordning (AKUT → Sjukskriven → Ont → Normal)
3. Patient klickar länk → Svarar JA/NEJ
4. Personal ringer JA-svar → Bokar tiden
5. Utskick avslutas automatiskt eller manuellt
```

### Prioriteringsordning

1. 🚨 **AKUT** - Måste opereras snarast
2. 📋 **Sjukskriven** - Väntar på att återgå i arbete
3. 🔥 **Mycket ont** - Hög smärtnivå
4. 👴 **Pensionär (67+)** - Flexibla tider
5. ⏰ **Normal** - Standardprioritering

### Smart intervall

Tid mellan SMS anpassas automatiskt baserat på:
- Dagar till operation (längre tid → längre intervall)
- Tid på dagen (närmare 16:00 → kortare intervall)
- Manuell justering möjlig

---

## Teknisk stack

| Komponent | Teknologi |
|-----------|-----------|
| Frontend | Astro + Tailwind CSS |
| Backend | Astro API Routes |
| Databas | Supabase (PostgreSQL) |
| SMS | 46elks |
| Hosting | Netlify |
| Grafer | Chart.js |

---

## Relaterade filer i kodbasen

```
src/pages/personal/kort-varsel.astro   # Huvudsidan för personal
src/pages/s/[kod].astro                 # Patientens svarssida
src/pages/api/kampanj/                  # API-endpoints för utskick
src/pages/api/pool/                     # API-endpoints för patientpool
src/pages/api/statistik/                # API-endpoints för statistik
src/pages/om-oss/kort-varsel-demo.astro # Offentlig demosida
supabase/migrations/                    # Databasschema
```

---

## Status

- ✅ Patientpool med prioritering
- ✅ SMS-utskick med gradvis eskalering
- ✅ Svarshantering (JA/NEJ/STOPP)
- ✅ Smart intervall-logik
- ✅ Statistik och dashboard
- ✅ Trendanalys
- ✅ AI-förberedelse (datasamling aktiv)
- 📋 Regelbaserad prediktion (planerad, kräver 500+ datapunkter)
- 📋 ML-modell (planerad, kräver 2000+ datapunkter)
- 📋 Open source-release (planerad)
