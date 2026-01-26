# Framtida Utveckling

> Dokumentation för planerade funktioner och projekt

Denna mapp innehåller specifikationer och design för funktioner som ännu inte är implementerade. Varje dokument är strukturerat för att kunna användas som **prompt i Cursor** för att påbörja implementationen.

---

## Innehåll

| Fil | Status | Beskrivning |
|-----|--------|-------------|
| [01-KEYBOARD-ROSTSTYRNING.md](./01-KEYBOARD-ROSTSTYRNING.md) | 📋 Planerat | Keyboard shortcuts + röststyrning för admin |

---

## Hur du använder dokumenten

### 1. Läs specifikationen

Varje dokument innehåller:
- **Bakgrund** - Varför funktionen behövs
- **Krav** - Detaljerade funktionskrav
- **Arkitektur** - Teknisk design
- **Implementation** - Kodexempel och struktur
- **Prioritering** - Utvecklingsordning

### 2. Starta implementation i Cursor

Kopiera relevant sektion och använd som prompt:

```
@01-KEYBOARD-ROSTSTYRNING.md

Implementera steg 1: CommandRegistry enligt specifikationen.
```

### 3. Markera som klar

När en funktion är implementerad, flytta dokumentet till `docs/` och uppdatera denna README.

---

## Prioritering

1. **Q1 2026** - Keyboard shortcuts & röststyrning
2. **Q2 2026** - SITHS-inloggning
3. **Q3 2026** - AI Council MCP-integration

---

*Senast uppdaterad: 2026-01-26*
