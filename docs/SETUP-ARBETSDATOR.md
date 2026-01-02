# 🚀 Snabb Setup - Arbetsdator (Windows 11)

## Steg 1: Radera nuvarande installation (om den krånglar)

Öppna PowerShell och kör:

```powershell
# Navigera till rätt mapp (byt ut till där din SHARP-mapp ligger)
cd C:\Users\carlo\

# Ta bort SHARP-mappen helt
Remove-Item -Recurse -Force SHARP
```

## Steg 2: Klona från GitHub

```powershell
# Klona projektet på nytt
git clone https://github.com/[ditt-github-användarnamn]/SHARP.git
cd SHARP

# Kolla att du är på rätt branch
git branch
git status
```

## Steg 3: Installera Node modules (VIKTIGT!)

```powershell
# Detta tar några minuter första gången
npm install
```

**Vänta tills du ser:**
```
added XXX packages, and audited XXX packages in XXXs
```

## Steg 4: Starta servern

```powershell
npm run dev
```

**Du ska se något liknande:**
```
astro  v5.16.5 ready in XXX ms

┃ Local    http://localhost:4321/
┃ Network  use --host to expose

watching for file changes...
```

## Steg 5: Öppna i webbläsaren

Chrome öppnas automatiskt till `http://localhost:4321/` (eller `4322`)

## ✅ Checklista - Allt fungerar om:

- [ ] `npm run dev` startar utan fel
- [ ] Inga röda felmeddelanden i terminalen
- [ ] Startsidan visas i webbläsaren
- [ ] Menyn fungerar (inga 404-fel när du klickar)
- [ ] Inga Tailwind CSS-fel

## ❌ Om något inte fungerar:

### Fel: "Port 4321 is in use"
```powershell
netstat -ano | findstr :4321
# Notera PID-numret
taskkill /PID [nummer] /F
npm run dev
```

### Fel: "Cannot find module"
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
npm run dev
```

### Fel: Sidan ser konstig ut eller saknar styling
```powershell
# Stoppa servern (Ctrl+C)
Remove-Item -Recurse -Force .astro
npm run dev
```

## 📤 När du är klar för dagen:

```powershell
# Spara dina ändringar
git add .
git commit -m "Beskrivning av vad du gjort"
git push origin main
```

## 📥 Nästa dag på arbetsdatorn:

```powershell
cd C:\Users\carlo\SHARP
git pull origin main
npm run dev
```

## 🏠 Synka till hemdatorn:

På hemdatorn kör du:
```bash
cd [sökväg till SHARP]
git pull origin main
npm install  # Endast om package.json ändrats
npm run dev
```

---

**Tips:** Spara denna fil som bokmärke i Cursor för snabb access!

