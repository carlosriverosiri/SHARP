# Keyboard Shortcuts + Röststyrning för Admin

> AI Council Supersyntes (Claude Opus 4.5) - 2026-01-26

**Status:** 📋 Planerat  
**Prioritet:** Hög  
**Uppskattad tid:** 2-3 veckor

---

## Bakgrund

Läkare och vårdpersonal behöver kunna navigera snabbt i admin-systemet utan att använda mus. Journalsystem saknar ofta bra kortkommandon och röststyrning skulle effektivisera arbetsflödet markant, särskilt när händerna är upptagna eller i steril miljö.

### Mål

1. Snabb navigation utan mus via keyboard shortcuts
2. Röststyrning på svenska för hands-free användning
3. Tillgängligt gränssnitt (WCAG 2.1 AA)
4. Konfigurerbart av användaren

---

## Arkitektur

```
┌─────────────────────────────────────────────────────────────┐
│                    CommandRegistry                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Centraliserad konfiguration av alla kommandon       │    │
│  │ - Validering av sekvenskollisioner                  │    │
│  │ - Fuzzy voice matching (Levenshtein)                │    │
│  │ - Kontextfiltrering                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                   │
│          ┌───────────────┼───────────────┐                  │
│          ▼               ▼               ▼                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Keyboard     │ │ Voice        │ │ Command      │        │
│  │ Handler      │ │ Handler      │ │ Palette      │        │
│  │              │ │              │ │              │        │
│  │ - Sekvenser  │ │ - Web Speech │ │ - Sökbar UI  │        │
│  │ - Globala    │ │ - sv-SE      │ │ - Fallback   │        │
│  │ - ESC avbryt │ │ - Fuzzy      │ │              │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                          │                                   │
│                          ▼                                   │
│              ┌──────────────────────┐                       │
│              │   CommandExecutor    │                       │
│              │   - ARIA announcements │                     │
│              │   - Bekräftelsedialoger │                    │
│              │   - Felhantering      │                       │
│              └──────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Teknisk Design

### 1. CommandRegistry - Central konfiguration

```typescript
// src/lib/commands/registry.ts

export interface CommandDefinition {
  id: string;
  name: string;
  description: string;
  category: 'navigation' | 'action' | 'system';
  
  // Tangentbord
  shortcut?: string;           // "Ctrl+K"
  sequence?: string;           // "G+P" (Vim-style)
  
  // Röst
  voicePhrases?: VoicePhrase[];
  
  // Kontext
  contexts?: ('admin' | 'personal' | 'form' | 'global')[];
  requiresConfirmation?: boolean;
  
  // Åtgärd
  action: () => void | Promise<void>;
}

export interface VoicePhrase {
  phrase: string;              // "gå till patienter"
  aliases?: string[];          // ["visa patienter", "öppna patientlista"]
  minConfidence?: number;      // 0.6 default
}

export class CommandRegistry {
  private commands: Map<string, CommandDefinition> = new Map();
  private sequenceMap: Map<string, CommandDefinition> = new Map();
  
  register(command: CommandDefinition): void {
    this.validateSequenceCollisions(command);
    this.commands.set(command.id, command);
    
    if (command.sequence) {
      this.sequenceMap.set(command.sequence, command);
    }
  }
  
  private validateSequenceCollisions(command: CommandDefinition): void {
    if (!command.sequence) return;
    
    // Kontrollera att sekvensen inte överlappar med befintliga
    for (const [seq, existing] of this.sequenceMap) {
      if (seq.startsWith(command.sequence) || command.sequence.startsWith(seq)) {
        throw new Error(
          `Sekvenskollision: "${command.sequence}" kolliderar med "${seq}" (${existing.id})`
        );
      }
    }
  }
  
