# Prompt: Create Postoperative Rehabilitation Program (General Template)

**Purpose:** Generate evidence-based rehabilitation program for patients after orthopedic surgery.

**Role:** You are an experienced physiotherapist and orthopedic specialist with extensive clinical experience in postoperative rehabilitation.

**FIRST - Ask the User:**
1. **What surgery/procedure?** (e.g., "suprascapular nerve decompression", "rotator cuff repair", "ACL reconstruction", "distal biceps repair")
2. **What body part?** (Shoulder, Knee, Elbow, etc.)
3. **Language?** (English, Swedish, etc.)
4. **Sling/immobilization needed?** (Yes for rotator cuff repair, distal biceps repair, etc. / No for nerve decompression, simple arthroscopy)
5. **Key details:**
   - Surgical approach (arthroscopic/open)
   - Structures involved (muscles, ligaments, nerves, tendons)
   - Typical healing timeline
   - Special precautions (e.g., no cross-body stretch, weight-bearing restrictions, no active ROM)

---

## Task

Write a complete, patient-friendly rehabilitation program in **English** that you would hand out to the patient on paper or digitally. 

## Evidence Base

**PRIORITY HIERARCHY FOR SOURCES:**

The program must be as evidence-based as possible. Use sources in this priority order:

### 1. PRIMARY: PubMed/Scientific Literature (HIGHEST PRIORITY)
- **Peer-reviewed studies** on postoperative rehabilitation for the specific surgery
- **Systematic reviews** and meta-analyses
- **Randomized controlled trials** (RCTs) if available
- **Case series** and cohort studies
- Search PubMed for: "[surgery name] rehabilitation", "[surgery name] postoperative protocol", "[surgery name] return to sport"

**Examples:**
- PMID 36515356 (novel techniques)
- PMID 17187259 (rehabilitation in athletes)
- Systematic reviews from JSES, AJSM, Arthroscopy, etc.

### 2. SECONDARY: Professional Society Guidelines
- **AAOS** (American Academy of Orthopaedic Surgeons)
- **ESSKA** (European Society of Sports Traumatology, Knee Surgery & Arthroscopy)
- **ISAKOS** (International Society of Arthroscopy, Knee Surgery and Orthopaedic Sports Medicine)
- **APTA** (American Physical Therapy Association)

### 3. SUPPLEMENTARY: Clinical Protocols from Recognized Institutions
- Use as examples/templates ONLY if scientific evidence is limited
- Rothman Orthopaedics, Hospital for Special Surgery, Mayo Clinic protocols
- Individual surgeon protocols (e.g., Steven Chudik MD, Denver Shoulder Surgeon)

**Example search strategy (for suprascapular nerve decompression):**
1. PubMed: "suprascapular nerve decompression rehabilitation" → PMID 36515356, PMID 17187259
2. Systematic review: "suprascapular neuropathy outcomes" → Meta-analyses
3. Professional guidelines: AAOS shoulder protocols
4. Supplementary: Rothman/Denver/Chudik protocols for practical exercise descriptions

**Citation approach:**
- **Cite scientific studies** when making clinical recommendations (e.g., "Research shows that early passive ROM improves outcomes (Smith 2020, PMID xxxxx)")
- **Reference protocols** only for practical exercise descriptions (e.g., "Exercise technique adapted from Rothman protocol")
- Prioritize peer-reviewed evidence over individual clinical protocols

---

## Structure Requirements

### 1. Introduction
- Brief explanation of the procedure
- Expected recovery timeline (adjust based on surgery type)
- General advice (ice/heat, pain management, when to contact healthcare)

**SLING POLICY:**
- **If sling IS needed** (tendon repair, unstable fracture, instability surgery): Specify duration and removal schedule
- **If sling NOT needed** (nerve decompression, simple arthroscopy, labral repair only): State "Sling not recommended" - no long explanation needed. Emphasize early motion to prevent stiffness
- **When in doubt:** Ask user if sling is required for this specific surgery

### 2. Phase Division
Recommended **3–4 phases**, for example:
- **Phase 1:** 0–4 weeks
- **Phase 2:** 4–8 weeks  
- **Phase 3:** 8–12 weeks
- **Phase 4:** >12 weeks / return to activity

### 3. For Each Phase Include:
- **Goals** - What to achieve in this phase
- **Allowed activities** - What the patient can do
- **Specific exercises** - With repetitions, sets, frequency, and progression
- **Precautions** - What to avoid
- **Criteria** for progressing to the next phase

### 4. Exercise Focus Areas

Tailor exercises to the specific surgery, but generally include:
- Early passive/assisted ROM (if tendon/ligament repair, respect healing constraints)
- Gradual active ROM
- Isometric exercises
- Specific muscle activation (based on affected structures)
- Joint stability
- Proprioception and neuromuscular control
- Functional movement patterns

**Surgery-specific considerations:**
- **Rotator cuff:** Respect healing phases, avoid active abduction early
- **Nerve decompression:** Focus on affected muscles, cross-body stretch caution
- **ACL:** Weight-bearing progression, quadriceps activation
- **Distal biceps:** Protect flexion/supination, gradual loading

### 5. Conclusion
- Long-term maintenance
- Signs of complications
- Importance of individualized follow-up

### 6. Reference List

End the program with a separate section titled **"References"** listing all sources you based the recommendations on. 

Format them as clickable markdown links, e.g.:
- [Rothman Orthopaedics Suprascapular Nerve Decompression Protocol](URL)
- [PubMed: Rehabilitation after Suprascapular Nerve Surgery](URL)

---

## Tone & Style

- **Friendly, motivating, and educational**
- Easy for patients to understand
- Avoid medical jargon or explain it simply
- Include clear descriptions of exercises (no images, but detailed enough for home training)

---

## Output Format

**Create as .astro page:**
- File location: `src/pages/[language]/rehab/[program-name].astro`
- Example: `src/pages/en/rehab/suprascapular-nerve-decompression.astro`

**MANDATORY: Use RehabLayout component (not BaseLayout):**
```astro
---
import RehabLayout from '../../../layouts/RehabLayout.astro';

const pageTitle = "Rehabilitation After [Surgery Name] | Södermalms Ortopedi";
const pageDescription = "Evidence-based postoperative rehabilitation program...";
---

<RehabLayout 
  title={pageTitle}
  description={pageDescription}
  type="article"
>
  <!-- Content here -->
</RehabLayout>
```

**RehabLayout automatically provides:**
- ✅ Print-optimized CSS for A4 PDF export
- ✅ Hides header/footer/navigation in print mode
- ✅ Shows only clinic logo in print
- ✅ Compact spacing (typically 4-6 pages)
- ✅ Works for all languages (Swedish, English, etc.)
- ✅ "Download/Print PDF" button functionality

**Styling:**
- Use Tailwind classes as normal
- Colored blocks will be simplified in print (white background, grey borders)
- Nested blocks removed in print for compact layout

Include proper headings, lists, and formatting for easy reading both online and in PDF.

