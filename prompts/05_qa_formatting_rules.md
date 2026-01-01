# Guide: Redigera frågor med punktlistor och färgade block

Denna guide beskriver hur du redigerar frågor i "Fråga doktorn"-sektionen för att få en snygg, strukturerad presentation med punktlistor och färgade informationsblock.

---

## Grundprinciper

### Viktiga regler:

1. **Gör minimala ändringar i innehållet** – Fokusera på presentationen, inte på att omformulera eller ändra medicinska fakta
2. **Publicera direkt** – Sätt `published: true` och `status: "klar"` så att du kan se resultatet direkt i webbläsaren
3. **Använd punktlistor** – Omvandla långa stycken till punktlistor där det passar
4. **Använd färgade block** – Organisera information i visuellt åtskilda block med passande färger
5. **Ta bort utkast-markeringar** – Ta bort rader som `[UTKAST - BEHÖVER GRANSKAS]`

---

## Struktur och format

### 1. Metadata i frontmatter

Alltid ändra:
```yaml
published: true
status: "klar"
```

### 2. Inledande stycke

Behåll ett kort inledande stycke som sammanfattar huvudpoängen. Behåll originaltexten så mycket som möjligt, gör bara små justeringar för läsbarhet.

### 3. Färgade informationsblock

Organisera innehållet i färgade block med `---` som avgränsare. Varje block har en tydlig rubrik med emoji.

#### Blått block – Information/förklaringar (💡 🔍 📋)

Använd för:
- Förklaringar om orsaker
- Vad undersökningar visar
- Bakgrundsinformation
- Allmän information

```html
<div style="background: #dbeafe; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0; border-left: 4px solid #2563eb;">
<strong style="color: #1e40af; font-size: 1.1rem;">💡 Rubrik här</strong>

<p>Beskrivande text om nödvändigt.</p>

<ul style="list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0;">
<li>Punkt 1</li>
<li>Punkt 2</li>
<li>Punkt 3</li>
</ul>
</div>
```

#### Grönt block – Positiv information/prognos (✅)

Använd för:
- Positiva nyheter
- Prognoser
- När något är okej/bra
- Rekommendationer

```html
<div style="background: #dcfce7; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0; border-left: 4px solid #16a34a;">
<strong style="color: #166534; font-size: 1.1rem;">✅ Rubrik här</strong>

<p>Inledande text om nödvändigt.</p>

<ul style="list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0;">
<li><strong>Viktig punkt 1</strong> – Förklaring</li>
<li><strong>Viktig punkt 2</strong> – Förklaring</li>
</ul>
</div>
```

#### Gult block – Varningar/viktig information (⚠️ ⏱️)

Använd för:
- Varningar
- Viktiga saker att tänka på
- Tidsaspekter
- Ovanliga förhållanden

```html
<div style="background: #fef3c7; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0; border-left: 4px solid #d97706;">
<strong style="color: #92400e; font-size: 1.1rem;">⚠️ Rubrik här</strong>

<p>Viktig information som behöver lyftas fram.</p>
</div>
```

#### Lila block – Bedömningar/överväganden (💭 🎯)

Använd för:
- Läkares bedömningar
- Komplexa överväganden
- Jämförelser
- Varför beslut tas

```html
<div style="background: #e0e7ff; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0; border-left: 4px solid #6366f1;">
<strong style="color: #4338ca; font-size: 1.1rem;">💭 Rubrik här</strong>

<p>Beskrivande text.</p>

<ul style="list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0;">
<li>Punkt 1</li>
<li>Punkt 2</li>
</ul>
</div>
```

#### Rött block – Allvarliga varningar (⚠️ 🚨)

Använd SPARSAMT för:
- Allvarliga varningar
- När man definitivt måste söka vård

```html
<div style="background: #fee2e2; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0; border-left: 4px solid #dc2626;">
<strong style="color: #991b1b; font-size: 1.1rem;">⚠️ Rubrik här</strong>

<p>Allvarlig varning eller information.</p>
</div>
```

---

## Punktlistor

### När ska du använda punktlistor?

- När det finns flera liknande poänger
- När informationen är strukturerad i steg eller kategorier
- När texten blir lättare att läsa som lista

### Format för punktlistor i block:

