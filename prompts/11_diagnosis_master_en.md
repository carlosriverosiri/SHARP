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

**PAGE LAYOUT:**
- **Container:** `max-w-[1500px]` (NOT max-w-7xl)
- **3-column grid:** `lg:grid-cols-12`
  - Left sidebar: `lg:col-span-3` - Quick facts, variants, related conditions
  - Main content: `lg:col-span-6` - Primary content sections
  - Right sidebar: `lg:col-span-3` - **Contents**, **FAQ/Q&A**, author info
- **Contents block header:** `bg-sky-700 text-white` (blue)
- **FAQ/Q&A block header:** `bg-emerald-600 text-white` (green) - ALWAYS in right sidebar

**CITATION FORMAT:**
- Always place references AFTER the period, not before
- ❌ WRONG: `...spontaneously[22].`
- ✅ CORRECT: `...spontaneously.[22]`

**CLINICAL EXPERIENCE BLOCKS:**
- Use **indigo/purple** background for small clinical pearls within sections
- Use for: Personal clinical observations, expert opinions, practice patterns
- Icon: 💡 or 👨‍⚕️

**EXPERT PERSPECTIVE SECTION (REQUIRED):**

Every diagnosis page MUST include a dedicated "Expert Perspective" section near the end (before FAQ). This is a large, prominent block with dark background where the author shares their personal clinical approach.

**Structure:**
```html
<!-- EXPERT PERSPECTIVE SECTION -->
<section id="expert" class="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 py-12">
  <div class="max-w-[1500px] mx-auto px-4 sm:px-6">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-8">
      <div class="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center">
        <span class="text-3xl">💡</span>
      </div>
      <div>
        <h2 class="text-2xl font-bold text-white">Expert Perspective</h2>
        <p class="text-slate-400">My approach to [DIAGNOSIS NAME]</p>
      </div>
    </div>
    
    <!-- Main content card -->
    <div class="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6 md:p-8">
      
      <!-- Opening paragraph -->
      <p class="text-slate-300 text-base leading-relaxed mb-6">
        At Södermalms Ortopedi, we frequently see patients with [condition]. 
        [Brief overview of typical presentation and what makes this diagnosis interesting/challenging.]
      </p>
      
      <!-- My Diagnostic Approach -->
      <h3 class="text-lg font-bold text-amber-400 mb-3">My Diagnostic Approach</h3>
      <p class="text-slate-300 leading-relaxed mb-6">
        My management is primarily based on [key clinical finding/approach]. 
        [Explain what you prioritize and why - this may differ from standard textbook approaches.]
      </p>
      
      <!-- A Question I Always Ask (optional but recommended) -->
      <div class="bg-slate-700/50 rounded-xl p-5 mb-6 border-l-4 border-indigo-500">
        <div class="flex items-start gap-3">
          <span class="text-2xl">💤</span>
          <div>
            <h4 class="font-bold text-indigo-400 mb-2">A Question I Always Ask</h4>
            <p class="text-white italic mb-3">
              "[Your signature question that helps with diagnosis]"
            </p>
            <p class="text-slate-400 text-sm">
              [Explain why you ask this and what insight it provides. 
              Note if this is personal experience vs. literature-based.]
              <strong class="text-slate-300">Not described in literature</strong> – but worth asking about.
            </p>
          </div>
        </div>
      </div>
      
      <!-- Investigations grid (EMG, MRI, etc.) -->
      <div class="grid md:grid-cols-2 gap-4 mb-6">
        <div class="bg-slate-700/30 rounded-xl p-5 border border-slate-600">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-sky-400">⚡</span>
            <h4 class="font-bold text-sky-400">EMG/Nerve Conduction Studies</h4>
          </div>
          <p class="text-slate-300 text-sm leading-relaxed">
            [Your approach to this investigation - when you use it, limitations, what it changes in your management.]
          </p>
        </div>
        <div class="bg-slate-700/30 rounded-xl p-5 border border-slate-600">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-sky-400">🖼</span>
            <h4 class="font-bold text-sky-400">MRI</h4>
          </div>
          <p class="text-slate-300 text-sm leading-relaxed">
            [When you order MRI, what you look for, and how it influences your decisions.]
          </p>
        </div>
      </div>
      
      <!-- Clinical Pearl -->
      <div class="bg-indigo-900/30 rounded-xl p-5 border border-indigo-700">
        <h4 class="font-bold text-indigo-300 mb-2 flex items-center gap-2">
          <span>💡</span> Clinical Pearl
        </h4>
        <p class="text-slate-300 text-sm italic">
          [A practical tip from your clinical experience that isn't commonly taught.]
        </p>
      </div>
      
      <!-- Surgical Indication & Timing (if applicable) -->
      <h3 class="text-lg font-bold text-emerald-400 mt-8 mb-3">Surgical Indication & Timing</h3>
      <p class="text-slate-300 leading-relaxed mb-4">
        [Your criteria for recommending surgery. Be specific about timing, indications, and your rationale.]
      </p>
      
      <!-- Summary list -->
      <div class="bg-slate-700/30 rounded-xl p-5 border border-slate-600">
        <h4 class="font-bold text-slate-200 mb-3">Summary</h4>
        <ol class="space-y-2 text-slate-300 text-sm">
          <li class="flex gap-2"><span class="text-emerald-400 font-bold">1.</span> [First key point]</li>
          <li class="flex gap-2"><span class="text-emerald-400 font-bold">2.</span> [Second key point]</li>
          <li class="flex gap-2"><span class="text-emerald-400 font-bold">3.</span> [Third key point]</li>
        </ol>
      </div>
      
    </div>
    
    <!-- Author attribution -->
    <div class="flex items-center gap-4 mt-6">
      <img src="/images/team/carlos-rivero-siri.webp" alt="Dr. Carlos Rivero Siri" class="w-12 h-12 rounded-full border-2 border-sky-400" />
      <div>
        <p class="font-bold text-white">Dr. Carlos Rivero Siri</p>
        <p class="text-slate-400 text-sm">Specialist in Orthopaedics & Shoulder Surgery</p>
      </div>
    </div>
    
  </div>
</section>
```

