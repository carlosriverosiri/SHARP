# AI Council — Referensbiblioteksbyggare (vetenskaplig litteratursökning)

**Syfte:** Bygg ett brett PDF-bibliotek av hög vetenskaplig kvalitet genom att låta AI Council (med live-webbsökning aktiverad) söka oberoende och leverera klickbara länkar. Slutlistan är en **sammanslagning av alla unika artiklar** som modellerna hittat — du sorterar själv ut det du behöver.

**Målgrupp för texten som byggs:** **Kollegor** — kirurger, läkare, sjukgymnaster/fysioterapeuter och annan vårdpersonal med god klinisk kompetens (djup, evidens och nyanser). Webbplatsen är **inte** primärt till för patienter eller patientrekrytering; **litteraturval och skrivdjup** ska alltid utgå från **professionella** läsare. Om någon utanför vården råkar läsa en sida ska tonen fortfarande vara korrekt och ansvarsfull, men **optimera aldrig** för låg nivå patientbroschyr.

**Tänkt arbetsflöde:**
1. Klistra in prompten nedan (anpassad med ditt ämne) i AI Council.
2. Aktivera **"Låt modeller söka på nätet"** och gärna **"Låt modeller söka även i deliberering"**.
3. Kör Council i **Avancerad tier** (fler modeller = fler oberoende sökspår).
4. Kopiera **hela Zotero-listan** från slutsvaret och importera till Zotero.
5. Gå igenom artiklarna i Zotero och ladda ner PDF:er via din institutions åtkomst.
6. Artiklar du inte får tag på kan du begära via fjärrlåne.

---

## Promptmall

Byt ut `[TOPIC]` mot ditt kliniska område, t.ex. *AC joint dislocation*, *shoulder dislocation*, *frozen shoulder* osv.

```
You are a group of independent research librarians. Your task is to find a broad, high-quality collection of scientific articles on [TOPIC] that an experienced shoulder and elbow surgeon needs in order to write an **evidence-based, clinician-oriented** clinical summary for publication on a **public clinic website**.

**Audience (important):** Intended readers are **surgeons, physicians, physiotherapists / physical therapists, and healthcare professionals** with strong clinical training. **The site targets colleagues, not patient acquisition or lay education** — select and prioritise literature for **depth**: nuanced evidence, surgical trade-offs, rehabilitation science, complications, and guideline-level detail. A public URL may occasionally be read by non-clinicians; keep accuracy and responsible framing, but **never** optimise the reference set or implied writing level for lay “patient brochure” education.

IMPORTANT: All output must be in English.

SEARCH STRATEGY
- Prioritise articles published within the last 2 years. Also include important older articles (up to 25 years) if they are landmark studies, key RCTs, or foundational classification papers.
- Include: systematic reviews, meta-analyses, high-quality RCTs, current guidelines (AAOS, ESSKA, Cochrane, NICE), large cohort studies, well-cited classification papers, articles on return to work, return to sport, or return to previous activity level, and articles specifically focused on surgical complications.
- Articles whose PRIMARY focus is surgical complications (not just mentioning complications in passing) should be rated highly and always included.
- Avoid: case reports, commentaries, editorials, and low-impact articles.
- Search in English, but include European studies where relevant.
- Be generous: include articles that touch on related or peripheral topics if they are clinically relevant and high quality. More references is better than fewer — the clinical author will curate the final selection.

DELIVERY REQUIREMENTS
- Each model should deliver as many verified references as possible, ideally 15–25 per model.
- Each reference must include:
  1. Authors (first + et al.), year
  2. Full title
  3. Journal
  4. PMID if available (format: PMID: 12345678)
  5. DOI if available (format: doi:10.xxxx/...)
  6. Clickable link to full text or abstract (PubMed, DOI.org, or journal website)
- Number the list sequentially.

SORTING
Sort references in this order:
1. Systematic reviews and meta-analyses
2. Guidelines (AAOS, ESSKA, Cochrane, etc.)
3. RCTs
4. Cohort studies and classification articles
5. Surgical complications (articles where complications are the primary focus)
6. Return to work / return to sport / return to previous level

SYNTHESIS INSTRUCTION
The super-synthesis should NOT try to select the "best" articles. Instead, it should produce a **merged, deduplicated list of all unique references** found across all models, sorted by category. Keep every article that at least one model found, as long as it has a verifiable identifier. The clinical author will do the final curation.

If the super-synthesis includes **any narrative summary** before or after the bibliography, use **inline [1], [2], …** in that prose and keep numbering consistent with the merged list; every reference row must include a **full clickable URL**.

ZOTERO BULK IMPORT LIST
After the merged reference list, add a section titled **Zotero Bulk Import List**.
Instruction above the code block: *Copy the list below and paste into Zotero → Add Item by Identifier (magic wand icon).*
The code block should contain one identifier per line (PMID as a number, DOI as a full string, or full URL if nothing else is available). No blank lines. Include ALL unique identifiers from all models.

QUALITY ASSESSMENT
Finish with a short table (markdown) ranking the 5 most important articles across all models:

| # | Title (short) | Type | Why important |
|---|---|---|---|

CONSTRAINTS
- Do NOT fabricate references. If you cannot verify an article, omit it.
- If you are uncertain whether an article exists, mark it with ⚠️ and explain why.
- Prefer completeness over brevity. The clinical author prefers to have too many real articles and curate down, rather than too few.
```

---

## Inställningar i AI Council

| Inställning | Rekommenderat |
|---|---|
| Tier | Avancerad |
| Live-sök Runda 1 | På |
| Live-sök i deliberering | På |
| Systemprompt | Carlito · evidens · Zotero (eller din egen) |
| Syntesmodell | Gemini Pro (standard) eller Claude Opus för bättre sammanslagning |
| Rotera delibereringsroller | Valfritt |

## Exempelanvändning

**Ämne:** AC-ledsluxation (acromioclaviculär luxation)

Byt ut `[TOPIC]` i promptmallen ovan till:

```
acromioclavicular joint dislocation (Rockwood type I-VI), including classification, surgical vs conservative treatment, return to work, and return to sport
```

## Tips
- **Tidsfönster:** Prompten prioriterar artiklar från de senaste ~2 åren; viktiga äldre källor kan inkluderas upp till **25 år** bakåt (landmärken, nyckel-RCT, klassifikationer).
- Om du har tillgång via din institution (t.ex. Karolinska, Uppsala): öppna länkarna i en webbläsare som är inloggad mot bibliotekets proxy.
- Artiklar bakom paywall som du inte når kan du ofta begära via din institutions fjärrlåneservice.
- Kör gärna prompten en andra gång med ett snävare underämne (t.ex. bara "return to sport after AC joint reconstruction") för att komplettera biblioteket.
- Förvänta dig 30–50 unika artiklar per körning. Du sorterar sedan bort det du inte behöver — det är snabbare att ta bort än att söka nytt.
- Artiklar du inte kan ladda ner PDF:en på kan du lämna kvar i Zotero och begära via fjärrlån senare.

Se även: `17_ai_council_anatomy_reference_library.md` (tätare anatomibibliotek), `18_ai_council_anatomy_website_block.md` (kort publicerbar anatomitext), `19_ai_council_diagnosis_from_pdfs.md` (syntes från egna PDF:er).
