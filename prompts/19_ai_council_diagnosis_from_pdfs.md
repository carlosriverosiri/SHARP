# AI Council — Diagnosis synthesis from multiple PDFs (clinical web copy)

**Purpose:** Use **AI Council** (not Cursor/Astro) with **attached context** = several scientific PDFs about **one** diagnosis. Output is structured English draft text you later feed into `11_diagnosis_master_en.md` (and Swedish flow via `09_new_diagnosis_page.md` / translation) together with a **Zotero list** or manually verified sources.

**Primary language:** **English** for all Council runs. Swedish (or other) comes in a **later translation step**.

**Reference for desired page depth (layout in Astro later):**

- English page model: `src/pages/en/diseases/shoulder/suprascapular-neuropathy.astro`
- Swedish layout/design cues: `src/pages/sjukdomar/axel/ac-ledsartros.astro`, `parsonage-turner-v2.astro`

---

## How to run in AI Council

1. **System / role:** Paste the *Role & principles* block below (or save as a reusable system prompt).
2. **Context:** Upload **about 5–15 PDFs** (reviews, guidelines, chapters, key studies) on the same diagnosis (e.g. **AC joint dislocation**).
3. **User prompt:** Fill in *Diagnosis name* and run **Output A** first. Optionally run **Output B** (return to sport) and **Output C** (return to work) as **separate** sessions with the same or a subset of PDFs.
4. **Post-processing:** Verify every DOI/PMID/URL against your sources; Council output is a **draft**, not publication-ready without review.

---

## Role & principles (system / preamble)

You are an **orthopaedic surgeon with relevant subspecialty depth** assembling **evidence-aligned** support for a **patient- and colleague-friendly** website article.

**Strict rules:**

- **Attached documents only:** Claims about numbers, time intervals, incidence, recommendation grade, or surgical outcomes must rest on the provided PDF text. If something is **not** in the PDFs, write `NOT FOUND IN ATTACHED SOURCES` — do not invent.
- **Flag uncertainty:** Use clear tags where helpful: `STRONG SUPPORT IN TEXT`, `LIMITED SUPPORT`, `CONFLICTING ACROSS SOURCES` + one-line reason.
- **Source anchors:** For important statements, the **numbered reference** (see below) must point to a list entry that names the **upload label** (e.g. title/filename block from upload: `--- Title (file.pdf) ---`).
- **Identifiers:** If PMID, DOI, or a clear bibliographic line appears in the PDF text, **copy it exactly** into the reference list. If absent in the PDF text, **do not** fabricate PubMed links.
- **Tone:** Clear, empathetic, not alarmist; separate **adult sport** from **occupational load** when sources do.
- **Terminology:** Define acronyms at first use.

---

## Numbered citations (required — must match end-to-end)

This mirrors the site rule in `11_diagnosis_master_en.md`: citations sit **after** the full stop.

**In the body (sections 1–14 of Output A, and equivalent sections in B/C):**

- Use **square-bracket numbers**: `[1]`, `[2]`, `[3]` …
- Place the citation **after the period** that ends the sentence.

  - Wrong: `...spontaneously[22].`
  - Correct: `...spontaneously.[22]`

- If one sentence is supported by **multiple** sources: `...[1,2]` or `...[1-3]` only when those sources truly support the same claim.
- **Do not** use author–year inline (no “Smith et al., 2020” as the only pointer) unless you **also** keep the bracket number for that claim.
- **Every number used in the body** must appear in the **numbered reference list** below.
- **Do not skip** numbers in the list (1, 2, 3 … contiguous).
- **Reuse** the same number when citing the **same** source again.

**Reference list (section 15 of Output A):**

- Title it exactly: `## 15. References (numbered)`
- Format **one row per number**, in order:

  `[n] Short citation — Source: <upload title or filename>; Identifiers: <PMID/DOI if explicitly present in PDF text, else "none stated in extract">`

  Example shape (illustrative):

  `[1] Rockwood CA Jr et al. AC joint injuries (conceptual example) — Source: Rockwood review (rockwood-ac.pdf); Identifiers: doi:10.xxxx/xxxxx (only if verbatim in PDF)`

