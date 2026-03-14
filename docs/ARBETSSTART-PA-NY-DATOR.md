# Arbetsstart på ny dator

> Snabb checklista för att komma igång i `SHARP` på en annan dator utan att missa något viktigt.

Om du behöver göra en full ominstallation eller klona projektet från början, läs i stället `docs/SETUP-ARBETSDATOR.md`.

---

## Snabbstart

Öppna terminalen i projektmappen och kör:

```powershell
git pull origin main
npm install
npm run dev
```

Om `npm install` redan är gjort på datorn och inget stort ändrats kan det ofta räcka med:

```powershell
git pull origin main
npm run dev
```

---

## Checklista steg för steg

## 1. Öppna rätt projekt

Kontrollera att du står i rätt mapp:

```powershell
cd C:\Users\carlo\SHARP
```

Om projektet ligger någon annanstans, byt till rätt sökväg.

---

## 2. Hämta senaste från GitHub

```powershell
git pull origin main
```

Kontrollera sedan:

```powershell
git status
```

Du vill helst se:

```text
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

---

## 3. Installera dependencies vid behov

Kör detta om:

- du är osäker på om `node_modules` är uppdaterat
- `package.json` eller `package-lock.json` ändrats
- projektet klagar på saknade paket

```powershell
npm install
```

---

## 4. Starta utvecklingsservern

```powershell
npm run dev
```

Du ska se något i stil med:

```text
astro  v5.x ready
┃ Local    http://localhost:4321/
```

Om port `4321` redan används kan Astro välja en annan port, till exempel `4322`.

---

## 5. Öppna och kontrollera viktiga sidor

Börja med att kontrollera att projektet faktiskt fungerar:

- startsidan `/`
- personalportalen `/personal`
- enkätsidan `/personal/enkat`
- länkverktyget `/personal/lankar-sms`

Om du arbetar med `Enkät`, kontrollera särskilt att dessa anrop inte ger fel i terminalen eller webbläsaren:

- `/api/enkat/campaigns`
- `/api/enkat/dashboard`
- `/api/enkat/report`

---

## 6. Om du vill testa Cursor-rules direkt

Öppna:

- `docs/CURSOR-RULES-TESTNING.md`

Gör sedan:

1. öppna en **ny chat** i samma projekt
2. följ testprompterna i dokumentet
3. kontrollera att modellen:
   - följer Astro/UI-mönster
   - tänker på dokumentation
   - föreslår commit/push men inte kör det automatiskt

---

## 7. Bra snabbkontroll innan du börjar arbeta

Det här är ett bra minimum:

- [ ] `git pull origin main` körd
- [ ] `git status` ser rimlig ut
- [ ] `npm run dev` startar utan fel
- [ ] `/personal/enkat` laddar
- [ ] `/personal/lankar-sms` laddar
- [ ] du vet vilken chat du ska jobba vidare i

---

## Om något strular

## Dev-servern startar inte

Prova:

```powershell
npm install
npm run dev
```

---

## Sidan ser konstig ut eller saknar styling

Prova:

```powershell
Remove-Item -Recurse -Force .astro
npm run dev
```

---

## Cursor verkar inte läsa nya rules

Gör detta:

1. Kör `Developer: Reload Window` i Cursor
2. Öppna en **ny chat**
3. Testa igen med hjälp av `docs/CURSOR-RULES-TESTNING.md`

---

## Om du behöver full återställning

Om datorn krånglar ordentligt eller projektet måste installeras om från början:

- läs `docs/SETUP-ARBETSDATOR.md`

Det dokumentet är mer komplett och täcker:

- ny kloning
- ominstallation
- felsökning av portar
- trasiga `node_modules`
- synk mellan datorer

---

## Kortversion att spara

```powershell
git pull origin main
npm install
npm run dev
```

Om allt ser bra ut:

1. öppna rätt sida
2. fortsätt jobba
3. använd `docs/CURSOR-RULES-TESTNING.md` om du vill prova rules
