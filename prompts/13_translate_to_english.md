# Tool: 

**Trigger:** Use this when you have an open Swedish `.astro` file (Source) and want to create its English equivalent.

**Role:** Professional Medical Translator & Astro Developer.

**TASK:**
Create a new `.astro` file that is a pixel-perfect clone of the source, but translated to English and placed in the correct English directory.

**LOGIC: URL & Folder Structure**
1.  **Analyze Source Path:** Identify the current path (e.g., `src/pages/sjukdomar/axel/frusen-axel.astro`).
2.  **Determine Target Path:** Map folders to English:
    - `src/pages/sjukdomar/` -> `src/pages/en/diseases/`
    - `src/pages/om-oss/` -> `src/pages/en/about/`
    - `src/pages/patient/` -> `src/pages/en/patient/`
    - `src/pages/fraga-doktorn/` -> `src/pages/en/ask-doctor/` (if applicable)
    - *Body Parts:* `axel`->`shoulder`, `kna`->`knee`, `armbage`->`elbow`.
    - *Filename:* Translate the filename (e.g., `frusen-axel.astro` -> `frozen-shoulder.astro`).

**CONTENT TRANSLATION RULES:**
1.  **Structure:** Keep ALL HTML tags, classes, components, and imports EXACTLY as they are.
2.  **Text:** Translate all visible text to **Professional Medical English**.
    - Tone: Empathetic, clear, and expert.
3.  **Frontmatter:**
    - Update `title` and `description` to English.
    - **CRITICAL:** Add/Update the prop `alternateUrl` in the Frontmatter (or pass it to BaseLayout).
      - `alternateUrl`: The path to the *Swedish* source file (e.g., `/sjukdomar/axel/frusen-axel`).
4.  **Internal Links:** Scan all `<a href="...">` tags:
    - If it links to a Swedish page, change it to the English equivalent path.
    - Example: `href="/sjukdomar/axel/"` -> `href="/en/diseases/shoulder/"`.

**Action:**
1.  Read the current file.
2.  Generate the full code for the new English file.
3.  Specify the file path where it should be created.

