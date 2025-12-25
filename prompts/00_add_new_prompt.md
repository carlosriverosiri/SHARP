# System Librarian: New Prompt Ingestor

**Trigger:** Use this prompt when you have raw text (from Gemini/ChatGPT) that you want to save as a reusable tool in your library.

**Your Task:**
1.  **Analyze the Input:** Read the text provided by the user to understand its purpose (e.g., "Rehab protocol generator" or "SEO optimizer").
2.  **Determine File Name:**
    * Scan the `prompts/` folder to find the highest existing number (e.g., if `07` exists, the new one is `08`).
    * Create a short, descriptive English filename in snake_case (e.g., `08_seo_optimizer.md`).
3.  **Create the File:**
    * Create the new file in `prompts/` with the calculated number and name.
    * Paste the user's content into it.
4.  **Update Index:**
    * Edit `.cursorrules`.
    * Add a new line to the "Prompt Library Reference" list with the new filename and a brief summary.
5.  **Confirm:**
    * Respond to the user: "Saved as [Filename] and added to .cursorrules."

