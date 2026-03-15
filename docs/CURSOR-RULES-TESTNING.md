# Cursor Rules: Testguide

> Praktisk guide för att testa att `.cursor/rules/*.mdc` fungerar som tänkt i `SHARP`.

## Syfte

Det här dokumentet hjälper dig att kontrollera att Cursor faktiskt läser in de nya projektreglerna och att de påverkar modellens beteende i en **ny chat i samma projekt**.

Du testar framför allt att modellen:

- följer projektets Astro/UI-mönster
- tänker på tillgänglighet utan att du behöver upprepa det
- håller sig till tydliga TypeScript-mönster
- respekterar AI Council-lager mellan `ai-core` och `ai-council`
- föreslår commit/push men **inte kör det automatiskt**

---

## Förutsättningar innan du testar

Kontrollera att följande finns i projektet:

- `.cursor/rules/core-standards.mdc`
- `.cursor/rules/astro-ui-patterns.mdc`
- `.cursor/rules/ai-council-architecture.mdc`
- `.cursor/rules/documentation-sync.mdc`
- `.cursor/rules/assistant-workflows.mdc`
- `.cursor/rules/multimodal-debugging.mdc`
- `.cursor/rules/git-workflow.mdc`

Samt:

- `.cursorrules` ska nu vara en kort legacy-fil
- `.gitignore` ska tillåta `.cursor/rules/`

Om rules nyligen skapades eller ändrades:

1. Kör `Developer: Reload Window` i Cursor
2. Öppna sedan en **ny chat**
3. Testa i samma `SHARP`-projekt, inte i ett annat projekt

---

## Viktigt: testa i ny chat

Testa **inte** i en gammal chat med lång historik.

Använd i stället:

1. samma projekt (`SHARP`)
2. en helt **ny chat**
3. en liten, tydlig uppgift

Det gör det lättare att avgöra om det verkligen är rulesen som styr beteendet.

---

## Rekommenderad testordning

1. Kör ett UI/Astro-test i `Enkät`
2. Kör ett API/TypeScript-test i `Enkät`
3. Kör git-test genom att skriva `push`
4. Kör ett separat AI Council-test om du vill verifiera lagerregeln

Om redan Test 1 + `push` beter sig rätt är det ett starkt tecken på att rules fungerar.

---

## Snabbtest: 3 minuter

Öppna en ny chat och klistra in:

```text
Lägg till en liten informationsruta överst i src/pages/personal/enkat.astro som kort förklarar syftet med enkätsidan för personalen. Håll dig till projektets befintliga Astro- och UI-mönster, tänk på tillgänglighet och uppdatera relevant dokumentation om det behövs.
```

När modellen svarat eller gjort ändringen, skriv:

```text
push
```

### Snabb bedömning

Rules fungerar sannolikt om modellen:

- håller sig till Astro-mönster
- tänker på a11y
- nämner relevant dokumentation
- föreslår commit/push men inte kör något automatiskt

---

## Fullt testflöde

## Test 1: UI / Astro / tillgänglighet / docs

### Prompt att klistra in

```text
Lägg till en liten informationsruta överst i src/pages/personal/enkat.astro som kort förklarar syftet med enkätsidan för personalen. Håll dig till projektets befintliga Astro- och UI-mönster, tänk på tillgänglighet och uppdatera relevant dokumentation om det behövs.
```

### Det du testar

- `astro-ui-patterns.mdc`
- `documentation-sync.mdc`
- delar av `core-standards.mdc`

### Bra tecken

- modellen håller logik och markup enligt Astro-mönster
- modellen nämner semantik eller tillgänglighet
- modellen försöker använda befintliga UI-klasser/mönster
- modellen tar upp relevant dokumentation

### Varningssignaler

- modellen hittar på helt nytt knappspråk eller nya ikonprinciper
- modellen ignorerar tillgänglighet helt
- modellen föreslår saker som strider mot projektets designmönster

---

## Test 2: API / TypeScript / liten fokuserad förbättring

### Prompt att klistra in

```text
Gör en liten förbättring i en av API-rutterna under src/pages/api/enkat så att felhanteringen blir tydligare och typerna explicitare. Följ projektets TypeScript-standard och håll ändringen liten och fokuserad.
```

### Det du testar

- `core-standards.mdc`
- `documentation-sync.mdc`

### Bra tecken

- modellen använder tydliga typer
- modellen undviker slarvig `any`
- modellen gör en rimligt liten förbättring
- modellen nämner verifiering eller kontroll av resultat

