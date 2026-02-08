# Ikonsystem - SHARP

## Oversikt

Projektet anvander **inline SVG-ikoner** i Feather Icons-stil. Inga externa ikonbibliotek anvands.

## Specifikation

Alla ikoner foljer samma standard:

| Egenskap | Varde |
|----------|-------|
| **ViewBox** | 0 0 24 24 |
| **Typ** | Stroke-based (inte filled) |
| **stroke-width** | 2 |
| **stroke-linecap** | round |
| **stroke-linejoin** | round |
| **fill** | none |
| **stroke** | currentColor |

## Anvandning

### Med Icon-komponenten (REKOMMENDERAT)

Import Icon from '../components/Icon.astro';

<Icon name="trash" size={16} />
<Icon name="eye" size={20} class="text-gray-500" />
<Icon name="plus" size={24} strokeWidth={3} />

### Tillgangliga ikoner

Se src/components/Icon.astro for komplett lista.

**Navigation:**
- arrow-left - Tillbaka
- arrow-right - Framat
- chevron-down - Expandera
- chevron-right - Nasta
- home - Hem

**Actions:**
- plus - Lagg till
- x - Stang
- check - Bekrafta
- refresh - Uppdatera
- upload - Ladda upp
- download - Ladda ner

**CRUD:**
- trash - Radera (med vertikala linjer)
- edit - Redigera
- copy - Kopiera
- save - Spara

**Visning:**
- eye - Visa/Granska
- eye-off - Dolj
- search - Sok

**Filer & Mappar:**
- folder - Mapp
- folder-plus - Ny mapp
- file - Fil
- file-text - Dokument
- book - Bok/Litteratur

**Kommunikation:**
- message-square - Chatt/AI
- mic - Mikrofon
- send - Skicka

**Anvandare:**
- user - Person
- users - Grupp

**Ovrigt:**
- settings - Installningar
- info - Information
- alert-circle - Varning
- external-link - Extern lank
- link - Lank
- database - Databas
- cpu - AI/Processor

## Kallan

Ikonerna ar baserade pa Feather Icons (https://feathericons.com/) - MIT License.

## VIKTIGT: Undvik dessa misstag

FEL - Saknar stroke-attribut:
<svg viewBox="0 0 24 24">
  <path d="..."/>
</svg>

RATT - Anvand Icon-komponenten:
<Icon name="trash" size={16} />

## Underhall

Vid tillagg av nya ikoner:
1. Hamta fran Feather Icons (https://feathericons.com/)
2. Lagg till i src/components/Icon.astro
3. Dokumentera i denna fil
