# 📋 Checklista innan du pushar till GitHub

## ✅ Kontrollera att allt fungerar

### 1. Dev-servern kör utan fel
```bash
npm run dev
```
**Förväntat resultat:**
- Ingen röda felmeddelanden
- Servern startar på localhost:4321 eller 4322
- Chrome öppnas automatiskt

### 2. Startsidan visas korrekt
- [ ] Öppna http://localhost:4321/
- [ ] Logotypen visas
- [ ] Menyn visas (Sjukdomar, Operation, Rehab, etc.)
- [ ] Sidan har rätt färger och layout

### 3. Menyn fungerar
Klicka på följande länkar och kontrollera att de INTE ger 404:
- [ ] Sjukdomar → `/sjukdomar/`
- [ ] Sjukdomar → Axel → `/sjukdomar/axel/`
- [ ] Sjukdomar → Knä → `/sjukdomar/kna/`
- [ ] Sjukdomar → Armbåge → `/sjukdomar/armbage/`
- [ ] Operation → `/operation/`
- [ ] Rehab → `/rehab/`
- [ ] Om Oss → `/om-oss/`

### 4. Inga Tailwind-fel
I terminalen, kontrollera att du INTE ser:
- ❌ "Cannot apply unknown utility class"
- ❌ "@apply" errors

### 5. Git status
```bash
git status
```
**Kontrollera att dessa filer är ändrade:**
- `README.md`
- `docs/SETUP-ARBETSDATOR.md`
- `docs/CHANGELOG.md`
- `.gitignore`
- `src/styles/global.css`
- `src/components/Header.astro`
- `src/pages/sjukdomar/index.astro` (ny)
- `src/pages/sjukdomar/axel/index.astro` (ny)
- `src/pages/sjukdomar/kna/index.astro` (ny)
- `src/pages/sjukdomar/armbage/index.astro` (ny)
- `src/pages/rehab/index.astro` (ny)
- `src/pages/operation/index.astro` (ny)
- `src/pages/om-oss/index.astro` (ny)

## 🚀 Pusha till GitHub

När alla checkboxar är ✅:

```bash
# Stanna dev-servern (Ctrl+C) först

# Lägg till alla ändringar
git add .

# Commit med beskrivande meddelande
git commit -m "Fix: Tailwind v4 compatibility, add missing pages, improve documentation"

# Pusha till GitHub
git push origin main
```

## 📥 Synka till andra datorer

### På Hemdator (Windows 11):
```bash
cd [sökväg till SHARP]
git pull origin main
npm install  # Om package.json ändrats
npm run dev
```

### På MacBook:
```bash
cd [sökväg till SHARP]
git pull origin main
npm install  # Om package.json ändrats
npm run dev
```

### På Arbetsdator (Windows 11):
**Börja om från början** enligt `docs/SETUP-ARBETSDATOR.md`

## ❓ Om något går fel

### Git säger "conflict"
```bash
# Se vad som är i konflikt
git status

# Avbryt och börja om
git merge --abort
git pull origin main
```

### Servern startar inte
```bash
# Ta bort cache och node_modules
rm -rf .astro node_modules package-lock.json
# ELLER på Windows:
Remove-Item -Recurse -Force .astro, node_modules, package-lock.json

# Installera om
npm install
npm run dev
```

### Sidan ser konstig ut
- Tryck Ctrl+Shift+R (hard refresh) i webbläsaren
- Eller stäng dev-servern och kör `npm run dev` igen

---

**Allt klart? Kör kommandona ovan för att pusha! 🎉**

