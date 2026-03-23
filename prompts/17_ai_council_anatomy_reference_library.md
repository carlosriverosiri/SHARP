# AI Council — Anatomi: referensbibliotek (färre artiklar, struktur & bilddiagnostik)

**Syfte:** Samma arbetsflöde som referensbiblioteket (#16), men **inriktat på normal anatomi** (och normala bildfynd) med **högst ~10 verifierade referenser per modell**. Passar valfri region: axel, armbåge, AC-led, knä, höft m.m.

**När använda denna mall i stället för #16:** Du vill ha en **tätare, mer fokuserad** källlista till text/illustration — inte 15–25 artiklar per modell.

**Tänkt arbetsflöde:** Som i #16 (live-sök, avancerad tier, Zotero, supersyntes som slår ihop unika ID:n).

---

## Promptmall

Byt ut `[TOPIC]` mot det du vill beskriva, t.ex.:

- `normal anatomy of the acromioclavicular joint`
- `elbow joint osteology and collateral ligaments`
- `normal meniscal anatomy of the knee on MRI`

```
You are a group of independent research librarians. Your task is to find a **focused, high-quality** collection of scientific articles on **[TOPIC]** — **normal human anatomy** and, where relevant, **typical imaging appearance** (plain radiography, CT, MRI) of normal structures — that an experienced orthopaedic surgeon needs to support **clinician-oriented** educational content on a **public clinic website**.

**Audience (important):** **Primary and intended** readers are **surgeons, physicians, physiotherapists / physical therapists, and other healthcare professionals** with strong clinical background. **The site is not aimed at patient recruitment or lay education** — **do not** reduce the literature selection to “patient brochure” level. Incidental lay readership on a public URL is possible; keep accuracy and responsible framing, but **always** prioritise **collegial depth** (anatomy, imaging, surgical relevance).

IMPORTANT: All output must be in English.

SEARCH STRATEGY — anatomy-first
- Prioritise sources that explicitly address: **ligaments**, **joint capsule**, **tendons** and musculotendinous attachments, **osseous morphology** and variants, **fascia** and intermuscular septa where relevant, **cadaveric / dissection** studies, **surgical anatomy** (exposures, safe zones, tunnels, footprints), and **high-quality narrative reviews or scoping reviews** focused on anatomy or imaging anatomy of the region.
- Include **imaging of normal anatomy** where useful: radiographic landmarks, standard MRI planes and signal characteristics of **normal** structures (avoid over-weighting purely pathological series unless needed to define “normal vs abnormal” boundaries).
- Prioritise articles from the **last 2–3 years** where possible; add **older landmark** dissection, morphology, or imaging-atlas papers if still authoritative.
- **Cap:** each model must deliver **at most 10 verified references** (aim for **6–10**). **Never exceed 10 per model.**
- Avoid padding with weak case reports, opinion pieces, or off-topic injury-outcome studies unless they contain **exceptional** anatomical detail you can verify.

DELIVERY REQUIREMENTS
- Each reference must include:
  1. Authors (first + et al.), year
  2. Full title
  3. Journal (or book/chapter if applicable)
  4. PMID if available (format: PMID: 12345678)
  5. DOI if available (format: doi:10.xxxx/...)
  6. Clickable link to abstract or full text (PubMed, DOI.org, publisher)
- Number the list sequentially.

SORTING (within each model’s list)
1. Narrative / scoping reviews of anatomy or imaging anatomy
2. Cadaveric or dissection studies; morphology / morphometry
3. Surgical anatomy
4. Imaging-focused normal anatomy (MRI / radiographs / CT)
5. Other high-quality structural references

SYNTHESIS INSTRUCTION
The super-synthesis should **merge and deduplicate** all unique references from all models (same rule as the main reference library). **Do not** try to pick only “the best few” at the expense of losing verifiable items. The clinical author will curate. **Respect the per-model cap of 10** in Round 1 / deliberation outputs; the merged list may be shorter than in broad literature runs because each model contributed fewer items.

If the super-synthesis includes **narrative prose** (not only a flat bibliography), use **inline citation numbers [1], [2], …** in the text and a matching **numbered References** section at the end; each reference line must include a **full clickable URL** (PubMed, DOI, or publisher).

ZOTERO BULK IMPORT LIST
After the merged reference list, add **Zotero Bulk Import List** with one identifier per line (PMID, DOI, or URL), no blank lines, all unique IDs from all models.

QUALITY ASSESSMENT
Finish with a **short** markdown table: **up to 5** of the most useful sources for **understanding normal anatomy + imaging** of [TOPIC] (not necessarily the newest — landmark dissection or atlas papers may rank high).

CONSTRAINTS
- Do NOT fabricate references.
- If uncertain, mark with ⚠️ and explain.
- **Hard limit:** ≤10 references per model in every model’s own list.
```

---

## Tips

- För AC-leden: lägg till i `[TOPIC]` t.ex. *coracoclavicular ligaments, AC capsule, deltotrapezial fascia, Rockwood-relevant morphology* om du vill styra sökningen.
- Om du behöver **fler** artiklar igen: använd prompt **#16 Referensbibliotek** (15–25 per modell).

Se även: `16_ai_council_reference_library_builder.md` för bredare evidensbibliotek. För **kort publicerbar anatomitext** till sidan (tre längder, B/C/D): `18_ai_council_anatomy_website_block.md`.
