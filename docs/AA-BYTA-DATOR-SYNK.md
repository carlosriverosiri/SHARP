# AA – Byta dator och säker synkning

> Snabbguide för att jobba smidigt mellan flera datorer med GitHub som nav.

---

## Grundprincipen

```
Dator A  →  git push  →  GitHub  →  git pull  →  Dator B
```

GitHub är alltid den gemensamma sanningskällan. Innan du stänger locket: **spara**. När du öppnar på ny dator: **synka**.

---

## Snabbkommandon (redan installerade)

Dessa alias finns i `~/.zshrc` och fungerar i alla terminaler:

| Kommando | Vad det gör |
|----------|-------------|
| `save` | Committar alla ändringar och pushar till GitHub |
| `sync` | Pullar senaste versionen från GitHub |

### Typiskt arbetsflöde

```bash
# Börja på ny dator
sync

# Jobba i Cursor...

# Innan du byter dator
save
```

---

## Ställa in en ny dator

### 1. Installera grunderna

```bash
# Homebrew (om det saknas)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Git och Node
brew install git node
```

### 2. Klona repot

```bash
cd ~/Documents
git clone git@github.com:<ditt-konto>/SHARP.git
cd SHARP
npm install
```

### 3. Lägg till alias

Kör **en gång** i terminalen:

```bash
cat >> ~/.zshrc << 'ALIASES'

# SHARP-repo: snabbkommandon för GitHub-synk
alias save='cd ~/Documents/SHARP && git add . && git commit -m "wip $(date +%H:%M)" && git push origin main'
alias sync='cd ~/Documents/SHARP && git pull origin main'
ALIASES
source ~/.zshrc
```

### 4. SSH-nyckel mot GitHub

Om datorn inte redan har en SSH-nyckel:

```bash
ssh-keygen -t ed25519 -C "din@email.se"
cat ~/.ssh/id_ed25519.pub
```

Kopiera utskriften och lägg till den under **GitHub → Settings → SSH and GPG keys → New SSH key**.

Testa:

```bash
ssh -T git@github.com
# Förväntat: "Hi <användarnamn>! You've successfully authenticated..."
```

### 5. Miljövariabler

Kopiera `.env`-filen från en befintlig dator (den versionshanteras inte av säkerhetsskäl):

```bash
# På gamla datorn
cat ~/Documents/SHARP/.env

# Klistra in på nya datorn
nano ~/Documents/SHARP/.env
```

---

## Vad är en worktree?

En **git worktree** är en extra arbetskopia av samma repo. Den delar git-historik med huvudrepot men har en egen mapp med egna filer.

```
~/Documents/SHARP/              ← Huvudrepo (ditt riktiga repo)
~/.cursor/worktrees/SHARP/hlm/  ← Worktree (separat kopia)
```

### Varför skapas de?

Cursor kan skapa worktrees automatiskt när den kör parallella experiment (t.ex. via "best-of-n"-agenter). Ändringar som görs i en worktree syns **inte** i huvudrepot och pushas **inte** till GitHub.

### Problemet

Om Cursor börjar jobba i en worktree istället för huvudrepot hamnar ändringar på fel ställe. De syns inte i din dev-server och synkas inte mot GitHub.

### Hur undviker man det?

1. **Kontrollera sökvägen** — om du ser `~/.cursor/worktrees/` i filnamn har Cursor hamnat i en worktree.
2. **Rensa worktrees regelbundet** (se nedan).
3. **Öppna alltid `~/Documents/SHARP`** som workspace i Cursor, inte en worktree-mapp.

### Rensa worktrees

```bash
cd ~/Documents/SHARP
git worktree list          # Se alla worktrees
git worktree prune         # Ta bort döda referenser
```

Om det finns aktiva worktrees du inte behöver:

```bash
git worktree remove --force <sökväg>
```

---

## Vanliga problem

### "Jag glömde spara innan jag bytte dator"

Gå tillbaka till den andra datorn och kör `save`. Om du redan gjort ändringar på båda:

```bash
sync                      # Kan ge merge-konflikt
# Lös eventuella konflikter i Cursor
save                      # Pusha den sammanslagna versionen
```

### "npm install ger fel efter sync"

Om `package-lock.json` ändrats av den andra datorn:

```bash
rm -rf node_modules
npm install
```

### "Cursor jobbar i worktree igen"

```bash
cd ~/Documents/SHARP
git worktree prune
# Stäng och öppna ~/Documents/SHARP i Cursor igen
```

---

## Sammanfattning

| Steg | Kommando |
|------|----------|
| Starta dagen | `sync` |
| Avsluta dagen / byta dator | `save` |
| Ny dator | Klona + alias + SSH-nyckel + `.env` |
| Worktree-problem | `git worktree prune` |