**Note:** This section uses placeholder text in brackets [like this]. The AI should generate relevant dummy content based on the diagnosis, which the author will then customize with their personal clinical experience.

**COLOR SCHEME FOR CONTENT BLOCKS:**

Use consistent colors to signal content type:

| Color | Usage | Background | Border | Heading | Example |
|-------|-------|------------|--------|---------|---------|
| **Indigo** | Anatomy, Clinical Pearls, Expert Experience | `bg-indigo-50` | `border-indigo-200` | `text-indigo-800` | Nerve Anatomy, 💡 Clinical Pearl |
| **Amber** | Etiology, Risk Factors, Variants | `bg-amber-50` | `border-amber-200` | `text-amber-800` | Paralabral Ganglion Cysts, Risk Factors |
| **Rose** | Warnings, Red Flags, Alerts | `bg-rose-50` | `border-rose-200` | `text-rose-800` | 🚨 Red Flags, At-Risk Athletes |
| **Sky** | Diagnosis, Investigations, Contents header | `bg-sky-50` | `border-sky-200` | `text-sky-800` | MRI, EMG, Contents (header: `bg-sky-700`) |
| **Green/Emerald** | Treatment, Surgery, Prognosis, FAQ, Positive | `bg-green-50` | `border-green-200` | `text-green-800` | ✅ Surgical Treatment, FAQ (header: `bg-emerald-600`) |
| **Purple** | Sick Leave, Return to Work | `bg-purple-50` | `border-purple-200` | `text-purple-800` | 📅 Sick Leave & Return to Work |
| **Slate** | Neutral Information, Background | `bg-slate-50` | `border-slate-200` | `text-slate-800` | Background info, definitions |

**Block Header Colors:**
- Large section headers (in card header): Use darker shade (e.g., `bg-indigo-600 text-white`)
- Sub-headers within blocks: Use 800 shade (e.g., `text-indigo-800`)
- Bullet point icons: Use 500-600 shade (e.g., `text-indigo-500`)

**TRANSLATION WORKFLOW & CONSISTENCY:**

**Translation Priority Order:**
1. **English → Swedish/Spanish/Other** (primary workflow)
2. **Swedish → English** (when English version doesn't exist yet)
3. **Swedish → Spanish/Other** (fallback if no English version exists)

**Source Language Detection:**
- If `/en/diseases/[bodypart]/[diagnosis].astro` exists → use English as source
- If only `/sjukdomar/[bodypart]/[diagnosis].astro` exists → use Swedish as source

When translating, maintain consistent terminology:

| English | Swedish | Notes |
|---------|---------|-------|
| Contents | Innehåll | Table of contents |
| FAQ / Questions & Answers | Frågor & Svar | Right sidebar |
| Symptoms | Symtom | |
| Diagnosis | Diagnos | |
| Treatment | Behandling | |
| Surgical Treatment | Kirurgisk behandling | Green color |
| Conservative Treatment | Konservativ behandling | |
| Sick Leave | Sjukskrivning | Purple color |
| Return to Sport | Återgång till sport | |
| Prognosis | Prognos | |
| References | Referenser | |
| Clinical Pearl | Klinisk erfarenhet | Indigo color |
| Expert Perspective | Expertperspektiv | |
| Red Flags | Varningssignaler | Rose color |
| At-Risk | Riskgrupper | |

**Section IDs:** Keep English IDs even in translated pages for consistency:
- `id="symptoms"` (not `id="symtom"` or `id="sintomas"`)
- `id="treatment"` (not `id="behandling"` or `id="tratamiento"`)
- `id="faq"` (not `id="fragor"` or `id="preguntas"`)

**File Paths by Language:**
| Language | Path | Example |
|----------|------|---------|
| English | `src/pages/en/diseases/[bodypart]/` | `/en/diseases/shoulder/ac-joint-osteoarthritis.astro` |
| Swedish | `src/pages/sjukdomar/[bodypart]/` | `/sjukdomar/axel/ac-ledsartros.astro` |
| Spanish | `src/pages/es/enfermedades/[bodypart]/` | `/es/enfermedades/hombro/artrosis-ac.astro` |

**Translation Prompts:**
- Use `@13_translate_to_english.md` for Swedish → English
- Use this prompt (`@11`) for English → Swedish/Spanish/Other
