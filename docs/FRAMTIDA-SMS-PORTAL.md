# 📱 Framtida SMS-portal för patientkommunikation

> **Status:** Planerad / Framtida projekt  
> **Senast uppdaterad:** 2026-01-07

---

## Bakgrund och syfte

Personalen får ofta administrativa frågor per telefon om t.ex.:
- Sjukskrivningspolicy
- Läkemedelsförskrivningspolicy  
- Receptförnyelse
- Väntetider och remisshantering

Istället för att förklara eller copy-pasta långa webbadresser ska personalen kunna:
1. Ha SMS-portalen öppen i en flik
2. Välja rätt mall från en lista
3. Klistra in patientens mobilnummer
4. Klicka "Skicka"

**Viktigt:** Envägs-SMS – patienten kan INTE svara.
När jag kör kommandot "close folder" så får jag upp det här. Jag klickar på "save all", men ingenting händer.
---

## Prompt för att generera SMS-portalen

```
Skapa en säker webbapplikation för att skicka envägs-SMS till patienter med förinställda mallar.

## ANVÄNDNINGSFALL
Mottagningspersonal ska snabbt kunna skicka SMS med färdiga mallar som hänvisar till information på klinikens hemsida. Personalen ska bara behöva:
1. Välja mall från dropdown
2. Klistra in mobilnummer
3. Klicka skicka

Patienten ska INTE kunna svara på SMS:et (envägs-kommunikation).

## TEKNISK STACK
- Backend: Flask (Python 3.11+)
- Frontend: Bootstrap 5 + vanilla JavaScript
- Databas: SQLite (endast för mallar och audit-logg, INTE patientdata)
- SMS-API: Sinch (primär) eller Twilio (fallback)
- Autentisering: Flask-Login med bcrypt för lösenord

## KÄRNFUNKTIONALITET

### 1. Inloggning (OBLIGATORISK)
- Enkel inloggningssida med användarnamn + lösenord
- Hårdkodad admin-användare i första version (konfigurerbar via .env)
- Möjlighet att lägga till fler användare (personal)
- Session timeout efter 30 minuter inaktivitet
- Logga ut-knapp synlig på alla sidor

### 2. Startsida - SMS-sändning (efter inloggning)
Layout i två kolumner:
Jag antar att jag måste logga ut från det projekt jag skriver på nu innan jag kan börja med ett nytt projekt. Och hur gör jag då? Ska jag börja från början? Ska jag bara stänga det här projektet som jag jobbar med nu?
**Vänster kolumn - Mallkategorier:**
- Accordion/lista med kategorier:
  - "Policyer & regler"
  - "Inför besök"
  - "Efter besök"
  - "Administrativa frågor"
- Klick på kategori visar tillhörande mallar
- Klick på mall fyller i textfältet

**Höger kolumn - Skicka SMS:**
- Fält för mobilnummer (+46XXXXXXXXX)
- Förhandsgranskningsruta med vald mall
- Teckenräknare (varning vid >160 tecken)
- "Skicka SMS"-knapp
- Bekräftelsemeddelande efter sändning

### 3. Mallhantering (admin)
- Lista alla mallar grupperade per kategori
- Skapa/redigera/ta bort mallar
- Varje mall har:
  - Kategori (dropdown)
  - Rubrik (för personalen)
  - Meddelandetext (det som skickas)
  - Länk till hemsida (valfri, läggs till automatiskt i meddelandet)

### 4. Säkerhetsbegränsningar
- Rate limiting: Max 30 SMS per användare per timme
- Visa återstående kvot på startsidan
- Blockera sändning om kvoten överskrids
- Validera svenskt mobilnummer innan sändning

### 5. Audit-loggning (GDPR-kompatibel)
Logga till SQLite-tabell (UTAN persondata):
- Tidpunkt
- Vilken användare (personal) som skickade
- Vilken mallkategori/typ
- Status (skickat/misslyckat)
- FEL: telefonnummer, meddelandetext

### 6. Felhantering
- Tydliga svenska felmeddelanden
- "Ogiltigt telefonnummer - ange format +46XXXXXXXXX"
- "Du har överskridit SMS-kvoten, vänta till nästa timme"
- "SMS kunde inte skickas - kontrollera API-inställningar"

## EXEMPELMALLAR (förinstallerade)

### Kategori: Policyer & regler
1. **Receptpolicy**
   "Hej! Info om vår receptpolicy och läkemedelsförskrivning finns här: sodermalmsortopedi.se/info/recept-policy /Södermalms Ortopedi"

2. **Sjukskrivningspolicy**  
   "Hej! Info om sjukskrivning och vad som gäller finns här: [LÄNK] /Södermalms Ortopedi"

### Kategori: Inför besök
3. **Förberedelser inför operation**
   "Hej! Viktig info inför din operation: sodermalmsortopedi.se/info/kallelse-operation /Södermalms Ortopedi"

4. **Hitta till oss**
   "Hej! Här finns vägbeskrivning och info om parkering: [LÄNK] /Södermalms Ortopedi"

### Kategori: Efter besök
5. **Rehab-övningar**
   "Hej! Här är ditt rehabprogram med övningar: [LÄNK] /Södermalms Ortopedi"

6. **Kontaktinfo**
   "Har du frågor? Ring 08-XXX XX XX (mån-fre 8-16) eller mejla info@sodermalmsortopedi.se /Södermalms Ortopedi"

### Kategori: Administrativa frågor
7. **Väntetider**
   "Hej! Info om väntetider och remisshantering: [LÄNK] /Södermalms Ortopedi"

8. **Försäkringspatienter**
   "Hej! Info för försäkringspatienter finns här: [LÄNK] /Södermalms Ortopedi"

## FILSTRUKTUR
sms-portal/
├── app.py                 # Huvudapplikation
├── config.py              # Konfiguration från .env
├── models.py              # SQLite-modeller (User, Template, AuditLog)
├── sms_service.py         # Sinch/Twilio-integration
├── requirements.txt       # Dependencies
├── .env.example           # Mall för miljövariabler
├── .gitignore
├── init_db.py             # Skapa databas + exempelmallar
├── templates/
│   ├── base.html          # Baslayout med navbar
│   ├── login.html         # Inloggningssida
│   ├── index.html         # Huvudvy - skicka SMS
│   ├── templates.html     # Mallhantering (admin)
│   └── audit.html         # Audit-logg (admin)
├── static/
│   ├── css/
│   │   └── style.css      # Anpassad styling
│   └── js/
│       └── sms.js         # Teckenräknare, validering, UX
└── README.md              # Setup-instruktioner

## .env.example
# Applikation
SECRET_KEY=generera-en-säker-nyckel-här
FLASK_ENV=production

# Användare (första setup)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=byt-detta-lösenord

# Sinch SMS API
SINCH_SERVICE_PLAN_ID=xxx
SINCH_API_TOKEN=xxx
SINCH_FROM_NUMBER=+46XXXXXXXXX

# Alternativt: Twilio
# TWILIO_ACCOUNT_SID=xxx
# TWILIO_AUTH_TOKEN=xxx
# TWILIO_FROM_NUMBER=+46XXXXXXXXX

# Begränsningar
SMS_RATE_LIMIT_PER_HOUR=30
SESSION_TIMEOUT_MINUTES=30

## GDPR-KRAV (VIKTIGT)
- ❌ Spara ALDRIG telefonnummer i databasen
- ❌ Logga ALDRIG meddelandeinnehåll
- ✅ Logga endast metadata (vem, när, vilken malltyp)
- ✅ Informera att SMS-leverantören har egen loggning
- ✅ Ha dataskyddspolicy tillgänglig

## DEPLOYMENT
1. **Lokal utveckling:** flask run
2. **Produktion:** Gunicorn bakom nginx med HTTPS
3. **Enklast:** Docker container på Railway/Render

## KOSTNAD
- Sinch/Twilio: ca 0,50-1,00 kr per SMS
- Hosting: Gratis tier på Railway/Render räcker för låg volym

## KODSTANDARD
- Alla kommentarer på svenska
- Felmeddelanden på svenska
- Type hints på funktioner
- Docstrings på alla funktioner

---

Generera fullständig, körbar kod för alla filer. Börja med app.py.
```

---

## Nästa steg när projektet ska påbörjas

1. [ ] Skapa Sinch- eller Twilio-konto
2. [ ] Bestäm var appen ska hostas (separat server eller subdomain)
3. [ ] Definiera exakt vilka mallar som behövs
4. [ ] Köra prompten i Cursor för att generera koden
5. [ ] Testa lokalt
6. [ ] Deploya till produktion

---

## Relaterade sidor på hemsidan (för mallar)

- `/info/recept-policy` - Receptpolicy & förpackningsbyten
- `/info/kallelse-operation` - Inför operation (regionpatient)
- `/info/kallelse-operation-forsakring` - Inför operation (försäkring)
- `/patient/remiss-vantetid/` - Remiss & väntetid
- `/patient/forsakringar-betalning/` - Försäkringar & betalning
- `/om-oss/om-kliniken-hitta-hit/` - Hitta till oss

---

*Dokumentet skapades 2026-01-07 som underlag för framtida implementation.*


