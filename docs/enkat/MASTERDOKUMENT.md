# Enkät: Masterdokument för extern AI

> Använd detta som bakgrundsunderlag när du frågar externa AI-modeller om `Enkät`-modulen i SHARP.
> Målet är att ge tillräcklig kontext för bra svar utan att behöva bifoga alla dokument varje gång.

---

## 1) Kontext i en mening

`Enkät` är en intern kvalitetsmodul i SHARP där personal importerar CSV, skickar SMS-enkäter via 46elks, samlar anonyma svar och följer resultat per vårdgivare i dashboard/rapport.

---

## 2) Arkitektur (kort)

- **Frontend/admin:** Astro-sida `src/pages/personal/enkat.astro`
- **Publik enkät:** `src/pages/e/[kod].astro`
- **API:** `src/pages/api/enkat/*`
- **Backendlogik:** `src/lib/enkat-*`
- **Databas:** Supabase (enkätmigreringar)
- **SMS:** 46elks
- **Kö/fördröjt utskick:** Netlify function `netlify/functions/enkat-send-queue.mts`

---

## 3) Aktuella endpoints

- `POST /api/enkat/upload` - parse + validera CSV och returnera preview
- `GET/POST /api/enkat/settings` - läs/spara gemensam lista över bokningstyper som aldrig ska följas upp
- `POST /api/enkat/send` - skapa kampanj + utskick
- `POST /api/enkat/remind` - skicka påminnelse till obesvarade
- `POST /api/enkat/submit` - publik submit via kod
- `GET /api/enkat/dashboard` - nyckeltal/analys
- `GET /api/enkat/report` - periodrapport
- `GET /api/enkat/campaigns` - kampanjhistorik

---

## 4) Datamodell (huvudtabeller)

- `enkat_kampanjer`
- `enkat_utskick`
- `enkat_svar`
- `enkat_delivery_log`
- `enkat_installningar`

Nyckelidéer:

- en kampanj innehåller många utskick
- ett utskick kan ge max ett svar
- leveranslogg sparar faktisk skickstatus/fel
- analys ska vara vårdgivarspecifik, patientanonym i rapportering

---

## 5) Affärsregler

- Importen ska tåla vanliga vårdexporter (separator + teckenkodning).
- Bokningstyper som finns i den gemensamma listan "följs aldrig upp" ska sorteras bort innan preview/deduplicering.
- Rader utan värde i `Diagnoser` ska sorteras bort innan preview.
- Den gemensamma listan lagras i Supabase och kan uppdateras av administratör (via `/personal/enkat`; i UI visas ingen ständig informationsruta om lagring — se `ENKAT-UI-SPEC.md`).
- Bokningstyper som finns kvar i den aktuella filen ska visas som kryssrutor så att användaren aktivt väljer vad som ska ingå i utskicket.
- Deduplicering prioriterar nybesök/remiss över återbesök bland de rader som återstår efter filtrering.
- Max en påminnelse per utskick.
- `submit` är publik men strikt validerad (kod, giltighet, redan använd).
- Dashboard ska skydda integritet vid lågt underlag.
- Profilkoppling till vårdgivarnamn styr vad en vanlig användare får se.

---

## 6) Vad som redan fungerar (V1-läge)

- CSV-import + preview med felrader/dubletter
- gemensam Supabase-lagrad lista för bokningstyper som automatiskt sorteras bort
- `Diagnoser` som hårt urvalskrav i importen
- checkbox-urval av bokningstyper i den aktuella filen
- klassificering av bokningstyper
- kampanjskapande + första utskick
- manuell påminnelse
- publik enkätsida och submit
- dashboard + rapport + kampanjhistorik
- fördröjningsanalys baserat på besökstid/starttid
- publikt formulär: se `ENKAT-PATIENTFORMULAR-MALL.md` (layout, mobil, färger)

---

## 7) Kända förbättringsspår

- skarpa tester med riktiga utskick och större batcher
- rapportexport (CSV/PDF)
- bättre visualisering av fördröjningsmått
- polish i adminflödet
- ev. mer automatiserad profil/vårdgivarkoppling

---

## 8) Dokument att läsa vid fördjupning

Hela enkätdokumentationen ligger i `docs/enkat/`:

- `ENKAT-STATUS.md`
- `ENKAT-IMPLEMENTATIONSPLAN.md`
- `ENKAT-PATIENTUPPLEVELSE.md`
- `ENKAT-PATIENTFORMULAR-MALL.md` — referens för publikt frågeformulär (mobilgenomgång + mall för nya formulär)
- `ENKAT-API-SPEC.md`
- `ENKAT-UI-SPEC.md`
- `ENKAT-SQL-SPEC.md`

---

## 9) Promptmall till extern AI

Kopiera och fyll i:

```text
Jag arbetar i SHARP (Astro + Supabase + 46elks) med en intern enkätmodul.

Bakgrund:
- Adminflöde: importera CSV -> preview -> skapa kampanj -> skicka SMS -> ev. påminnelse
- Publik sida: /e/[kod] för anonymt svar
- API: upload/send/remind/submit/dashboard/report/campaigns
- Databas: enkat_kampanjer, enkat_utskick, enkat_svar, enkat_delivery_log

Mål:
[Beskriv exakt vad du vill förbättra]

Krav:
- Behåll nuvarande arkitektur (Astro/Supabase/46elks)
- Föreslå konkreta kodnära steg (inte bara teori)
- Nämn risker, testplan och migrationspåverkan

Fråga:
[Din specifika fråga]
```

---

## 10) Hur dokumentet används bäst

- Skicka detta masterdokument först till extern AI.
- Lägg sedan till relevant underdokument från `docs/enkat/` beroende på frågan:
  - API-fråga -> `ENKAT-API-SPEC.md`
  - UI-fråga -> `ENKAT-UI-SPEC.md` + vid behov `ENKAT-PATIENTFORMULAR-MALL.md`
  - databasfråga -> `ENKAT-SQL-SPEC.md`
  - plan/prioritering -> `ENKAT-STATUS.md` + `ENKAT-IMPLEMENTATIONSPLAN.md`

Det ger snabbare och mer träffsäkra svar än att skicka allt varje gång.
