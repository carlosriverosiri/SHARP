# Master Prompt: Create Diagnosis Page (ENGLISH)

**Role:** Senior Medical Copywriter & Astro Developer.
**Task:** Create a complete `.astro` page in ENGLISH based on the provided raw notes and reference list.

**Input:**
1. **Raw Medical Notes:** (Data from NotebookLM).
2. **Zotero Reference List (Crucial):** A bibliography list containing valid URLs/DOIs.
3. **Diagnosis Name.**
4. **Source URL (Optional):** Link to existing site for image hotlinking.

**Output Requirements:**
1.  **File Creation:** Create `src/pages/en/diseases/[bodypart]/[diagnosis].astro`.
    * *Note:* Ensure the folder structure `src/pages/en/` exists.
2.  **Content:** Write professional, empathetic **English** copy.
3.  **Design & Tech:** Follow the exact design system (Tailwind, BaseLayout, Components) as defined in `src/pages/sjukdomar/axel/ac-ledsartros.astro`.

**STRICT REFERENCE SAFETY & MATCHING:**
- **The Problem:** NotebookLM data often lacks links (says "MISSING").
- **The Solution:** You must cross-reference the text citations with the "Zotero Reference List".
- **Algorithm:**
  1. Identify a citation in the text (e.g., "Smith 2020").
  2. Look for the corresponding entry in the provided "Zotero Reference List".
  3. Extract the URL/DOI from the Zotero entry.
  4. Use that confirmed URL in the `<RefLink>` or Reference List.
- **Fallback:** If a study is mentioned but NOT found in the Zotero list, use `href="#"`.

**IMAGE STRATEGY:**
- **Scenario A (Source URL provided):** Fetch the `og:image` from the URL, hotlink it, and add a TODO comment.
- **Scenario B (Local Filename):** Use `/images/diseases/...` path.
- **Scenario C (None):** Use a placeholder.

**Structure:**
- Hero, Symptoms, Diagnosis, Treatment (Surgery vs Conservative), Return to Sport (Play vs Performance), FAQ, References.

**CITATION FORMAT:**
- Always place references AFTER the period, not before
- ❌ WRONG: `...spontaneously[22].`
- ✅ CORRECT: `...spontaneously.[22]`

**CLINICAL EXPERIENCE BLOCKS:**
- Use **indigo/purple** background for author's clinical experience, personal insights, and clinical pearls
- Distinguish from evidence-based information (which uses other colors)
- Format example:
```html
<div class="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
  <h5 class="font-bold text-indigo-800 text-xs mb-1">💡 Clinical Pearl</h5>
  <p class="text-xs text-slate-600 italic">
    In 15+ years of practice using this approach, [clinical observation/experience].
  </p>
</div>
```
- Use for: Personal clinical observations, expert opinions, practice patterns, clinical pearls
- Icon: 💡 or 👨‍⚕️





