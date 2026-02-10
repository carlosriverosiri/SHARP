type SaveToKbOptions = {
  buttonEl: HTMLElement | null;
  getCurrentPrompt: () => string;
  getSynthesisContentEl: () => HTMLElement | null;
};

export function initSaveToKb({
  buttonEl,
  getCurrentPrompt,
  getSynthesisContentEl
}: SaveToKbOptions) {
  if (!buttonEl) return;

  buttonEl.addEventListener('click', async () => {
    const synthesisContent = getSynthesisContentEl();
    if (!synthesisContent || !synthesisContent.textContent?.trim()) {
      alert('Ingen syntes att spara');
      return;
    }

    try {
      const projectsRes = await fetch('/api/kunskapsbas/projects');
      const projectsData = await projectsRes.json();

      if (!projectsData.projects || projectsData.projects.length === 0) {
        if (confirm('Du har inga projekt i Kunskapsbasen. Vill du skapa ett först?')) {
          window.open('/admin/kunskapsbas', '_blank');
        }
        return;
      }

      const projectList = projectsData.projects.map((p: { name: string }, i: number) => `${i + 1}. ${p.name}`).join('\n');
      const selection = prompt(`Välj projekt att spara till:\n\n${projectList}\n\nAnge nummer (1-${projectsData.projects.length}):`);

      if (!selection) return;

      const projectIndex = parseInt(selection) - 1;
      if (isNaN(projectIndex) || projectIndex < 0 || projectIndex >= projectsData.projects.length) {
        alert('Ogiltigt val');
        return;
      }

      const selectedProject = projectsData.projects[projectIndex];
      const currentPrompt = getCurrentPrompt();
      const title = prompt('Ange titel för AI-frågan:', currentPrompt?.substring(0, 50) || 'AI Council syntes');

      if (!title) return;

      const saveRes = await fetch('/api/kunskapsbas/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject.id,
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
        alert(`✅ Sparat till "${selectedProject.name}" → AI-frågor`);
      }
    } catch (err) {
      console.error('Error saving to KB:', err);
      alert('Ett fel uppstod vid sparande');
    }
  });
}