  findByVoice(transcript: string, confidence: number): CommandDefinition[] {
    const matches: Array<{ command: CommandDefinition; score: number }> = [];
    
    for (const command of this.commands.values()) {
      if (!command.voicePhrases) continue;
      
      for (const phrase of command.voicePhrases) {
        const minConf = phrase.minConfidence ?? 0.6;
        if (confidence < minConf) continue;
        
        const score = this.calculateVoiceMatch(transcript, phrase);
        if (score > 0.6) {
          matches.push({ command, score });
        }
      }
    }
    
    return matches
      .sort((a, b) => b.score - a.score)
      .map(m => m.command);
  }
  
  private calculateVoiceMatch(transcript: string, phrase: VoicePhrase): number {
    const normalized = transcript.toLowerCase().trim();
    const allPhrases = [phrase.phrase, ...(phrase.aliases || [])];
    
    let bestScore = 0;
    for (const p of allPhrases) {
      const score = this.levenshteinSimilarity(normalized, p.toLowerCase());
      if (score > bestScore) bestScore = score;
    }
    
    return bestScore;
  }
  
  private levenshteinSimilarity(a: string, b: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const distance = matrix[a.length][b.length];
    const maxLength = Math.max(a.length, b.length);
    return 1 - distance / maxLength;
  }
  
  getAll(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }
  
  getByContext(context: string): CommandDefinition[] {
    return this.getAll().filter(cmd => 
      !cmd.contexts || cmd.contexts.includes(context as any)
    );
  }
}

// Singleton
export const commandRegistry = new CommandRegistry();
```

### 2. KeyboardHandler - Tangentbordshantering

```typescript
// src/lib/commands/keyboard-handler.ts

export class KeyboardHandler {
  private registry: CommandRegistry;
  private currentSequence: string[] = [];
  private sequenceTimeout: number | null = null;
  private sequenceIndicator: HTMLElement | null = null;
  
  constructor(registry: CommandRegistry) {
    this.registry = registry;
    this.createSequenceIndicator();
    this.setupListeners();
  }
  
  private setupListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    // Ignorera om i input-fält (utom för globala shortcuts)
    if (this.isInInputField() && !this.isGlobalShortcut(event)) {
      return;
    }
    
    // ESC avbryter pågående sekvens
    if (event.key === 'Escape') {
      this.resetSequence();
      return;
    }
    
    // Hantera sekvenser (G+P, etc.)
    if (this.handleSequence(event)) {
      event.preventDefault();
      return;
    }
    
