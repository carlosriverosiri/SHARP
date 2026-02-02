# AI Council - Molnbaserad Sessionshantering

## Princip

**Ingen lokal lagring för sessioner.** Om du inte är inloggad kan du inte spara. Punkt.

Detta förhindrar att användare luras att tro att sessioner sparas i molnet när de bara finns lokalt i webbläsaren.

---

## Hur det ska fungera

| Tillstånd | Vad händer | UI |
|-----------|------------|-----|
| **Inloggad** | Sessioner sparas i Supabase | `☁️ Synkad` (grön) |
| **Ej inloggad** | Spara-knappen är **inaktiverad** | `🔒 Logga in för att spara` |
| **Session utgången** | Kan köra frågor men inte spara | `⚠️ Logga in igen för att spara` |

---

## Ändringar att implementera

### 1. Ta bort localStorage-fallback för sessioner

**Ta bort all kod som sparar/läser sessioner från localStorage:**

```javascript
// TA BORT dessa rader:
localStorage.getItem('ai-council-sessions')
localStorage.setItem('ai-council-sessions', ...)
sessions = JSON.parse(localStorage.getItem('ai-council-sessions') || '[]');
```

**Behåll endast Supabase-anrop för sessioner.**

---

### 2. Inaktivera spara-funktioner om ej inloggad

```javascript
// Global variabel för auth-status
let userIsLoggedIn = false;

async function checkAuthStatus() {
  const res = await fetch('/api/ai-council/sessions', { credentials: 'include' });
  const data = await res.json();
  
  if (data.error?.includes('Ej inloggad') || data.error?.includes('användare')) {
    userIsLoggedIn = false;
    showAuthWarning();
    disableSaveFeatures();
    return false;
  }
  userIsLoggedIn = true;
  return true;
}

function disableSaveFeatures() {
  // Inaktivera spara-knappar
  const saveBtn = document.getElementById('saveSessionBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.title = 'Logga in för att spara sessioner';
    saveBtn.classList.add('disabled');
  }
  
  // Inaktivera auto-save checkbox
  const autoSaveCheckbox = document.getElementById('enableAutoSave');
  if (autoSaveCheckbox) {
    autoSaveCheckbox.disabled = true;
    autoSaveCheckbox.checked = false;
  }
}
```

---

### 3. Visa tydlig varning vid körning utan inloggning

Lägg till en banner högst upp i sidofältet:

```html
<div id="authWarningBanner" class="auth-warning-banner" style="display: none;">
  <span class="auth-warning-icon">⚠️</span>
  <span class="auth-warning-text">Du är inte inloggad. Dina resultat sparas INTE.</span>
  <a href="/personal" class="auth-warning-link">Logga in →</a>
</div>
```

```css
.auth-warning-banner {
  background: #FEF3C7;
  border: 1px solid #F59E0B;
  border-radius: 8px;
  padding: 12px;
  margin: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.875rem;
}
.auth-warning-icon { font-size: 1.25rem; }
.auth-warning-text { color: #92400E; font-weight: 500; }
.auth-warning-link { 
  color: #D97706; 
  text-decoration: underline;
  font-weight: 600;
}
```

---

### 4. Fixa radera-knappen

Ändra från `✕` med "Ta bort" till `🗑️` med "Radera":

```javascript
// Ändra i renderSessions():
'<button class="note-item-btn" data-action="delete" title="Radera">🗑️</button>'
```

Uppdatera deleteSession för att endast använda Supabase:

```javascript
async function deleteSession(id) {
  if (!userIsLoggedIn) {
    alert('Du måste vara inloggad för att radera sessioner.');
    return;
  }
  
  if (!confirm('Vill du radera denna session permanent?')) return;
  
  try {
    const res = await fetch('/api/ai-council/sessions?id=' + id, { 
      method: 'DELETE', 
      credentials: 'include' 
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Kunde inte radera');
    }
    
    await loadSessions();
  } catch (e) {
    console.error('Delete error:', e);
    alert('Kunde inte radera sessionen: ' + e.message);
  }
}
```

---

### 5. Engångsmigrering av befintliga lokala sessioner

Vid första laddningen efter uppdatering, kolla om det finns lokala sessioner och erbjud migrering:

```javascript
async function checkAndMigrateLocalSessions() {
  if (!userIsLoggedIn) return;
  
  const localSessions = JSON.parse(localStorage.getItem('ai-council-sessions') || '[]');
  if (localSessions.length === 0) return;
  
  // Visa migreringsbanner
  showMigrationBanner(localSessions.length);
}

function showMigrationBanner(count) {
  const banner = document.createElement('div');
  banner.className = 'migration-banner';
  banner.innerHTML = `
    <div class="migration-content">
      <span>💾 Du har ${count} sessioner som bara finns lokalt i denna webbläsare.</span>
      <div class="migration-actions">
        <button id="migrateSessions" class="btn-primary">Spara till molnet ☁️</button>
        <button id="discardLocalSessions" class="btn-secondary">Radera lokala</button>
      </div>
    </div>
  `;
  
  document.querySelector('.notes-sidebar').prepend(banner);
  
  document.getElementById('migrateSessions').addEventListener('click', migrateLocalSessions);
  document.getElementById('discardLocalSessions').addEventListener('click', discardLocalSessions);
}

async function migrateLocalSessions() {
  const localSessions = JSON.parse(localStorage.getItem('ai-council-sessions') || '[]');
  const btn = document.getElementById('migrateSessions');
  btn.disabled = true;
  btn.textContent = 'Migrerar...';
  
  let migrated = 0, failed = 0;
  
  for (const session of localSessions) {
    try {
      const res = await fetch('/api/ai-council/sessions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: session.prompt,
          context: session.context,
          responses: session.responses,
          synthesis: session.synthesis,
          supersynthesis: session.supersynthesis,
          name: session.name
        })
      });
      if (res.ok) migrated++;
      else failed++;
    } catch (e) {
      failed++;
    }
  }
  
  if (failed === 0) {
    localStorage.removeItem('ai-council-sessions');
    alert(`✅ ${migrated} sessioner sparade till molnet!`);
    document.querySelector('.migration-banner')?.remove();
  } else {
    alert(`${migrated} sparade, ${failed} misslyckades. Försök igen.`);
    btn.disabled = false;
    btn.textContent = 'Försök igen';
  }
  
  await loadSessions();
}

function discardLocalSessions() {
  if (confirm('Är du säker? De lokala sessionerna raderas permanent.')) {
    localStorage.removeItem('ai-council-sessions');
    document.querySelector('.migration-banner')?.remove();
    alert('Lokala sessioner raderade.');
  }
}
```

---

### 6. Uppdatera loadSessions()

Förenkla funktionen till att endast använda Supabase:

```javascript
async function loadSessions() {
  notesSync.textContent = 'Laddar...';
  notesSync.className = 'notes-sync';
  
  try {
    const res = await fetch('/api/ai-council/sessions', { credentials: 'include' });
    const data = await res.json();
    
    if (data.error?.includes('Ej inloggad') || data.error?.includes('användare')) {
      userIsLoggedIn = false;
      sessions = [];
      notesSync.textContent = '🔒 Logga in för att spara';
      notesSync.className = 'notes-sync warning';
      showAuthWarning();
      disableSaveFeatures();
      
      // Kolla om det finns lokala sessioner att migrera
      checkAndMigrateLocalSessions();
    } else if (data.sessions) {
      userIsLoggedIn = true;
      sessions = data.sessions;
      notesSync.textContent = '☁️ Synkad';
      notesSync.className = 'notes-sync synced';
      
      // Kolla om det finns lokala sessioner att migrera
      checkAndMigrateLocalSessions();
    } else {
      sessions = [];
      notesSync.textContent = '☁️ Redo';
      notesSync.className = 'notes-sync synced';
    }
  } catch (e) {
    sessions = [];
    notesSync.textContent = '❌ Anslutningsfel';
    notesSync.className = 'notes-sync error';
    console.error('Session load error:', e);
  }
  
  renderSessions();
}
```

---

## Sammanfattning av ändringar

| Fil | Ändring |
|-----|---------|
| `ai-council.astro` | Ta bort localStorage-fallback |
| `ai-council.astro` | Lägg till auth-varning |
| `ai-council.astro` | Inaktivera spara om ej inloggad |
| `ai-council.astro` | Fixa radera + byt till "Radera" |
| `ai-council.astro` | Lägg till migreringsfunktion |

---

## Tester att utföra

- [ ] **Ej inloggad:** Spara-knapp inaktiverad, varning visas
- [ ] **Inloggad:** Spara fungerar, synkad-status visas
- [ ] **Radera:** Session försvinner från listan
- [ ] **Migrering:** Lokala sessioner flyttas till molnet
- [ ] **Byt dator:** Sessioner finns kvar efter inloggning

---

**Skapad:** 2026-02-02  
**Uppdaterad:** 2026-02-02 - Ändrat till molnbaserad approach utan lokal fallback
