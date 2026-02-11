type SaveToKbOptions = {
  buttonEl: HTMLElement | null;
  getCurrentPrompt: () => string;
  getSynthesisContentEl: () => HTMLElement | null;
  pickProject?: (options?: { title?: string }) => Promise<{ id: string; name: string } | null>;
};

export function initSaveToKb({
  buttonEl,
  getCurrentPrompt,
  getSynthesisContentEl,
  pickProject
}: SaveToKbOptions) {
  if (!buttonEl) return;

  buttonEl.addEventListener('click', async () => {
    const synthesisContent = getSynthesisContentEl();
    if (!synthesisContent || !synthesisContent.textContent?.trim()) {
      alert('Ingen syntes att spara');
      return;
    }

    if (!pickProject) {
      console.warn('Project picker not available');
      return;
    }

    const project = await pickProject({ title: '📁 Spara syntes till projekt' });
    if (!project) return;

    try {
      const currentPrompt = getCurrentPrompt();
      const title = currentPrompt?.substring(0, 80) || 'AI Council syntes';

      const saveRes = await fetch('/api/kunskapsbas/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          category: 'ai_fragor',
          title: title,
          content: synthesisContent.innerHTML,
          summary: currentPrompt?.substring(0, 200)
        })
      });

      const saveData = await saveRes.json();

      if (saveData.error) {
        alert('Kunde inte spara: ' + saveData.error);
      } else {
        alert(`✅ Sparat till "${project.name}" → AI-frågor`);
      }
    } catch (err) {
      console.error('Error saving to KB:', err);
      alert('Ett fel uppstod vid sparande');
    }
  });
}
