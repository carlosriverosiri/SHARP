type SynthesisMetaOptions = {
  synthesisModelsUsedEl: HTMLElement | null;
  synthesisProfileEl: HTMLElement | null;
  getCurrentProfile: () => string;
};

export function initSynthesisMeta({
  synthesisModelsUsedEl,
  synthesisProfileEl,
  getCurrentProfile
}: SynthesisMetaOptions) {
  function updateSynthesisMeta(modelsUsed: string[]) {
    const profileInfo: Record<string, { icon: string; name: string }> = {
      snabb: { icon: '⚡', name: 'Snabb' },
      patient: { icon: '🩺', name: 'Patient' },
      kod: { icon: '💻', name: 'Kodning' },
      vetenskap: { icon: '🔬', name: 'Forskning' },
      strategi: { icon: '🎯', name: 'Strategi' }
    };

    const modelInfo: Record<string, { name: string; class: string }> = {
      google: { name: 'Gemini', class: 'google' },
      gemini: { name: 'Gemini', class: 'google' },
      anthropic: { name: 'Claude', class: 'anthropic' },
      grok: { name: 'Grok', class: 'grok' },
      openai: { name: 'OpenAI', class: 'openai' },
      OpenAI: { name: 'OpenAI', class: 'openai' },
      Anthropic: { name: 'Claude', class: 'anthropic' },
      Google: { name: 'Gemini', class: 'google' },
      xAI: { name: 'Grok', class: 'grok' },
      Grok: { name: 'Grok', class: 'grok' },
      'Grok 4': { name: 'Grok', class: 'grok' },
      'Grok 2': { name: 'Grok', class: 'grok' }
    };

    if (synthesisModelsUsedEl && modelsUsed && modelsUsed.length > 0) {
      const modelDotsHtml = modelsUsed.map(m => {
        const info = modelInfo[m] || { name: m, class: 'openai' };
        return `<span class="synthesis-model-dot ${info.class}" title="${info.name}"></span>`;
      }).join('');
      const modelNames = modelsUsed.map(m => (modelInfo[m] || { name: m }).name);
      const uniqueNames = [...new Set(modelNames)];
      synthesisModelsUsedEl.innerHTML = modelDotsHtml + ` <span>${uniqueNames.join(', ')}</span>`;
    }

    if (synthesisProfileEl) {
      const currentProfile = getCurrentProfile();
      const profile = currentProfile
        ? (profileInfo[currentProfile] || { icon: '⚡', name: 'Snabb' })
        : { icon: '⚪', name: 'Ingen profil' };
      synthesisProfileEl.innerHTML = `${profile.icon} ${profile.name}`;
    }
  }

  return { updateSynthesisMeta };
}
