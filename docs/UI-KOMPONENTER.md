# UI-komponenter och Knappsystem

## Knappar (Button Classes)

Alla knappar anvander samma basklass `.btn` med en modifierare.

### Tillgangliga klasser

| Klass | Anvandning | Utseende |
|-------|-----------|----------|
| `.btn.btn-primary` | Huvudaktion (Skapa, Spara) | Bla bakgrund, vit text |
| `.btn.btn-secondary` | Sekundar aktion (Tillbaka, Avbryt) | Vit bakgrund, gra ram |
| `.btn.btn-success` | Positiv aktion (Nytt projekt) | Gron bakgrund, vit text |
| `.btn.btn-danger` | Destruktiv aktion (Radera) | Rod bakgrund, vit text |
| `.btn.btn-ghost` | Diskret aktion | Transparent, gra text |

### Storlekar

- `.btn` - Standard (padding: 8px 16px, font-size: 13px)
- `.btn.btn-sm` - Liten (padding: 6px 12px, font-size: 12px)

### Exempel

```html
<button class="btn btn-primary">
  <svg>...</svg>
  Skapa dokument
</button>

<button class="btn btn-secondary">
  <svg>...</svg>
  Tillbaka
</button>

<button class="btn btn-danger">
  <svg>...</svg>
  Radera
</button>
```

### CSS (kopieras till nya sidor)

```css
.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
}

.btn svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.btn-primary {
  background: #2563eb;
  color: white;
}
.btn-primary:hover { background: #1d4ed8; }

.btn-secondary {
  background: white;
  color: #1f2937;
  border: 1px solid #e5e7eb;
}
.btn-secondary:hover { background: #f3f4f6; }

.btn-success {
  background: #10b981;
  color: white;
}
.btn-success:hover { background: #059669; }

.btn-danger {
  background: #ef4444;
  color: white;
}
.btn-danger:hover { background: #dc2626; }

.btn-ghost {
  background: transparent;
  color: #6b7280;
}
.btn-ghost:hover { background: #f3f4f6; color: #1f2937; }

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}
.btn-sm svg { width: 14px; height: 14px; }
```

## Navigationsmonster

### Hierarkisk navigation (som File Explorer)

1. Dashboard -> Projekt -> Kategori -> Dokument
2. Varje niva har en "Tillbaka"-knapp som gar EN niva upp
3. Anvand ALDRIG tillbaka-knapp som gar till ett helt annat system

### Exempel

- I `Kategori`-vyn: Tillbaka -> Projekt-oversikt
- I `Projekt-oversikt`: Alla projekt -> Dashboard
- ALDRIG: Kategori -> AI Council (felaktigt!)

## Modaler

Anvand modaler for:
- Skapa nytt (projekt, dokument)
- Bekrafta radering
- Redigera

### Modal-struktur

```html
<div class="modal-overlay" id="my-modal">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">Titel</div>
    </div>
    <div class="modal-body">
      <!-- Innehall -->
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('my-modal')">Avbryt</button>
      <button class="btn btn-primary" onclick="doAction()">Bekrafta</button>
    </div>
  </div>
</div>
```

## Fargschema

| Variabel | Varde | Anvandning |
|----------|-------|-----------|
| `--color-primary` | #2563eb | Primarfarg (bla) |
| `--color-primary-hover` | #1d4ed8 | Hover-tillstand |
| `--bg-primary` | #fafbfc | Bakgrund |
| `--bg-secondary` | #ffffff | Kort/panel-bakgrund |
| `--text-primary` | #1f2937 | Rubriktext |
| `--text-muted` | #6b7280 | Sekundartext |
| `--border-color` | #e5e7eb | Ramar |
