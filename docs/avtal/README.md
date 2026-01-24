# 📄 Avtal och juridiska dokument

Denna mapp innehåller personuppgiftsbiträdesavtal (DPA/PUB) och andra juridiska dokument relaterade till Kort varsel SMS-systemet.

## Vad ska finnas här?

| Dokument | Leverantör | Status |
|----------|------------|--------|
| `46elks-pub-avtal.pdf` | 46elks | ☐ Ej inhämtat |
| `supabase-dpa.pdf` | Supabase | ☐ Ej inhämtat |
| `netlify-dpa.pdf` | Netlify | ☐ Ej inhämtat |

## Hur man hämtar avtalen

### 46elks (svenskt PUB-avtal)
1. Gå till https://46elks.se/gdpr
2. Ladda ner PUB-avtalet
3. Eller mejla: support@46elks.se

### Supabase (DPA)
1. Logga in på Supabase Dashboard
2. Gå till Settings → Legal
3. Eller mejla: privacy@supabase.io

### Netlify (DPA)
1. Gå till https://www.netlify.com/gdpr-ccpa/
2. Eller mejla: privacy@netlify.com

## Mall för att begära avtal

```
Subject: Request for Data Processing Agreement (DPA)

Hi,

We are using [SERVICE NAME] for our healthcare application 
in Sweden and need to ensure GDPR compliance.

Could you please provide us with:
1. Your Data Processing Agreement (DPA)
2. Information about Standard Contractual Clauses (SCC) 
   for EU-US data transfers

Our organization details:
- Company: Södermalms Ortopedi AB
- Organization number: [Ert org.nr]
- Contact: [Din mejl]

Thank you,
[Ditt namn]
```

## När du fått avtalen

1. Spara PDF:en i denna mapp med tydligt namn
2. Uppdatera statusen i tabellen ovan
3. Notera datum för signering

## Viktigt att kontrollera i avtalen

- [ ] Att leverantören är "personuppgiftsbiträde" (processor)
- [ ] Att det finns SCC för USA-överföringar (Supabase, Netlify)
- [ ] Att säkerhetsåtgärder beskrivs
- [ ] Att datalagringens geografiska plats anges
- [ ] Att det finns rutiner för dataintrång

## Förvaring

Dessa avtal bör också finnas i företagets officiella dokumenthanteringssystem, inte bara här i Git-repot.

---

*Senast uppdaterad: 2026-01-24*
