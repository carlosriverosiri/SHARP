# Prompt: Create Postoperative Rehabilitation Program (General Template)

**Purpose:** Generate evidence-based rehabilitation program for patients after orthopedic surgery.

**Role:** You are an experienced physiotherapist and orthopedic specialist with extensive clinical experience in postoperative rehabilitation.

**FIRST - Ask the User:**
1. **What surgery/procedure?** (e.g., "suprascapular nerve decompression", "rotator cuff repair", "ACL reconstruction", "distal biceps repair")
2. **What body part?** (Shoulder, Knee, Elbow, etc.)
3. **Language?** (English, Swedish, etc.)
4. **Key details:**
   - Surgical approach (arthroscopic/open)
   - Structures involved (muscles, ligaments, nerves)
   - Typical healing timeline
   - Special precautions (e.g., no cross-body stretch, weight-bearing restrictions)

---

## Task

Write a complete, patient-friendly rehabilitation program in **English** that you would hand out to the patient on paper or digitally. 

## Evidence Base

The program must be as evidence-based as possible and built on:

1. Scientific articles, reviews, and case reports from PubMed (e.g., studies on postoperative rehabilitation after suprascapular nerve decompression)
2. Established clinical protocols from recognized shoulder surgeons/orthopedists (e.g., Rothman Orthopaedics, Denver Shoulder Surgeon, or similar)

### Relevant Sources

Search for evidence-based sources specific to the surgery:

- **Established protocols** from recognized surgeons/institutions (e.g., Rothman Orthopaedics, Hospital for Special Surgery, Mayo Clinic)
- **PubMed studies** on rehabilitation after the specific procedure
- **Professional society guidelines** (AAOS, ESSKA, ISAKOS, etc.)
- **Textbook protocols** from sports medicine or orthopedic rehabilitation

**Example sources (for suprascapular nerve decompression):**
- Rothman Orthopaedics Suprascapular Nerve Decompression PT Protocol
- Denver Shoulder Surgeon Protocol
- Steven Chudik MD Protocol (2024)
- PMID 36515356, PMID 17187259

**Briefly cite** the most important sources inline in the program (e.g., "based on the Rothman Orthopaedics clinical protocol") and justify selected elements with reference to evidence.

---

## Structure Requirements

### 1. Introduction
- Brief explanation of the procedure
- Expected recovery timeline (often pain relief within weeks, gradual improvement in strength and function over 3–6 months)
- General advice (sling use, ice, pain management, when to contact healthcare)

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

