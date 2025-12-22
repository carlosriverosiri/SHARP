# Hantera obesvarade frågor

Den här guiden beskriver hur du hittar, besvarar och publicerar frågor i "Fråga doktorn"-sektionen.

---

## Arbetsflödes-systemet

Varje fråga har ett **status**-fält i frontmatter som indikerar var i processen den befinner sig:

| Status | Betydelse |
|--------|-----------|
| `obesvarad` | Frågan har inget svar ännu |
| `utkast` | Har ett preliminärt svar som behöver granskas |
| `klar` | Redo att publiceras (eller använd `published: true` direkt) |

Frågor med `published: false` syns inte på sajten.

---

## Steg 1: Hitta frågor att besvara

### PowerShell-kommandon

**Lista alla obesvarade frågor:**
```powershell
Get-ChildItem "src\content\fraga-doktorn\*.md" | Where-Object { (Get-Content $_.FullName -Raw) -match 'status: "obesvarad"' } | Select-Object Name
```

**Lista alla utkast (har svar, behöver granskas):**
```powershell
Get-ChildItem "src\content\fraga-doktorn\*.md" | Where-Object { (Get-Content $_.FullName -Raw) -match 'status: "utkast"' } | Select-Object Name
```

**Lista obesvarade frågor med kategori:**
```powershell
Get-ChildItem "src\content\fraga-doktorn\*.md" | Where-Object { (Get-Content $_.FullName -Raw) -match 'status: "obesvarad"' } | ForEach-Object { $content = Get-Content $_.FullName -Raw; if ($content -match 'category: "([^"]+)"') { $cat = $matches[1] } else { $cat = "?" }; Write-Host "[$cat] $($_.Name)" }
```

**Lista endast obesvarade AXEL-frågor:**
```powershell
Get-ChildItem "src\content\fraga-doktorn\*.md" | Where-Object { $content = Get-Content $_.FullName -Raw; $content -match 'status: "obesvarad"' -and $content -match 'category: "axel"' } | Select-Object Name
```

---

## Steg 2: Redigera en fråga

### Filstruktur

En fråga-fil ser ut så här:

```markdown
---
title: "Rubrik för frågan"
description: "Kort beskrivning..."
category: "axel"                    # axel, kna, armbage, annat
topic: "frozen-shoulder"            # Vilket ämne frågan tillhör
tags: ["smärta", "rehabilitering"]
date: 2024-01-15
author: "Dr. Carlos Rivero Siri"
published: false                    # false = syns inte på sajten
status: "obesvarad"                 # obesvarad, utkast, klar
question: |
  Här står patientens fråga.
  Den kan vara flera rader.
---

Här skriver du SVARET på frågan.

Du kan använda **markdown-formatering** för att strukturera svaret.

**Sammanfattning:**
- Punkt 1
- Punkt 2
```

### Vad du behöver göra

1. **Öppna filen** i VS Code/Cursor
2. **Läs frågan** i `question:`-fältet
3. **Skriv svaret** efter den avslutande `---`
4. **Uppdatera topic** om det behövs (se listan nedan)
5. **Ändra status** till `"utkast"` när du har ett preliminärt svar

---

## Steg 3: Granska och publicera

När svaret är klart:

1. **Granska svaret** - läs igenom och korrigera
2. **Ta bort `status:`-raden** helt (eller sätt till `"klar"`)
3. **Ändra `published:`** till `true`
4. **Spara filen** - sajten uppdateras automatiskt om dev-servern körs

### Exempel på publicerad fil

```markdown
---
title: "Ont i axeln efter träning"
description: "Patient frågar om axelsmärta efter styrketräning..."
category: "axel"
topic: "ont-i-axeln"
tags: ["smärta", "träning"]
date: 2024-01-15
author: "Dr. Carlos Rivero Siri"
published: true
question: |
  Jag har ont i axeln efter träning. Vad kan det bero på?
---

Det finns flera möjliga orsaker till axelsmärta efter träning...

**Sammanfattning:**
- Vila från smärtsam aktivitet
- Kontakta fysioterapeut vid ihållande besvär
```

---

## Tillgängliga topics för axel

Använd dessa värden för `topic:`-fältet:

### Smärtlokalisation
- `ont-ovansidan-axeln` - Smärta ovanpå axeln
- `ont-i-axeln` - Generell axelsmärta
- `ont-i-bicepssenan` - Bicepssmärta
- `ont-i-skulderbladet` - Skulderbladssmärta

### Diagnoser
- `frozen-shoulder` - Frusen skuldra
- `impingement` - Impingement
- `ac-ledsartros` - AC-ledsartros
- `kalkaxel` - Kalkaxel
- `slitagesjukdom` - Artros/slitage
- `pectoralis-ruptur` - Pectoralis major ruptur

### Skador & Instabilitet
- `axeln-ur-led` - Axelluxation
- `labrumskada` - Labrumskada
- `bankartskada` - Bankartskada
- `instabilitet` - Instabilitet
- `rotatorkuffruptur` - Rotatorkuffskada

### Övrigt
- `kortisoninjektion` - Kortisonbehandling
- `rehabilitering` - Rehabilitering/träning
- `operation` - Operationsfrågor

---

## Tips

### Struktur för bra svar

1. **Inledning** - Bekräfta förståelse för problemet
2. **Förklaring** - Beskriv vad som kan orsaka besvären
3. **Rekommendation** - Ge konkreta råd
4. **Sammanfattning** - Punktlista med det viktigaste

### Bra att inkludera

- När man bör söka vård
- Vad man kan göra själv
- Förväntad läkningstid
- Eventuella varningssignaler

### Undvik

- Personuppgifter (namn, personnummer, telefonnummer)
- Alltför specifika diagnoser utan undersökning
- Garantier om utfall

---

## Kategorier

| Kategori | Beskrivning |
|----------|-------------|
| `axel` | Axelrelaterade frågor (publiceras) |
| `kna` | Knäfrågor (sparas för framtiden) |
| `armbage` | Armbågsfrågor (sparas för framtiden) |
| `annat` | Övriga kroppsdelar (sparas för framtiden) |

Just nu publiceras endast **axel**-frågor på sajten. Frågor om andra kroppsdelar sparas för eventuell framtida utbyggnad.

---

## Snabbkommandon

```powershell
# Räkna obesvarade per kategori
Get-ChildItem "src\content\fraga-doktorn\*.md" | Where-Object { (Get-Content $_.FullName -Raw) -match 'status: "obesvarad"' } | ForEach-Object { $content = Get-Content $_.FullName -Raw; if ($content -match 'category: "([^"]+)"') { $matches[1] } } | Group-Object | Select-Object Name, Count

# Visa alla opublicerade filer
Get-ChildItem "src\content\fraga-doktorn\*.md" | Where-Object { (Get-Content $_.FullName -Raw) -match 'published: false' } | Select-Object Name

# Starta dev-servern
npm run dev
```

---

## Felsökning

### Filen syns inte på sajten
- Kontrollera att `published: true`
- Kontrollera att `category: "axel"` (andra kategorier visas inte än)
- Kontrollera att `topic:` har ett giltigt värde

### Valideringsfel
- Alla obligatoriska fält måste finnas: `title`, `category`, `date`, `question`
- `date:` måste vara i format `YYYY-MM-DD`
- `category:` måste vara ett av: `axel`, `kna`, `armbage`, `annat`

### Sidan uppdateras inte
- Starta om dev-servern: `npm run dev`
- Rensa cache: Ta bort `.astro/`-mappen och starta om



