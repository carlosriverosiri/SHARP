# Workflow: Zotero -> NotebookLM -> Cursor

Detta dokument beskriver standardprocessen för att skapa nya diagnossidor med högsta kvalitet och källtrohet.

---

## Steg 1: Förberedelse i Zotero
För att säkerställa att vi har rätt källmaterial:
1.  **Skapa mapp:** Gå till aktuell diagnos i Zotero. Skapa en undermapp som heter `Astro`.
    * *Exempel:* `Axel / Impingement / Astro`
2.  **Välj artiklar:** Kopiera över relevanta referenser till denna mapp.
    * **Fokusera på:** Review-artiklar, Sjukskrivningsriktlinjer, Idrottsmedicin/RTS.
    * **Antal:** Max 20 referenser (för att inte överbelasta NotebookLM).
3.  **Exportera lista:** Markera alla artiklar i `Astro`-mappen -> Högerklicka -> *Skapa bibliografi från markerade objekt* -> **Kopiera till urklipp** (Se till att URL/DOI är med).

---

## Steg 2: Analys i NotebookLM
För att extrahera strukturerad fakta:
1.  Ladda upp de ~20 PDF:erna från Zotero-mappen till NotebookLM.
2.  Klistra in prompten nedan i chatten.

### 🤖 NotebookLM Prompt (English Output)
*Kopiera och kör denna exakt:*

---

> You are a research assistant for an orthopedic specialist. Analyze the uploaded documents and extract data for a medical article about **[DIAGNOSIS NAME]**.
>
> **CRITICAL INSTRUCTION:** Output strictly in **ENGLISH**. Do not translate into Swedish.
>
> **Part 1: Clinical Facts (Concise)**
> - Etiology, Pathology & Symptoms
> - Diagnostics (Clinical tests + Imaging)
> - Treatment (Conservative vs. Surgical)
>
> **Part 2: Sick Leave & Return to Work (IMPORTANT)**
> - Look specifically for guidelines regarding Return to Work (RTW).
> - Differentiate if possible between:
>   * **Sedentary work (Office):** [Timeframe]
>   * **Light Manual Labor:** [Timeframe]
>   * **Heavy Manual Labor:** [Timeframe]
>
> **Part 3: Return to Sport (RTS) & Level**
> - Differentiate carefully between:
>   * **Return to Training (Non-contact):** [Timeframe]
>   * **Return to Play (Full contact/Competition):** [Timeframe]
>   * **Return to Performance:** Is there data on how many return to their *previous level*? (e.g., "80% return to elite level").
>
> **Part 4: References used (Author/Year Match)**
> - List the specific studies you used to extract this data.
> - **Format:** Author (Year).
> - **Note:** Do NOT try to generate URLs or DOIs here. Just provide the Author and Year so I can match it with my Zotero database later.
"""

---

## Steg 3: Produktion i Cursor (Composer)
Nu skapar vi sidan. Du behöver tre saker redo i urklipp/anteckningar.

**Input-lista till Cursor:**
1.  **Prompt:** Använd `@11` (Master Prompt English).
2.  **Data:** Svaret från NotebookLM.
3.  **Referenser:** Listan från Zotero (Steg 1.3).
4.  **Bild-URL:** Länk till sidan på `specialist.se` (eller specifika bildlänkar).

### 📝 Kommando att köra i Composer:
*Kopiera mallen nedan och fyll i:*

Create the English Master page for **[DIAGNOSIS NAME]** using **@11**.

**Source URL for Image (Hero):**
[Klistra in länk till specialist.se här]

**Specific Image Instructions (Optional):**
* **Pathology:** [Länk till bild...]
* **Symptoms:** [Länk till bild...]

**Data from NotebookLM:**
[Klistra in svaret från NotebookLM här...]

**Zotero Reference List:**
[Klistra in din bibliografi från Zotero här...]

