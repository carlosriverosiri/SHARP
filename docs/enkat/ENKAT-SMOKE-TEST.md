# Enkät Smoke Test

Det här dokumentet är till för ett snabbt manuellt kontrollpass av `upload -> preview` efter refaktorer och säkerhetsfixar.

## Viktigt

- Testfilen i `docs/enkat/ENKAT-SMOKE-TEST.csv` är syntetisk och innehåller inga riktiga patientuppgifter.
- Kör inte `Skapa kampanj` med denna fil i en miljö där riktig 46elks-konfiguration är aktiv, om du inte först bytt till en helt säker testmottagare eller tillfälligt stängt av SMS-utskick.
- För ett säkert lokalt pass räcker det att verifiera upload, preview, urval, dubletthantering och att dashboard/rapport laddar utan UI-fel.

## Förberedelser

1. Kör `npm test`.
2. Starta appen lokalt med `npm run dev`.
3. Logga in i portalen.
4. Gå till `/personal/enkat`.
5. Kontrollera att listan "Bokningstyper som aldrig ska följas upp" innehåller `telefon`.

## Testfil

Använd `docs/enkat/ENKAT-SMOKE-TEST.csv`.

Den är byggd för att träffa fyra centrala fall i samma körning:

- en vanlig giltig rad
- en rad utan diagnos som ska sorteras bort automatiskt
- en dubblett där `Remiss knä` ska vinna över `Återbesök`
- en rad som ska sorteras bort av regeln `telefon`

## Förväntat utfall efter första preview

Om listan över bokningstyper som alltid ska sorteras bort innehåller `telefon` ska previewn visa:

- `Totala rader`: `5`
- `Giltiga rader`: `2`
- `Automatiskt bortsorterade`: `2`
- `Dubletter`: `1`
- `Felrader`: `0`

Dessutom ska du se:

- en auto-excluded-grupp för `Saknar diagnos`
- en auto-excluded-grupp för `Telefonkontakt`
- bokningstyperna `Nybesök`, `Remiss knä` och `Återbesök` i checkboxlistan
- exakt två valda rader i tabellen
- en dublettrad där den behållna raden är `Remiss knä`

## Andra preview-passet

1. Avmarkera `Nybesök`.
2. Klicka `Filtrera och förhandsgranska` igen.

Förväntat:

- checkboxlistan finns kvar och visar fortfarande alla tre bokningstyperna
- endast en vald rad återstår i preview-tabellen
- kvarvarande rad är patienten med `Remiss knä`

## Rensa-pass

1. Klicka `Rensa`.

Förväntat:

- filnamnet återgår till `Ingen fil har valts`
- preview-sektionen döljs
- tidigare sammanfattning och tabeller rensas

## Om du vill göra fullt end-to-end-test

Gör det bara i en kontrollerad miljö.

- använd en separat testfil med en medvetet vald testmottagare
- verifiera om 46elks är avstängt eller pekar mot säker testkonfiguration
- kontrollera därefter `kampanjhistorik`, publik enkätlänk och `dashboard/rapport`
