# Promptbibliotek (`prompts/`)

Återanvändbara promptfiler för SHARP-projektet. Referera med `@filnamn` i Cursor-chat när det passar.

## AI Council

Prompter som är tänkta att köras i **AI Council** (Elixir-appen eller motsvarande fler-modells­flöde), ofta med live-sök eller bifogade PDF:er — inte för ren Astro-/Cursor-kodgenerering.

| Fil | Kort beskrivning |
|-----|------------------|
| `14_ai_council_history_improvements.md` | Molnbaserad sessionshantering, ingen localStorage-fallback |
| `16_ai_council_reference_library_builder.md` | Brett referensbibliotek (Zotero), live-sök |
| `17_ai_council_anatomy_reference_library.md` | Anatomi-fokuserat referensbibliotek (≤10/ref/modell) |
| `18_ai_council_anatomy_website_block.md` | Anatomiblock B/C/D till webbsida (engelska) |
| `19_ai_council_diagnosis_from_pdfs.md` | Diagnossyntes från egna PDF:er, numrerade källor |

**Namngivning:** Nya AI Council-prompter ska ha **`ai_council`** i filnamnet (t.ex. `20_ai_council_…md`) så de skiljs från Astro/Cursor-prompter.

**Inbyggd mall (Elixir):** Diagnosprompten finns även som snabbknapp **Diagnoser** och som `priv/prompts/diagnosis_from_pdfs.md` i AI Council Elixir-repot.

## Webbplats, innehåll & Cursor (Astro m.m.)

Diagnossidor, Q&A, översättning, SMS m.m. — primärt för **Cursor** + **Astro**-arbetsflöden.

### Q&A och prestanda

| Fil | Kort beskrivning |
|-----|------------------|
| `04_qa_import_guide.md` | Q&A-import |
| `05_qa_formatting_rules.md` | Q&A-formatering |
| `06_unanswered_qa_workflow.md` | Obesvarade frågor |
| `07_performance_guide.md` | Prestanda |

### Diagnos- och innehållssidor

| Fil | Kort beskrivning |
|-----|------------------|
| `09_new_diagnosis_page.md` | Ny diagnossida (SV, Astro) |
| `11_diagnosis_master_en.md` | Diagnossida (EN, Astro) |

### Grupp 12 — Rehabprogram (`RehabLayout`, engelska sidor först)

Samma layout mellan postop och konservativt; filnamn **12_1** / **12_2** visar att mallarna hör ihop.

| Fil | Kort beskrivning |
|-----|------------------|
| `12_1_rehab_program_postop.md` | Rehab efter operation (Astro EN → översättning) |
| `12_2_rehab_program_conservative.md` | Konservativ / icke-operativ rehab (samma struktur som 12_1) |

### Översättning och patientkommunikation

| Fil | Kort beskrivning |
|-----|------------------|
| `13_translate_to_english.md` | Översättning |
| `15_patientupplevelse_sms_master.md` | SMS / patientupplevelse |

## Övrigt

| Fil | Kort beskrivning |
|-----|------------------|
| `00_add_new_prompt.md` | Instruktion: lägga till ny prompt i biblioteket |
