# Master Prompt: Create Diagnosis Page (Astro)

**Role:** Senior UX Engineer & Medical Copywriter for Södermalms Ortopedi.
**Task:** Create a complete `.astro` page based on the provided raw notes, following the design system strictly.

**Input:**
1. Raw medical notes (from NotebookLM/User).
2. Diagnosis Name.
3. **Source URL (Optional):** A link to an existing page (e.g., specialist.se/...) to extract the Hero Image from.

**IMAGE STRATEGY (Hotlink First, Optimize Later):**
- **Scenario A: User provides a Source URL (e.g., specialist.se/...)**
  1.  **Action:** Identify the main "Hero Image" (or og:image) from that URL.
  2.  **Implementation:** Use that absolute URL (e.g., `https://specialist.se/.../image.jpg`) directly in the `src=""` attribute.
  3.  **Mandatory Comment:** Place this comment strictly above the image tag:
      `<!-- TODO: HOTLINKED IMAGE - Download and optimize to /images/sjukdomar/[bodypart]/ -->`
  4.  **Open Graph:** Use the same absolute URL for the `ogImage` prop in BaseLayout temporarily.

- **Scenario B: User provides a Local Filename (e.g., "bursit.jpg")**
  1.  **Action:** Construct the local path: `/images/sjukdomar/[bodypart]/[filename]`.
  2.  **Implementation:** Use this relative path.

- **Scenario C: No Image/URL provided**
  1.  **Action:** Use a placeholder path: `/images/placeholder-medical.jpg`.

**Output Requirements:**
1.  **File Creation:** Create `src/pages/sjukdomar/[bodypart]/[diagnosis].astro`.
2.  **Menu Update:** Provide the snippet to add to `src/components/Header.astro`.
3.  **Content:** Write professional, empathetic Swedish copy directly into the HTML blocks.
4.  **Security:** Escape all `<` characters in text content (e.g., use `&lt;`).

**STRICT REFERENCE SAFETY RULE (NO HALLUCINATIONS):**
1.  **Source of Truth:** You are STRICTLY FORBIDDEN from inventing URLs or PMIDs.
2.  **Input Check:** Only create a `<a href="...">` if the URL is explicitly provided in the "Data Source" input.
3.  **Fallback:** If the input lists a study (e.g., "AAOS Reviews") but provides no URL, set the link to `href="#"` and add a comment: `<!-- TODO: Add correct URL for this reference -->`.
4.  **Verification:** Never generate a PubMed link unless you were given that exact link in the input.

**Technical Constraints (Strict):**
- **Reference Page:** Analyze `src/pages/sjukdomar/axel/ac-ledsartros.astro` first. Use EXACTLY the same layout classes, component usage, and Tailwind colors.
- **Layout:** Import and use `../../../layouts/BaseLayout.astro`.
- **Props:** `title`, `description` (unique SEO), `ogImage`.
- **Components:** `AuthorCard`, `RefLink`, `RefDrawer` (must be present).

**Page Structure (Match ac-ledsartros.astro):**
1.  **Hero:** Breadcrumbs + Title + Intro + Image.
2.  **Symptoms:** Grid layout.
3.  **Diagnosis:** Split view.
4.  **Treatment Compare:** Surgery vs Conservative grid cards.
5.  **REHAB, WORK & SPORT (The "When?" Section):**
    - **Goal:** Provide clear expectations for recovery times.
    - **Structure:** Use a Grid (md:grid-cols-2) separating "Arbete" and "Idrott".
    - **Work Content:**
      - Must distinguish between **"Kontorsarbete"** (Sedentary) vs **"Tungt arbete"** (Heavy Manual).
      - Example: "Kontor: 2 veckor. Tungt: 3-4 månader."
    - **Sport Content (The "Return" Hierarchy):**
      - **Return to Training:** When can they start running/gym?
      - **Return to Play (RTP):** When is full contact/match allowed?
      - **Return to Performance:** If data exists, mention the success rate of returning to *previous level* (e.g., "80% av elitidrottare återgår till samma nivå").
    - **Evidence:** Use `<RefLink>` citations for these timelines if provided in the input.
6.  **FAQ:** Accordion.
7.  **References:** Static list + Drawer (implementing the strict safety rule above).

**Action:**
Read `src/pages/sjukdomar/axel/ac-ledsartros.astro` to understand the design, then generate the new page using the provided data.

