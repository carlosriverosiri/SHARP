# Prompt: 12-2 — Conservative (Non-Operative) Rehabilitation Program (General Template)

**Series:** Grupp **12** — rehab-sidor med `RehabLayout` (engelska först, sedan översättning). Systermall för postoperativ rehab: `12_1_rehab_program_postop.md`.

**Purpose:** Generate evidence-based **conservative** (non-surgical) rehabilitation for patients managed without operation — sprains, low-grade instability, tendinopathy, overuse, selected fractures in brace, nerve irritation without surgery, etc.

**Role:** You are an experienced physiotherapist and orthopedic specialist with extensive clinical experience in non-operative musculoskeletal rehabilitation.

**Language workflow:** Skriv **primärt på engelska** för `src/pages/en/rehab/...`. Svenska versioner skapas separat (manuellt eller med översättningsprompt). Den här mallen är optimerad för engelska sidor; svenska kan följa samma layout i `src/pages/sv/rehab/...` vid behov.

**FIRST - Ask the User:**
1. **Diagnosis / injury pattern?** (e.g. "AC joint sprain Rockwood I–II", "patellar tendinopathy", "ankle sprain grade 2", "frozen shoulder stage")
2. **Body region?** (Shoulder, knee, ankle, etc.)
3. **Severity / classification** if standardised (e.g. Rockwood, sprain grade, stages of adhesive capsulitis)
4. **Language?** (Default **English** for new site pages.)
5. **Support / immobilization?** (Sling or brace duration, walking boot, taping, crutches — often **yes** early for conservative care; or **no** for pure exercise-based programs)
6. **Key context:**
   - Mechanism and time since injury
   - Imaging or clinical findings if known
   - Sport, work demands, and goals (return to running, overhead sport, etc.)
   - Contraindications or red flags (neurovascular compromise, instability episodes, infection suspicion — escalate to urgent care when appropriate)

---

## Task

Write a complete, patient-friendly rehabilitation program in **English** that you would hand out on paper or digitally — **without** assuming surgery has occurred. Emphasise natural healing timelines, graded exposure, and when operative care may need discussion (neutral, factual).

## Evidence Base

**PRIORITY HIERARCHY FOR SOURCES:**

### 1. PRIMARY: PubMed / scientific literature
- RCTs and systematic reviews on **conservative management**, **physical therapy**, **nonoperative treatment** for the specific condition
- CPGs embedded in high-quality reviews
- Search examples: "[condition] nonoperative rehabilitation", "[condition] physical therapy systematic review", "[condition] conservative treatment outcomes"

### 2. SECONDARY: Professional society guidelines
- Same bodies as postoperative work where relevant: **AAOS**, **ESSKA**, **ISAKOS**, **APTA**, plus region-specific PT associations when useful

### 3. SUPPLEMENTARY: Recognised clinical protocols
- Hospital or sports-medicine protocols for **non-operative** pathways only — as illustration of exercise progressions when trial evidence is thin

**Citation approach:** Same as 12-1: prioritise peer-reviewed evidence; cite protocols for exercise wording, not for unsupported claims.

---

## Structure Requirements

(Mirror **12-1** so pages look identical in layout and tone; only clinical content differs.)

### 1. Introduction
- What the condition is, in plain language (no surgery assumed)
- Expected timeline for **functional** recovery (wide range OK if evidence supports it)
- Pain education basics, activity modification, ice/heat as appropriate
- **When to seek urgent care** (red flags) and **when to reconsider surgery** (brief, non-alarmist)

**IMMobilization / SUPPORT POLICY:**
- State clearly if **sling, brace, boot, crutches, or taping** is used in early phases — duration and weaning
- If **no** immobilisation: say so and justify (e.g. early mobilisation evidence for this condition)

### 2. Phase Division
Use **3–4 phases** aligned with tissue healing and load progression, for example:
- **Phase 1:** Protection / pain control / range within safe limits
- **Phase 2:** Restore motion and begin light loading
- **Phase 3:** Strength, proprioception, task-specific training
- **Phase 4:** Return to sport / full work demands / maintenance

Adjust week ranges to the condition (some protocols are days-based early, then weeks).

### 3. For Each Phase Include:
- **Goals**
- **Allowed activities**
- **Specific exercises** (sets, reps, frequency, progression)
- **Precautions**
- **Criteria** to advance

### 4. Exercise Focus Areas
Tailor to condition, commonly:
- Pain-free or acceptable-pain graded ROM and loading
- Isometrics → concentrics → eccentrics as appropriate
- Neuromuscular control and proprioception for joint conditions
- Functional and sport-specific drills late phase

### 5. Conclusion
- Long-term self-management
- Flare-up management
- Follow-up with clinician / PT

### 6. Reference List
Section **"References"** with markdown links (PubMed, DOI, guidelines) as in **12-1**.

---

## Tone & Style

Same as **12-1:** friendly, motivating, clear; minimal jargon; exercise descriptions detailed enough for home use without images.

---

## Output Format

**Create as .astro page:**
- File location: `src/pages/en/rehab/[path]/[program-name].astro` (e.g. `src/pages/en/rehab/shoulder/ac-joint-dislocation-type-i-ii.astro`)

**MANDATORY: Use RehabLayout (not BaseLayout):** same import pattern and props as in `12_1_rehab_program_postop.md`.

**Print behaviour:** Identical to other rehab pages (logo, compact print CSS, PDF button via RehabLayout).

**Consistency:** Reuse the same heading hierarchy, phase presentation (e.g. tables or sections), and visual patterns as existing conservative rehab pages in the repo so **12-1** and **12-2** outputs are interchangeable from the patient’s perspective — only the clinical story changes.

Include proper headings, lists, and formatting for screen and PDF.