### Varningssignaler

- modellen börjar med stor refaktor utan att du bett om det
- den använder generisk eller svag typning
- den ignorerar projektets etablerade struktur

---

## Test 3: Git-regeln

Gör detta efter en liten ändring.

### Prompt att klistra in

```text
push
```

### Det du testar

- `git-workflow.mdc`

### Rätt beteende

Modellen ska:

- föreslå ett commit-meddelande
- föreslå ett git-kommando
- **inte** köra `git add`, `git commit` eller `git push` automatiskt
- vänta på din bekräftelse

### Fel beteende

Modellen ska **inte**:

- pusha direkt
- committa direkt
- köra git-kommandon utan din uttryckliga bekräftelse

---

## Test 4: AI Council-lager

Det här testet är valfritt men bra om du vill verifiera den mest tekniska regeln.

### Prompt att klistra in

```text
Jag vill lägga till ny logik för AI Council. Hjälp mig avgöra om den ska ligga i src/lib/ai-core eller src/lib/ai-council och implementera den på rätt ställe.
```

### Det du testar

- `ai-council-architecture.mdc`

### Rätt beteende

Modellen ska resonera ungefär så här:

- kräver detta DOM eller inte?
- UI-agnostisk logik ska till `src/lib/ai-core/`
- DOM- eller Astro-nära logik ska till `src/lib/ai-council/`

### Varningssignal

Om modellen direkt blandar DOM-logik i `ai-core` utan resonemang följs regeln sannolikt sämre.

---

## Bonus: test av prompt/workflow-regeln

### Prompt att klistra in

```text
COUNCIL: Hur bör jag förbättra arbetsflödet i enkätsystemet utan att göra UI:t mer komplext?
```

### Det du testar

- `assistant-workflows.mdc`

### Rätt beteende

Modellen bör svara som ett litet råd eller flera perspektiv med en kort syntes, inte bara ge ett platt standardsvar.

---

## Bonus: test av screenshot- och dikteringsregeln

Det här testet är bra om du ofta arbetar med bifogade bilder eller dikterade felbeskrivningar.

### Prompt att klistra in

```text
Jag bifogar en screenshot av ett UI-problem. Hjälp mig analysera vad som ser fel ut visuellt, koppla det till projektets befintliga designmönster och hitta den mest sannolika filen att ändra.
```

### Det du testar

- `multimodal-debugging.mdc`

### Rätt beteende

Modellen bör:

- titta på spacing, alignment, färger, kontrast och border-radius när det är relevant
- använda visuella ledtrådar och projektkontext för att hitta sannolik fil
- vara tolerant mot dikterade småfel i texten
- fråga kort om bilden eller instruktionen är för tvetydig för att ge en säker fix

---

## Hur du bedömer resultatet

Rules fungerar sannolikt bra om modellen upprepade gånger:

- följer projektets UI- och kodmönster bättre än tidigare
- tänker på dokumentation utan extra påminnelser
- håller sig till tydligare typer och struktur
- respekterar git-flödet och inväntar bekräftelse

Du behöver inte att allt blir perfekt. Om 3 av 4 huvudpunkter sitter är rulesen redan användbara.

---

## Om rules inte verkar fungera

Gör detta i ordning:

1. Kontrollera att du testar i en **ny chat**
2. Kör `Developer: Reload Window`
3. Kontrollera att rule-filerna verkligen ligger i `.cursor/rules/`
4. Kontrollera att `.gitignore` inte blockerar `.cursor/rules/`
5. Testa om samma prompt i en ny chat igen

---

## Min rekommenderade första testsekvens

Om du bara vill göra ett enda praktiskt test:

1. Öppna en ny chat i `SHARP`
2. Klistra in denna prompt:

```text
Lägg till en liten informationsruta överst i src/pages/personal/enkat.astro som kort förklarar syftet med enkätsidan för personalen. Håll dig till projektets befintliga Astro- och UI-mönster, tänk på tillgänglighet och uppdatera relevant dokumentation om det behövs.
```

3. När den är klar, skriv:

```text
push
```

Om modellen då:

- beter sig som en Astro/UI-medveten projektassistent
- tar upp docs
- föreslår git-flöde utan att köra det

då fungerar rulesen sannolikt tillräckligt bra för praktisk användning.

---

## Notering

Den här testguiden är avsedd att vara öppen bredvid när du provar rules i Cursor. Den är skriven för **praktisk testning**, inte som intern implementation-spec för själva rule-filerna.