```html
<ul style="list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0;">
<li>Punkt 1</li>
<li><strong>Punkt 2 med fetstil</strong> – Förklaring</li>
<li>Punkt 3</li>
</ul>
```

### Format för punktlistor utanför block (i vanlig markdown):

```markdown
- Punkt 1
- **Punkt 2 med fetstil** – Förklaring
- Punkt 3
```

---

## Exempel på struktur

### Exempel 1: Domningar efter operation

```markdown
Inledande stycke med huvudpoäng.

---

<div style="background: #dbeafe; ...">
💡 Varför har detta hänt?
[Förklaring med punktlista]
</div>

---

<div style="background: #dcfce7; ...">
✅ Prognos
[Punktlista om utläkning]
</div>

---

<div style="background: #fef3c7; ...">
⚠️ När ska du söka vård?
[Viktig information]
</div>
```

### Exempel 2: Bedömning av skada

```markdown
Inledande stycke med huvudpoäng.

---

<div style="background: #dbeafe; ...">
🔍 Vad visar MR?
[Punktlista med fynd]
</div>

---

<div style="background: #dcfce7; ...">
✅ När kan operation vara aktuell?
[Punktlista med kriterier]
</div>

---

<div style="background: #fef3c7; ...">
⚠️ Viktigt att veta
[Varningar/undantag]
</div>

---

<div style="background: #e0e7ff; ...">
💭 Varför vill ortopeden inte operera?
[Bedömning med punktlista]
</div>
```

---

## Arbetsflöde

1. **Läs igenom texten** – Förstå innehållet och strukturen
2. **Identifiera huvudpoänger** – Vad är de viktigaste budskapen?
3. **Organisera i block** – Vilken typ av information passar i vilket färgat block?
4. **Konvertera till punktlistor** – Var kan långa stycken bli listor?
5. **Publicera direkt** – Sätt `published: true` och `status: "klar"`
6. **Ta bort utkast-markeringar** – Rensa bort `[UTKAST - BEHÖVER GRANSKAS]` etc.

---

## Prompt att använda

När du vill redigera en fråga, använd denna prompt:

```
Redigera lätt. Använd punktlistor, använd färgat block där det passar in. Publicera.
```

Eller mer detaljerat:

```
Redigera denna fråga enligt formateringsguiden:
- Gör minimala ändringar i innehållet, fokusera på presentation
- Använd punktlistor där det passar
- Organisera informationen i färgade block (blått för info, grönt för positivt/prognos, gult för varningar, lila för bedömningar)
- Ta bort utkast-markeringar
- Sätt published: true och status: "klar"
- Publicera direkt
```

---

## Referenser och citeringar

### Placering av referenser

**Viktigt:** Referenser ska alltid placeras EFTER punkten, inte före.

- ❌ **FEL**: `...resolves spontaneously[22].`
- ✅ **RÄTT**: `...resolves spontaneously.[22]`

**Exempel:**

```markdown
❌ FEL: The cyst resolves spontaneously without direct decompression[22]. This approach is effective.

✅ RÄTT: The cyst resolves spontaneously without direct decompression.[22] This approach is effective.
```

**Detta gäller:**
- Inline-citeringar i löpande text
- Referenser i färgade block
- Referenser i punktlistor
- Alla språk (svenska, engelska, etc.)

---

## Färgreferens

| Färg | Hex (bakgrund) | Hex (border) | Hex (text) | Användning |
|------|----------------|--------------|------------|------------|
| Blå | `#dbeafe` | `#2563eb` | `#1e40af` | Information/förklaringar |
| Grön | `#dcfce7` | `#16a34a` | `#166534` | Positivt/prognos/rekommendationer |
| Gul | `#fef3c7` | `#d97706` | `#92400e` | Varningar/viktig information |
| Lila | `#e0e7ff` | `#6366f1` | `#4338ca` | Bedömningar/överväganden |
| Röd | `#fee2e2` | `#dc2626` | `#991b1b` | Allvarliga varningar |

---

## Tips

- **Behåll originaltextens ton** – Ändra inte läkarens sätt att uttrycka sig
- **Använd emojis sparsamt** – Bara i rubriker i blocken
- **Separera block med `---`** – Ger tydlig visuell separation
- **Var konsekvent** – Använd samma struktur och färger i liknande situationer
- **Testa i webbläsaren** – Eftersom du publicerar direkt kan du se resultatet omedelbart

