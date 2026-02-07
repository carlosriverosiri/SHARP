| Funktion | Status | Kommentar |\n|----------|--------|-----------|| År | Modell | Kontext (tokens) | Ökning |\n|-----|--------|------------------|---------|# AI Council - Vision och programförklaring

> Pragmatisk AI som verktyg, inte magi

**Datum:** 2026-02-07

---

## Grundprincip

AI är en verktygslåda - som en hammare eller skalpell. Värdet ligger i hur verktyget används, inte i verktyget självt. Målet är att förstärka mänsklig expertis, inte ersätta den.

---

## Tre pelare

### 1. Multi-modell med anti-hallucinationsfilter

**Idé:** Olika AI-modeller granskar varandras svar. Det är statistiskt osannolikt att fyra oberoende system hallucinerar exakt samma sak.

**Implementerat idag:**
- Parallella anrop till 4+ modeller (GPT, Claude, Gemini, Grok)
- Syntes som sammanfattar och jämför
- Deliberation där modeller granskar varandras påståenden
- Konsensusanalys (överensstämmelse, konflikter, unika insikter)
- Flaggning av påståenden utan källa

**Begränsning:** Fungerar bäst för kod och vetenskap där källor finns. Svagare för subjektiva frågor.

---

### 2. Voice-first + Mouse-first (hybrid input)

**Idé:** Tangentbord kräver finmotorisk filtrering som bromsar tankeflödet. Röst är intuitivt - man kan diktera medan man gör annat.

**Stanford-studien (2016):**
En studie från Stanford, University of Washington och Baidu visade:
- Röstinmatning är **3x snabbare** än tangentbord (163 vs 53 ord/minut)
- **20% lägre felfrekvens** med röst än med skrivning
- För mandarin: 2.8x snabbare, 63% lägre felfrekvens

Källa: hci.stanford.edu/research/speech/

**Implementerat idag:**
- Mikrofon för prompt-diktering (Web Speech API)
- Mikrofon för projektbeskrivningar med AI-sammanfattning
- Bild-inklistring (Ctrl+V) för analys
- Kamerafunktion på mobil

**Vision:**
- Prompta prompten - diktera ostrukturerat, låt AI strukturera
- Hands-free workflow mellan operationer
- Screenshot till AI-analys i ett steg

**Begränsning:** Transkriptionsfel förekommer. Fungerar bäst som hybrid, inte voice-only.
---

### 3. RAG - Kumulativ kunskap

**Idé:** Återanvänd din egen rådata. Slipp upprepa samma bakgrund varje gång. Bygg en personlig kunskapsbas som AI kan söka i.

#### Varför RAG är centralt

RAG (Retrieval-Augmented Generation) är inte som att bygga fysiska sensorer eller tillverka halvledare. Det är mjukvara - kod och databaser. Tekniken är beprövad: vektordatabaser, embeddings, semantisk sökning. Det som behövs är bara skalning - mer minne, snabbare processorer, större modeller.

Skillnaden mot hårdvaruinnovation är avgörande: När digitalkameror gick från 2 till 20 megapixel krävdes nya sensorer, nya linser, ny fysik. När RAG går från 10 000 till 1 000 000 tokens är det samma kod - bara mer av den.

#### Token-utvecklingen: Exponentiell tillväxt

| År | Modell | Kontext (tokens) | Ökning |
|-----|--------|------------------|---------|
| 2018 | GPT-1 | 512 | - |
| 2019 | GPT-2 | 1 024 | 2x |
| 2021 | GPT-3 | 2 048 | 2x |
| 2023 | GPT-3.5 | 16 000 | 8x |
| 2024 | GPT-4 Turbo | 128 000 | 8x |
| 2025 | GPT-5.2 | 400 000 | 3x |
| 2025 | GPT-4.1 API | 1 000 000+ | 2.5x |

Från 512 tokens till över 1 miljon på 7 år - en ökning på ca 2000x.

**Innebörd:** Det som idag kräver noggrann urvalsstrategi blir inom några år trivialt.

#### Implementerat idag
- Kunskapsbas med projekt och kategorier
- Spara AI-sessioner för återanvändning
- Zotero-integration för litteraturimport
- Projektkontext som auto-inkluderas

#### Inte implementerat (framtid)
- Embeddings/vektorsök i egna dokument (kräver pgvector)
- Automatisk kontext-injektion baserat på fråga
- Semantisk sökning över alla sessioner

**Begränsning idag:** Token-gränser kräver urval. Lösning: Bygg infrastrukturen nu, skalningen kommer gratis.
---

## Vad som saknas idag

| Funktion | Status | Kommentar |
|----------|--------|-----------|
| RAG med embeddings | Ej påbörjad | Kräver pgvector i Supabase |
| Streaming-svar | Ej påbörjad | Visar svar medan de genereras |
| Asynkron körning | Ej påbörjad | Notifikation när klart |
| Offline-stöd | Ej påbörjad | Fungerar utan nätverk |

---

## Tidsperspektiv

### Idag (2026)
- Multi-modell fungerar väl
- Voice finns men är komplement
- RAG är manuell (du väljer kontext)
- 400 000 tokens = ca 300 sidor text

### Om 2-3 år
- Token-gränser försvinner praktiskt (miljoner tokens)
- RAG blir automatisk - ingen manuell urvalsstrategi
- Voice blir naturligt val för de flesta

### Om 5+ år
- AI integrerat i vardagliga verktyg
- Voice-first som touch post-iPhone
- Personliga kunskapsbaser är norm

---

## Designprinciper

1. **Komplikationsfokus** - Vad kan gå fel? Flagga osäkerhet.
2. **Pragmatism** - Bygg det som fungerar, inte det som låter bra.
3. **Långsiktighet** - Patientnytta på 10 års sikt, inte snabba vinster.
4. **Kontroll** - Användaren bestämmer, AI föreslår.
5. **Transparens** - Visa varifrån svar kommer, vilka modeller som använts.
---

## Analogier

- **iPhone 2007:** Voice-first är där touch var då - ovant men naturligt när man vänjer sig.
- **Digitala kameror:** Idag är RAG som 2 megapixel. Om ett år är det 10. Skillnaden: kameror krävde ny hårdvara. RAG är bara kod.
- **Word för search:** AI Council är det verktyg som inte funnits - strukturerad multi-perspektiv-analys.

---

## Sammanfattning

AI Council är inte en chatbot. Det är ett verktyg för strukturerad analys där:

1. **Flera AI-modeller** granskar samma fråga (anti-hallucination)
2. **Röst och bild** gör input snabbare (3x enligt Stanford)
3. **Din kunskapsbas** ger kontext utan repetition (RAG)

Målet är inte att imponera - det är att vara användbart.

---

## Referenser

- Stanford HCI Group. (2016). Speech is 3x Faster than Typing for English and Mandarin Text Entry on Mobile Devices. https://hci.stanford.edu/research/speech/
- OpenAI Platform Documentation. Model context limits. https://platform.openai.com/docs/

---

*Baserat på dialog mellan Carlos Rivero Siri och Grok, 2026-02-07*