    // Hantera direkta shortcuts (Ctrl+K, etc.)
    if (this.handleDirectShortcut(event)) {
      event.preventDefault();
      return;
    }
  }
  
  private handleSequence(event: KeyboardEvent): boolean {
    const key = event.key.toUpperCase();
    
    // Lägg till tangent i sekvensen
    this.currentSequence.push(key);
    const sequenceStr = this.currentSequence.join('+');
    
    // Visa indikator
    this.updateSequenceIndicator(sequenceStr);
    
    // Sök efter matchande kommando
    const command = this.registry.getAll().find(
      cmd => cmd.sequence === sequenceStr
    );
    
    if (command) {
      this.executeCommand(command);
      this.resetSequence();
      return true;
    }
    
    // Kontrollera om det finns potential för match
    const hasPartialMatch = this.registry.getAll().some(
      cmd => cmd.sequence?.startsWith(sequenceStr + '+')
    );
    
    if (hasPartialMatch) {
      // Starta/förnya timeout
      this.startSequenceTimeout();
      return true;
    }
    
    // Ingen match - återställ
    this.resetSequence();
    return false;
  }
  
  private handleDirectShortcut(event: KeyboardEvent): boolean {
    const shortcut = this.buildShortcutString(event);
    
    const command = this.registry.getAll().find(
      cmd => cmd.shortcut === shortcut
    );
    
    if (command) {
      this.executeCommand(command);
      return true;
    }
    
    return false;
  }
  
  private buildShortcutString(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    parts.push(event.key.toUpperCase());
    return parts.join('+');
  }
  
  private isGlobalShortcut(event: KeyboardEvent): boolean {
    // Ctrl+K (sök), Ctrl+M (röst), ESC alltid tillåtna
    const globalKeys = ['k', 'm', 'Escape', '/'];
    return (event.ctrlKey || event.metaKey) && globalKeys.includes(event.key.toLowerCase());
  }
  
  private isInInputField(): boolean {
    const active = document.activeElement;
    if (!active) return false;
    
    const tagName = active.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || 
           (active as HTMLElement).isContentEditable;
  }
  
  private executeCommand(command: CommandDefinition): void {
    if (command.requiresConfirmation) {
      this.showConfirmationDialog(command);
    } else {
      command.action();
      this.announceCommand(command);
    }
  }
  
  private showConfirmationDialog(command: CommandDefinition): void {
    // Implementera bekräftelsedialog
    const confirmed = confirm(`Vill du verkligen ${command.name.toLowerCase()}?`);
    if (confirmed) {
      command.action();
      this.announceCommand(command);
    }
  }
  
  private announceCommand(command: CommandDefinition): void {
    // ARIA announcement
    const announcement = document.getElementById('command-announcement');
    if (announcement) {
      announcement.textContent = `${command.name} utfört`;
    }
  }
  
  private createSequenceIndicator(): void {
    this.sequenceIndicator = document.createElement('div');
    this.sequenceIndicator.id = 'sequence-indicator';
    this.sequenceIndicator.className = 'fixed top-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg font-mono text-lg hidden z-50';
    this.sequenceIndicator.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.sequenceIndicator);
  }
  
  private updateSequenceIndicator(sequence: string): void {
    if (this.sequenceIndicator) {
      this.sequenceIndicator.textContent = sequence + '...';
      this.sequenceIndicator.classList.remove('hidden');
    }
  }
  
  private resetSequence(): void {
    this.currentSequence = [];
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
      this.sequenceTimeout = null;
    }
    if (this.sequenceIndicator) {
      this.sequenceIndicator.classList.add('hidden');
    }
  }
  
  private startSequenceTimeout(): void {
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
    }
    this.sequenceTimeout = window.setTimeout(() => {
      this.resetSequence();
    }, 1500); // 1.5 sekunder timeout
  }
  
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.sequenceIndicator?.remove();
  }
}
```

### 3. VoiceHandler - Röststyrning

```typescript
// src/lib/commands/voice-handler.ts

export class VoiceHandler {
  private registry: CommandRegistry;
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private isPushToTalk: boolean = false;
  private indicator: HTMLElement | null = null;
  
  constructor(registry: CommandRegistry) {
    this.registry = registry;
    this.initializeSpeechRecognition();
    this.createVoiceIndicator();
    this.setupPushToTalk();
  }
  
