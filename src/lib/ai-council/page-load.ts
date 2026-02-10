type PageLoadOptions = {
  loadProjects: () => void | Promise<void>;
  loadKbProjects: () => Promise<void>;
  getLoadSessions: () => () => Promise<void>;
  setLoadSessions: (fn: () => Promise<void>) => void;
  renderSessionAccordions: () => void;
  updateNotesBadge: () => void;
  loadKbContextFromUrl: () => Promise<void>;
  restoreResponses: () => Promise<void>;
};

export function initPageLoad({
  loadProjects,
  loadKbProjects,
  getLoadSessions,
  setLoadSessions,
  renderSessionAccordions,
  updateNotesBadge,
  loadKbContextFromUrl,
  restoreResponses
}: PageLoadOptions) {
  loadProjects();
  loadKbProjects();

  const originalLoadSessions = getLoadSessions();
  setLoadSessions(async function() {
    await originalLoadSessions();
    renderSessionAccordions();
    updateNotesBadge();
  });

  (async () => {
    await loadKbContextFromUrl();
    await restoreResponses();
    console.log('✅ AI Council fully initialized');
  })();
}
