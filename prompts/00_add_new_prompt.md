# System Librarian: New Prompt Ingestor

**Trigger:** Use this prompt when you have raw text (from Gemini/ChatGPT) that you want to save as a reusable tool in your library.

**Your Task:**
1.  **Analyze the Input:** Read the text provided by the user to understand its purpose (e.g., "Rehab protocol generator" or "SEO optimizer").
2.  **Determine File Name:**
    * Scan the `prompts/` folder to find the highest existing number (e.g., if `07` exists, the new one is `08`).
    * Create a short, descriptive English filename in snake_case (e.g., `08_seo_optimizer.md`).
    * **Related pairs:** If a prompt is a sibling of an existing one (same workflow, variant), use a grouped prefix like `12_1_…` and `12_2_…` instead of burning a new top-level number — see **Grupp 12** in `prompts/README.md`.
    * If the prompt is meant to run in **AI Council** (multi-model app, PDF context, Zotero workflow), include **`ai_council`** in the name (e.g., `20_ai_council_topic_research.md`). See `prompts/README.md` for the split between AI Council vs Astro/Cursor prompts.
3.  **Create the File:**
    * Create the new file in `prompts/` with the calculated number and name.
    * Paste the user's content into it.
4.  **Update Index:**
    * Add a one-line entry to `prompts/README.md` in the correct section (AI Council vs Webb/Cursor / grupp).
5.  **Confirm:**
    * Respond to the user: "Saved as [Filename] and indexed in `prompts/README.md`."