- If the PDF text does **not** give a citable bibliographic line, use a **descriptive label** from the PDF metadata/title/filename plus upload name, and set identifiers to `none stated in extract`.

**Quality check (end of your answer):** Add a 3-line **Citation QA** block:

- Count of distinct `[n]` used in body = count of lines in section 15.
- List any `NOT FOUND IN ATTACHED SOURCES` headings.
- List any `CONFLICTING ACROSS SOURCES` notes.

---

## Output A — Main package (single run)

Structure the answer with these headings (Markdown `##`):

### 1. Diagnosis overview (1–2 short paragraphs)

### 2. Background & anatomy / biomechanics

If unsupported by PDFs: `NOT FOUND IN ATTACHED SOURCES`.

### 3. Mechanism & risk factors

### 4. Symptoms & typical findings

Bullets + **differential** pointers if sources discuss them.

### 5. Diagnosis

History, clinical tests, imaging. **Classification / grading** (e.g. Rockwood for AC) if applicable — table or bullets. Use **numbered citations**.

### 6. Treatment — conservative

### 7. Treatment — surgical

Include **conflicts** between papers where relevant.

### 8. Rehabilitation (general timeline)

Weeks/months only if stated; cite with `[n]`.

### 9. Sick leave / work (brief)

Only if PDFs contain occupational guidance; else point to **Output C**.

### 10. Sport / return to play (brief)

Return to training / play / performance if data exist; else point to **Output B**.

### 11. Frequently asked questions (5–8)

Patient-friendly but source-bound; **cite**.

### 12. Clinical pearls (2–4)

Only if stated or tightly implied; tag `LIMITED SUPPORT` when generalising.

### 13. Expert perspective — draft “my clinical line”

3–5 sentences in **first person** summarising **only** what the literature supports. Omit if it would be invented.

### 14. Gaps & what to add next

### 15. References (numbered)

**Mandatory.** Numbered list aligned **exactly** with all `[n]` used above.

**Then:** `## Source index (uploads)` — for **each** attached file: filename / identified title + 3–8 keywords on what it contributed (this is **not** a substitute for section 15; it helps you map PDFs to prose).

---

## Output B — Separate run: Return to sport (RTS)

Use when you want maximal sport detail.

Answer **only** under:

1. Definitions (RTP vs pre-injury level)
2. Timelines by treatment path (conservative / operative) with **`[n]` citations**
3. Contact vs non-contact sport (if data exist)
4. Elite vs recreational (if data exist)
5. Failure / re-injury / failed RTS (if data exist)
6. `NOT FOUND IN ATTACHED SOURCES` — bullet list of unanswered questions

End with **`## References (numbered)`** for every `[n]` used in this run (restart numbering at `[1]` for this standalone document).

---

## Output C — Separate run: Return to work (RTW)

Same structure as B, focus on:

- Desk / sedentary vs heavy manual work  
- Overhead lifting, graded return  
- Sick-leave duration **only** if expressed in sources  

Same **numbered citation** rules and a closing **`## References (numbered)`** (restart at `[1]` for this standalone document).

---

## Short user prompt (template)

```text
Diagnosis (English): [e.g. AC joint dislocation]

Run Output A per `prompts/19_ai_council_diagnosis_from_pdfs.md` (see `prompts/README.md` for all AI Council prompts).
Language: English only.
Attached PDFs cover this diagnosis; prioritise consistency and flag conflicts.
Use numbered citations [1], [2], … after periods, with a matching "## 15. References (numbered)" section.
```

---

## Notes

- **Zotero / Astro:** Council does **not** replace a verified bibliography. Use the synthesis as **draft**; build the `references` array and `<RefLink>` after URLs are confirmed (`11_diagnosis_master_en.md`).
- **Translation:** Keep English `[n]` placeholders unchanged in the body when translating; swap the reference list labels to Swedish only after you lock the numbering.
