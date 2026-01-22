# 📱 SMS-portal för patientkommunikation

> ⚠️ **Detta dokument är ersatt av:** [`docs/LANKAR-OCH-SMS.md`](./LANKAR-OCH-SMS.md)

---

## Status: ✅ Implementerat

SMS-funktionaliteten är nu fullt implementerad och integrerad i personalportalen.

**Sida:** `/personal/lankar-sms`

---

## Snabblänkar till dokumentation

| Dokument | Innehåll |
|----------|----------|
| **[LANKAR-OCH-SMS.md](./LANKAR-OCH-SMS.md)** | Fullständig dokumentation av Länkar & SMS-verktyget |
| [ADMIN-PORTAL-DESIGN.md](./ADMIN-PORTAL-DESIGN.md) | Översikt av personalportalen |
| [ANVANDARSYSTEM-PLANERING.md](./ANVANDARSYSTEM-PLANERING.md) | Användarhantering och Supabase |

---

## Kort sammanfattning

### Vad är det?
Ett kombinerat verktyg för att kopiera kortlänkar och skicka SMS till patienter.

### Hur fungerar det?
1. Logga in på personalportalen
2. Gå till "Länkar & SMS"
3. Välj en länk → SMS-panelen fylls i automatiskt
4. Skriv in patientens mobilnummer
5. Klicka "Skicka SMS"

### Tekniskt
- **SMS-leverantör:** 46elks (~0,35 kr/SMS)
- **API-endpoint:** `/api/sms/skicka`
- **Rate limiting:** 30 SMS/timme per användare
- **GDPR:** Inga telefonnummer sparas

---

*Se [LANKAR-OCH-SMS.md](./LANKAR-OCH-SMS.md) för fullständig dokumentation.*
