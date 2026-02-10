type ModelSelectionOptions = {
  modelSelectionEl: HTMLElement | null;
  profileSelectorEl: HTMLElement | null;
  synthesisModelEl: HTMLSelectElement | null;
  enableDeliberationEl: HTMLInputElement | null;
  deliberationToggle: HTMLElement | null;
  availableModels: Record<string, boolean>;
  contextEl: HTMLTextAreaElement | null;
  promptEl: HTMLTextAreaElement | null;
  tokenCountEl: HTMLElement | null;
  tokenDotEl: HTMLElement | null;
  tokenWarningEl: HTMLElement | null;
  tokenWarningTextEl: HTMLElement | null;
  onProfileChange?: (profileId: string) => void;
};

type ProfileConfig = {
  name: string;
  models: string[];
  synthesis: string;
  deliberation: boolean;
};

export function initModelSelection({
  modelSelectionEl,
  profileSelectorEl,
  synthesisModelEl,
  enableDeliberationEl,
  deliberationToggle,
  availableModels,
  contextEl,
  promptEl,
  tokenCountEl,
  tokenDotEl,
  tokenWarningEl,
  tokenWarningTextEl,
  onProfileChange
}: ModelSelectionOptions) {
  if (!modelSelectionEl || !profileSelectorEl || !synthesisModelEl || !enableDeliberationEl) {
    return {
      getSelectedModels: () => [],
      updateModelCheckboxes: () => {},
      updateTokenMeter: () => {},
      applyProfile: () => {},
      getCurrentProfile: () => ''
    };
  }
  const safeModelSelectionEl = modelSelectionEl;
  const safeProfileSelectorEl = profileSelectorEl;
  const safeSynthesisModelEl = synthesisModelEl;
  const safeEnableDeliberationEl = enableDeliberationEl;

  const profiles: Record<string, ProfileConfig> = {
    snabb: {
      name: 'Snabb',
      models: ['gemini'],
      synthesis: 'gemini',
      deliberation: false
    },
    patient: {
      name: 'Patientfrågor',
      models: ['gemini', 'anthropic'],
      synthesis: 'gpt4o',
      deliberation: false
    },
    kod: {
      name: 'Kodning',
      models: ['openai', 'anthropic', 'gemini', 'grok'],
      synthesis: 'claude-opus',
      deliberation: true
    },
    vetenskap: {
      name: 'Vetenskap',
      models: ['gemini', 'anthropic', 'grok'],
      synthesis: 'openai',
      deliberation: false
    },
    strategi: {
      name: 'Strategi',
      models: ['openai', 'anthropic', 'grok'],
      synthesis: 'claude-opus',
      deliberation: false
    }
  };

  let currentProfile = '';

  function getSelectedModels(): string[] {
    return Array.from(safeModelSelectionEl.querySelectorAll('.model-checkbox.selected:not(.unavailable)'))
      .map(el => (el as HTMLElement).dataset.model)
      .filter((model): model is string => !!model);
  }

  function updateModelCheckboxes() {
    safeModelSelectionEl.querySelectorAll('.model-checkbox').forEach(cb => {
      const el = cb as HTMLElement;
      const model = el.dataset.model || '';
      const isAvailable = availableModels[model];
      const checkbox = el.querySelector('input') as HTMLInputElement | null;

      if (!checkbox) return;

      if (!isAvailable) {
        el.classList.add('unavailable');
        el.classList.remove('selected');
        checkbox.checked = false;
        checkbox.disabled = true;
      } else {
        el.classList.remove('unavailable');
        checkbox.disabled = false;
      }
    });
  }

  function applyProfile(profileId: string) {
    const profile = profiles[profileId];
    if (!profile) return;

    currentProfile = profileId;
    onProfileChange?.(profileId);

    safeProfileSelectorEl.querySelectorAll('.profile-btn').forEach(btn => {
      const el = btn as HTMLElement;
      el.classList.toggle('active', el.dataset.profile === profileId);
    });

    safeModelSelectionEl.querySelectorAll('.model-checkbox').forEach(cb => {
      const el = cb as HTMLElement;
      const model = el.dataset.model || '';
      const checkbox = el.querySelector('input') as HTMLInputElement | null;
      if (!checkbox) return;
      const shouldSelect = profile.models.includes(model) && availableModels[model];
      checkbox.checked = shouldSelect;
      el.classList.toggle('selected', shouldSelect);
    });

    safeSynthesisModelEl.value = profile.synthesis;
    safeEnableDeliberationEl.checked = profile.deliberation;
    if (deliberationToggle) {
      deliberationToggle.classList.toggle('active', profile.deliberation);
    }
  }

  function updateTokenMeter() {
    if (!tokenCountEl || !tokenDotEl || !tokenWarningEl || !tokenWarningTextEl) return;
    const contextText = contextEl?.value || '';
    const promptText = promptEl?.value || '';
    const tokens = Math.ceil((contextText + promptText).length / 4);

    if (tokens >= 1000) {
      tokenCountEl.textContent = (tokens / 1000).toFixed(1) + 'K';
    } else {
      tokenCountEl.textContent = tokens.toLocaleString('sv-SE');
    }

    const modelToLimit: Record<string, number> = {
      openai: 256000,
      anthropic: 200000,
      gemini: 1000000,
      grok: 131072
    };
    const modelToName: Record<string, string> = {
      openai: 'GPT-5.2 (256K)',
      anthropic: 'Claude (200K)',
      gemini: 'Gemini (1M)',
      grok: 'Grok (128K)'
    };

    const warnings: string[] = [];
    let hasError = false;
    let hasWarning = false;

    getSelectedModels().forEach(model => {
      const limit = modelToLimit[model || ''];
      if (!limit) return;
      const usagePct = tokens / limit;
      if (usagePct >= 1) {
        hasError = true;
        warnings.push(modelToName[model || ''] || model || '');
      } else if (usagePct >= 0.8) {
        hasWarning = true;
        warnings.push(modelToName[model || ''] || model || '');
      }
    });

    tokenDotEl.classList.remove('warning', 'error');
    if (hasError) tokenDotEl.classList.add('error');
    else if (hasWarning) tokenDotEl.classList.add('warning');

    if (warnings.length > 0) {
      tokenWarningEl.classList.add('visible');
      tokenWarningEl.classList.toggle('error', hasError);
      tokenWarningTextEl.textContent = 'Kontexten (~' + tokenCountEl.textContent + ' tokens) overskrider: ' + warnings.join(', ');
    } else {
      tokenWarningEl.classList.remove('visible', 'error');
    }
  }

  safeProfileSelectorEl.querySelectorAll('.profile-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const profileId = (btn as HTMLElement).dataset.profile;
      if (profileId) applyProfile(profileId);
    });
  });

  if (deliberationToggle) {
    deliberationToggle.addEventListener('click', () => {
      safeEnableDeliberationEl.checked = !safeEnableDeliberationEl.checked;
      deliberationToggle.classList.toggle('active', safeEnableDeliberationEl.checked);
      safeProfileSelectorEl.querySelectorAll('.profile-btn').forEach(btn => btn.classList.remove('active'));
    });
  }

  safeModelSelectionEl.querySelectorAll('.model-checkbox').forEach(cb => {
    cb.addEventListener('click', () => {
      const el = cb as HTMLElement;
      if (el.classList.contains('unavailable')) return;
      const checkbox = el.querySelector('input') as HTMLInputElement | null;
      if (!checkbox) return;
      checkbox.checked = !checkbox.checked;
      el.classList.toggle('selected', checkbox.checked);
      safeProfileSelectorEl.querySelectorAll('.profile-btn').forEach(btn => btn.classList.remove('active'));
      setTimeout(updateTokenMeter, 50);
    });
  });

  safeSynthesisModelEl.addEventListener('change', () => {
    safeProfileSelectorEl.querySelectorAll('.profile-btn').forEach(btn => btn.classList.remove('active'));
  });

  promptEl?.addEventListener('input', updateTokenMeter);
  contextEl?.addEventListener('input', updateTokenMeter);
  setTimeout(updateTokenMeter, 100);

  return { getSelectedModels, updateModelCheckboxes, updateTokenMeter, applyProfile, getCurrentProfile: () => currentProfile };
}
