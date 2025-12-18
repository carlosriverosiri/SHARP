# 📋 Prompt för import av Fråga Doktorn från WordPress

Använd denna prompt när du importerar nya Q&A-områden från WordPress till Astro.

---

## FORMAT FÖR VARJE FIL

Varje fråga ska bli en separat markdown-fil i `src/content/fraga-doktorn/` med följande struktur:

### Frontmatter:

```yaml
---
title: "[Kort beskrivande titel - max 60 tecken för Google]"
description: "[SEO-optimerad beskrivning, 120-160 tecken, ska locka till klick]"
category: "[axel/kna/armbage]"
topic: "[relevant-amne-slug]"
tags: ["relevanta", "sökord", "för-seo"]
date: [BEHÅLL ORIGINALDATUM från WordPress]
author: "Dr. Carlos Rivero Siri"
relatedCondition: "[länk till relaterad sjukdomssida om relevant]"
published: true
patientName: "[Om namn anges i frågan]"
patientAge: [Om ålder anges]
question: |
  [Patientens fråga formaterad med stycken]
---
```

---

## SEO & SOCIAL MEDIA OPTIMERING

### Title (title-fältet)
- **Max 60 tecken** (visas i Google-resultat)
- Inkludera huvudsökord först
- Exempel: `"AC-ledsartros efter styrketräning - symtom och behandling"`

### Description (description-fältet)
- **120-160 tecken** (visas i Google och som förhandsvisning på sociala medier)
- Ska svara på frågan kortfattat och locka till klick
- Inkludera relevanta sökord naturligt
- Exempel: `"Fråga om smärta i nyckelbensleden vid bänkpress. Läs ortopedspecialistens svar om orsaker och behandling."`

### Tags (tags-fältet)
- Inkludera relevanta medicinska termer
- Inkludera vardagliga söktermer patienter använder
- Exempel: `["ac-led", "nyckelbensleden", "artros", "styrketräning", "bänkpress", "axelsmärta"]`

### Schema.org (hanteras automatiskt)
Astro-komponenten genererar automatiskt:
- `FAQPage` markup för fråga/svar
- `MedicalWebPage` för medicinsk information
- `BreadcrumbList` för navigation

### Open Graph & Twitter Cards (hanteras automatiskt)
Baserat på frontmatter genereras:
- `og:title` ← title
- `og:description` ← description  
- `og:type` = "article"
- `twitter:card` = "summary"
- `twitter:title` ← title
- `twitter:description` ← description

---

## PATIENTENS FRÅGA (question-fältet)

- Börja med "Hej!" om inte annat står
- Dela upp i tydliga stycken med blankrad mellan
- Behåll patientens egna ord och ton
- Korrigera uppenbara stavfel
- Formatera listor och punkter där det är naturligt

**Exempel:**
```yaml
question: |
  Hej!

  Jag har sedan en månad tillbaka ont i mina nyckelben. Jag är öm i båda och får jätteont när jag tränar.

  Till exempel när jag gör armhävningar måste jag sluta för att det gör för ont.

  Vad kan detta vara?
```

---

## MITT SVAR (body/markdown-innehåll)

- **Använd MINA ORIGINALORD** från WordPress
- Dela upp i tydliga stycken (en tanke per stycke)
- **INGA rubriker** (##) i svaret
- **MINIMAL fetstil** (max 3-4 ord om alls)
- Avsluta ALLTID med en sammanfattande punktlista

**Exempel:**
```markdown
Smärtor i nyckelbensleden hos individer som ägnar sig åt styrketräning är vanligt.

En minskad belastning av axeln ger oftast mindre smärtor.

Prognosen är god. Det brukar gå över inom 12–18 månader.

**Sammanfattning:**
- Sannolikt överansträngning av nyckelbenslederna
- Kan vara Weightlifter's shoulder
- God prognos – går oftast över inom 12–18 månader
- Operation behövs sällan
```

---

## TOPICS

### Axel
- `ac-ledsartros`
- `impingement`
- `frozen-shoulder`
- `rotatorcuff`
- `instabilitet`
- `biceps`
- `weightlifters-shoulder`
- `fraktur`
- `utredning` (MR, röntgen, ultraljud)
- `kortisoninjektion`

### Knä
*(Lägg till topics när knä-frågor importeras)*

### Armbåge
*(Lägg till topics när armbågs-frågor importeras)*

---

## VIKTIGA REGLER

1. ✅ **BEHÅLL originaldatum** från WordPress (visar kontinuerlig aktivitet)
2. ✅ **BEHÅLL mina originalformuleringar** - gör endast lätt redigering
3. ❌ **TA BORT kursiv** (`*text*`) formatering från svaren
4. ❌ **TA BORT "Läs mer om..."-länkar** i svaret (finns automatiskt fördjupningsblock)
5. ✅ **Separera ALLTID** frågan (i frontmatter) från svaret (i body)
6. ✅ **Skapa SEO-vänlig titel och beskrivning** för varje fråga
7. ❌ **INGEN signatur i slutet** - författarnamnet visas redan i rubriken via `author`-fältet

---

## IMPORT-PROCESS

1. Exportera hela WordPress-siten (XML-export)
2. Ge Cursor exporten och ange vilket område som ska importeras
3. Cursor importerar området enligt denna mall
4. Granska och ge feedback
5. Gå vidare till nästa område

---

*Senast uppdaterad: 2025-12-17*