  private initializeSpeechRecognition(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Web Speech API stöds inte i denna webbläsare');
      this.showFallbackMessage();
      return;
    }
    
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'sv-SE';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    
    this.recognition.onstart = () => {
      this.updateIndicator('listening', 'Lyssnar...');
    };
    
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      
      if (result.isFinal) {
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        
        this.updateIndicator('processing', transcript);
        this.processCommand(transcript, confidence);
      } else {
        // Interim result - visa transkription
        this.updateIndicator('transcribing', result[0].transcript);
      }
    };
    
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      this.updateIndicator('error', this.getErrorMessage(event.error));
      
      setTimeout(() => {
        this.updateIndicator('idle', '');
      }, 2000);
    };
    
    this.recognition.onend = () => {
      if (this.isListening && !this.isPushToTalk) {
        // Starta om om vi är i kontinuerligt läge
        this.recognition?.start();
      } else {
        this.updateIndicator('idle', '');
      }
    };
  }
  
  private processCommand(transcript: string, confidence: number): void {
    const matches = this.registry.findByVoice(transcript, confidence);
    
    if (matches.length === 0) {
      this.updateIndicator('error', 'Inget kommando hittades');
      return;
    }
    
    if (matches.length === 1) {
      const command = matches[0];
      
      if (command.requiresConfirmation) {
        this.showVoiceConfirmation(command);
      } else {
        this.executeCommand(command);
      }
    } else {
      // Flera matchningar - visa disambiguering
      this.showDisambiguationMenu(matches, transcript);
    }
  }
  
  private showDisambiguationMenu(matches: CommandDefinition[], transcript: string): void {
    const menu = document.createElement('div');
    menu.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-800 border border-slate-600 rounded-xl p-6 z-50 shadow-2xl';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-label', 'Välj kommando');
    
    menu.innerHTML = `
      <p class="text-slate-400 mb-4">Menade du:</p>
      <p class="text-slate-500 text-sm mb-4">"${transcript}"</p>
      <div class="space-y-2">
        ${matches.slice(0, 5).map((cmd, i) => `
          <button class="w-full text-left px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors" data-index="${i}">
            <span class="font-semibold">${cmd.name}</span>
            <span class="text-slate-400 text-sm ml-2">${cmd.description}</span>
          </button>
        `).join('')}
      </div>
      <button class="mt-4 text-slate-500 text-sm hover:text-slate-400" data-cancel>Avbryt</button>
    `;
    
    menu.querySelectorAll('button[data-index]').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        this.executeCommand(matches[i]);
        menu.remove();
      });
    });
    
    menu.querySelector('button[data-cancel]')?.addEventListener('click', () => {
      menu.remove();
    });
    
    document.body.appendChild(menu);
    
    // Stäng med ESC
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        menu.remove();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  }
  
  private showVoiceConfirmation(command: CommandDefinition): void {
    this.updateIndicator('confirm', `Menade du "${command.name}"?`);
    
    // Vänta på bekräftelse via röst eller klick
    // "ja", "bekräfta", "kör"
    const confirmPhrases = ['ja', 'bekräfta', 'kör', 'okej'];
    const cancelPhrases = ['nej', 'avbryt', 'stopp'];
    
    const confirmHandler = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const transcript = result[0].transcript.toLowerCase();
        
        if (confirmPhrases.some(p => transcript.includes(p))) {
          this.executeCommand(command);
        } else if (cancelPhrases.some(p => transcript.includes(p))) {
          this.updateIndicator('idle', 'Avbrutet');
        }
        
        this.recognition?.removeEventListener('result', confirmHandler as any);
      }
    };
    
    this.recognition?.addEventListener('result', confirmHandler as any);
  }
  
  private executeCommand(command: CommandDefinition): void {
    this.updateIndicator('success', `✓ ${command.name}`);
    command.action();
    this.announceCommand(command);
    
    setTimeout(() => {
      this.updateIndicator('idle', '');
    }, 1500);
  }
  
  private announceCommand(command: CommandDefinition): void {
    const announcement = document.getElementById('command-announcement');
    if (announcement) {
      announcement.textContent = `${command.name} utfört`;
    }
  }
  
  private setupPushToTalk(): void {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.ctrlKey && !this.isPushToTalk) {
        e.preventDefault();
        this.isPushToTalk = true;
        this.start();
      }
    });
    
    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space' && this.isPushToTalk) {
        this.isPushToTalk = false;
        this.stop();
      }
    });
  }
  
  private createVoiceIndicator(): void {
    this.indicator = document.createElement('div');
    this.indicator.id = 'voice-indicator';
    this.indicator.className = 'fixed bottom-4 right-4 bg-slate-800 rounded-full p-4 shadow-lg z-50 hidden';
    this.indicator.setAttribute('role', 'status');
    this.indicator.setAttribute('aria-live', 'polite');
    
    this.indicator.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="voice-dot w-4 h-4 rounded-full bg-slate-500"></div>
        <span class="voice-text text-white text-sm"></span>
      </div>
    `;
    
    document.body.appendChild(this.indicator);
  }
  
  private updateIndicator(state: 'idle' | 'listening' | 'transcribing' | 'processing' | 'success' | 'error' | 'confirm', text: string): void {
    if (!this.indicator) return;
    
    const dot = this.indicator.querySelector('.voice-dot') as HTMLElement;
    const textEl = this.indicator.querySelector('.voice-text') as HTMLElement;
    
    const colors = {
      idle: 'bg-slate-500',
      listening: 'bg-blue-500 animate-pulse',
      transcribing: 'bg-yellow-500',
      processing: 'bg-orange-500',
      success: 'bg-green-500',
      error: 'bg-red-500',
      confirm: 'bg-purple-500 animate-pulse'
    };
    
    dot.className = `voice-dot w-4 h-4 rounded-full ${colors[state]}`;
    textEl.textContent = text;
    
    if (state === 'idle' && !text) {
      this.indicator.classList.add('hidden');
    } else {
      this.indicator.classList.remove('hidden');
    }
  }
  
  private getErrorMessage(error: string): string {
    const messages: Record<string, string> = {
      'no-speech': 'Ingen röst uppfattades',
      'audio-capture': 'Kunde inte komma åt mikrofonen',
      'not-allowed': 'Mikrofonåtkomst nekad',
      'network': 'Nätverksfel',
      'aborted': 'Avbrutet'
    };
    return messages[error] || 'Ett fel uppstod';
  }
  
  private showFallbackMessage(): void {
    console.log('Web Speech API stöds inte. Använd Chrome eller Edge för röststyrning.');
  }
  
  start(): void {
    if (!this.recognition) return;
    this.isListening = true;
    this.recognition.start();
  }
  
  stop(): void {
    if (!this.recognition) return;
    this.isListening = false;
    this.recognition.stop();
  }
  
  toggle(): void {
    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  }
  
  destroy(): void {
    this.stop();
    this.indicator?.remove();
  }
}
```

---

## Standardkommandon (30 st)

### Navigation (G+X sekvenser)

| ID | Sekvens | Shortcut | Röstkommando | Beskrivning |
|----|---------|----------|--------------|-------------|
| nav.home | G+H | - | "gå till hem" | Startsida |
| nav.patients | G+P | - | "gå till patienter" | Patientlista |
| nav.statistics | G+S | - | "gå till statistik" | Statistik |
| nav.staff | G+R | - | "gå till personal" | Personallista |
| nav.shortlist | G+K | - | "gå till kort varsel" | Kort varsel |
| nav.ai-council | G+A | - | "öppna AI council" | AI Council |
| nav.settings | G+I | - | "inställningar" | Inställningar |
| nav.profile | G+U | - | "min profil" | Användarprofil |

### Åtgärder

| ID | Shortcut | Röstkommando | Beskrivning |
|----|----------|--------------|-------------|
| action.save | Ctrl+S | "spara" | Spara formulär |
| action.new | Ctrl+N | "ny patient" | Skapa ny post |
| action.edit | Ctrl+E | "redigera" | Redigera valt |
| action.delete | Ctrl+D | "ta bort" | Ta bort (bekräftelse) |
| action.cancel | Escape | "avbryt" | Avbryt åtgärd |
| action.confirm | Ctrl+Enter | "bekräfta" | Bekräfta/skicka |
| action.back | Alt+← | "gå tillbaka" | Föregående sida |
| action.forward | Alt+→ | "gå framåt" | Nästa sida |
| action.next | Tab | "nästa fält" | Nästa formulärfält |
| action.prev | Shift+Tab | "föregående fält" | Föregående fält |

### System

| ID | Shortcut | Röstkommando | Beskrivning |
|----|----------|--------------|-------------|
| system.search | Ctrl+K | "sök" | Öppna sök/kommandopalett |
| system.voice | Ctrl+M | "röststyrning" | Toggle röstläge |
| system.help | F1 | "hjälp" | Visa kortkommandon |
| system.logout | - | "logga ut" | Logga ut (bekräftelse) |
| system.reload | Ctrl+R | "uppdatera" | Ladda om sidan |

### Patient-specifika

| ID | Röstkommando | Beskrivning |
|----|--------------|-------------|
| patient.next | "nästa patient" | Gå till nästa patient |
| patient.prev | "föregående patient" | Gå till föregående |
| patient.call | "ring patient" | Initiera samtal |
| patient.sms | "skicka SMS" | Öppna SMS-dialog |
| patient.journal | "öppna journal" | Öppna journal (extern) |

---

## UX-riktlinjer

### Visuell feedback

| Tillstånd | Färg | Indikator |
|-----------|------|-----------|
| Lyssnar | 🔵 Blå (pulserande) | Mikrofon aktiv |
| Transkriberar | 🟡 Gul | Visar text |
| Utfört | 🟢 Grön | Checkmark |
| Fel | 🔴 Röd | Felmeddelande |
| Sekvens aktiv | ⚪ Vit | "G..." i hörnet |

### Bekräftelsedialoger

Krävs för:
- `action.delete` - Ta bort patient/data
- `system.logout` - Logga ut
- Alla destruktiva åtgärder

### ARIA-implementation

```html
<!-- Announcement region -->
<div id="command-announcement" 
     class="sr-only" 
     role="status" 
     aria-live="polite" 
     aria-atomic="true">
</div>

<!-- Kommandopalett -->
<div role="dialog" 
     aria-label="Kommandopalett"
     aria-modal="true">
  <input role="combobox" 
         aria-autocomplete="list"
         aria-controls="command-list"
         aria-expanded="true">
  <ul id="command-list" role="listbox">
    <li role="option" aria-selected="true">...</li>
  </ul>
</div>
```

---

## Prioriterad utvecklingsordning

### Steg 1: Grundläggande keyboard (3-4 dagar)

- [ ] `CommandRegistry` med typning och validering
- [ ] `KeyboardHandler` med sekvenshantering
- [ ] Sekvensindikator (visuell)
- [ ] 10 grundkommandon (navigation)

### Steg 2: Kommandopalett (2-3 dagar)

- [ ] Modal med sökfält (Ctrl+K)
- [ ] Fuzzy search i kommandon
- [ ] Tangentbordsnavigation i listan
- [ ] ARIA-attribut

### Steg 3: Röststyrning (3-4 dagar)

- [ ] `VoiceHandler` med Web Speech API
- [ ] sv-SE locale konfiguration
- [ ] Levenshtein fuzzy matching
- [ ] Visuell indikator
- [ ] Push-to-talk (Ctrl+Space)
- [ ] Fallback för ej stödda browsers

### Steg 4: Tillgänglighet (2 dagar)

- [ ] ARIA-regioner
- [ ] Skärmläsarstöd
- [ ] Bekräftelsedialoger
- [ ] Dokumentation

### Steg 5: Användaranpassning (2-3 dagar)

- [ ] Inställningssida för shortcuts
- [ ] LocalStorage för custom mappings
- [ ] Import/export av konfiguration

---

## Prompt för implementation

När du vill börja implementera, använd denna prompt i Cursor:

```
@01-KEYBOARD-ROSTSTYRNING.md

Implementera Steg [X] enligt specifikationen:
- Skapa filerna i src/lib/commands/
- Följ TypeScript-typerna exakt
- Lägg till ARIA-attribut
- Testa med tangentbord och skärmläsare

Tech stack: Astro, TypeScript, Tailwind CSS
Målsidor: /admin/*, /personal/*
```

---

*Genererad av AI Council (Claude Opus 4.5) - 2026-01-26*
