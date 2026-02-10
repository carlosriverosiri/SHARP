export type DomRefs = {
  // Toast + auth status
  toastContainer: HTMLElement | null;
  logoutBanner: HTMLElement | null;
  soundNotificationEl: HTMLInputElement | null;
  hallucinationToggleBtn: HTMLButtonElement | null;
  hallucinationList: HTMLElement | null;
  hallucinationReport: HTMLElement | null;
  saveToKbBtn: HTMLButtonElement | null;
  synthesisContentEl: HTMLElement | null;
  costBanner: HTMLElement | null;

  contextEl: HTMLTextAreaElement | null;
  promptEl: HTMLTextAreaElement | null;
  clearContextBtn: HTMLButtonElement | null;
  copyContextBtn: HTMLButtonElement | null;
  previewContextBtn: HTMLButtonElement | null;
  clearPromptBtn: HTMLButtonElement | null;
  copyPromptBtn: HTMLButtonElement | null;
  previewPromptBtn: HTMLButtonElement | null;
  runBtn: HTMLButtonElement | null;
  retryFailedBtn: HTMLButtonElement | null;
  expandModelsBtn: HTMLButtonElement | null;
  deliberateNowBtn: HTMLButtonElement | null;
  synthesizeNowBtn: HTMLButtonElement | null;
  runAllSequentialBtn: HTMLButtonElement | null;
  addModelsCardBtn: HTMLButtonElement | null;
  addModelsCount: HTMLElement | null;
  unusedModelDots: HTMLElement | null;
  nextStepCards: HTMLElement | null;
  deliberateCount: HTMLElement | null;
  synthesizeCount: HTMLElement | null;
  kbProjectSelect: HTMLSelectElement | null;
  sessionProjectFilter: HTMLSelectElement | null;
  structurePromptContainer: HTMLElement | null;
  structurePromptBtn: HTMLButtonElement | null;
  structuredPreview: HTMLElement | null;
  structuredPreviewContent: HTMLElement | null;
  structuredPreviewMeta: HTMLElement | null;
  applyStructuredPrompt: HTMLButtonElement | null;
  cancelStructuredPrompt: HTMLButtonElement | null;
  copyStructuredPrompt: HTMLButtonElement | null;
  previewModal: HTMLElement | null;
  previewModalTitle: HTMLElement | null;
  previewModalBody: HTMLElement | null;
  closePreviewModal: HTMLButtonElement | null;
  previewModalClose: HTMLButtonElement | null;
  previewModalCopy: HTMLButtonElement | null;

  // Prompt edit modal
  promptEditModal: HTMLElement | null;
  promptEditName: HTMLInputElement | null;
  promptEditText: HTMLTextAreaElement | null;
  promptEditClose: HTMLButtonElement | null;
  promptEditCancel: HTMLButtonElement | null;
  promptEditSave: HTMLButtonElement | null;

  // Status + results
  statusEl: HTMLElement | null;
  statusTextEl: HTMLElement | null;
  errorEl: HTMLElement | null;
  resultsEl: HTMLElement | null;
  synthesisCard: HTMLElement | null;
  synthesisModelEl: HTMLSelectElement | null;
  synthesisModelsUsedEl: HTMLElement | null;
  synthesisProfileEl: HTMLElement | null;

  // Notes + files
  notesSidebar: HTMLElement | null;
  notesToggle: HTMLButtonElement | null;
  notesList: HTMLElement | null;
  notesSync: HTMLElement | null;
  fileUploadArea: HTMLElement | null;
  fileInput: HTMLInputElement | null;
  fileListEl: HTMLElement | null;
  cameraBtn: HTMLButtonElement | null;
  cameraInput: HTMLInputElement | null;

  // Model selection + workflow
  modelSelectionEl: HTMLElement | null;
  deliberationToggle: HTMLElement | null;
  enableDeliberationEl: HTMLInputElement | null;
  skipSynthesisToggle: HTMLElement | null;
  skipSynthesisEl: HTMLInputElement | null;
  tokenCountEl: HTMLElement | null;
  tokenDotEl: HTMLElement | null;
  tokenWarningEl: HTMLElement | null;
  tokenWarningTextEl: HTMLElement | null;
  round1Label: HTMLElement | null;
  round2Section: HTMLElement | null;
  workflowProgressEl: HTMLElement | null;
  workflowStatus: HTMLElement | null;
  resetWorkflowBtn: HTMLButtonElement | null;

  // Dictation
  dictationBtn: HTMLButtonElement | null;
  dictationStatus: HTMLElement | null;

  // Sidebar + sessions
  projectSidebar: HTMLElement | null;
  mobileMenuBtn: HTMLButtonElement | null;
  newChatBtn: HTMLButtonElement | null;
  projectSearch: HTMLInputElement | null;
  projectList: HTMLElement | null;
  unsortedAccordion: HTMLElement | null;
  unsortedList: HTMLElement | null;
  unsortedCount: HTMLElement | null;
  allSessionsAccordion: HTMLElement | null;
  allSessionsList: HTMLElement | null;
  allSessionsCount: HTMLElement | null;
  mobileNotesFab: HTMLElement | null;
  mobileNotesBadge: HTMLElement | null;

  // Profile selector
  profileSelectorEl: HTMLElement | null;
};

export function getDomRefs(): DomRefs {
  return {
    // Toast + auth status
    toastContainer: document.getElementById('toastContainer') as HTMLElement | null,
    logoutBanner: document.getElementById('logoutBanner') as HTMLElement | null,
    soundNotificationEl: document.getElementById('soundNotification') as HTMLInputElement | null,
    hallucinationToggleBtn: document.getElementById('toggleHallucinationDetails') as HTMLButtonElement | null,
    hallucinationList: document.getElementById('hallucinationList') as HTMLElement | null,
  hallucinationReport: document.getElementById('hallucinationReport') as HTMLElement | null,
    saveToKbBtn: document.getElementById('saveToKB') as HTMLButtonElement | null,
    synthesisContentEl: document.getElementById('synthesisContent') as HTMLElement | null,
  costBanner: document.getElementById('costBanner') as HTMLElement | null,

    // Core inputs
    contextEl: document.getElementById('context') as HTMLTextAreaElement | null,
    promptEl: document.getElementById('prompt') as HTMLTextAreaElement | null,

    // Field actions
    clearContextBtn: document.getElementById('clearContextBtn') as HTMLButtonElement | null,
    copyContextBtn: document.getElementById('copyContextBtn') as HTMLButtonElement | null,
    previewContextBtn: document.getElementById('previewContextBtn') as HTMLButtonElement | null,
    clearPromptBtn: document.getElementById('clearPromptBtn') as HTMLButtonElement | null,
    copyPromptBtn: document.getElementById('copyPromptBtn') as HTMLButtonElement | null,
    previewPromptBtn: document.getElementById('previewPromptBtn') as HTMLButtonElement | null,

    // Workflow buttons
    runBtn: document.getElementById('runBtn') as HTMLButtonElement | null,
    retryFailedBtn: document.getElementById('retryFailedBtn') as HTMLButtonElement | null,
    expandModelsBtn: document.getElementById('expandModelsBtn') as HTMLButtonElement | null,
    deliberateNowBtn: document.getElementById('deliberateNowBtn') as HTMLButtonElement | null,
    synthesizeNowBtn: document.getElementById('synthesizeNowBtn') as HTMLButtonElement | null,
    runAllSequentialBtn: document.getElementById('runAllSequentialBtn') as HTMLButtonElement | null,
    addModelsCardBtn: document.getElementById('addModelsCardBtn') as HTMLButtonElement | null,
    addModelsCount: document.getElementById('addModelsCount') as HTMLElement | null,
    unusedModelDots: document.getElementById('unusedModelDots') as HTMLElement | null,
    nextStepCards: document.getElementById('nextStepCards') as HTMLElement | null,
    deliberateCount: document.getElementById('deliberateCount') as HTMLElement | null,
    synthesizeCount: document.getElementById('synthesizeCount') as HTMLElement | null,

    // KB selectors
    kbProjectSelect: document.getElementById('kbProjectSelect') as HTMLSelectElement | null,
    sessionProjectFilter: document.getElementById('sessionProjectFilter') as HTMLSelectElement | null,

    // Structure prompt
    structurePromptContainer: document.getElementById('structurePromptContainer') as HTMLElement | null,
    structurePromptBtn: document.getElementById('structurePromptBtn') as HTMLButtonElement | null,
    structuredPreview: document.getElementById('structuredPreview') as HTMLElement | null,
    structuredPreviewContent: document.getElementById('structuredPreviewContent') as HTMLElement | null,
    structuredPreviewMeta: document.getElementById('structuredPreviewMeta') as HTMLElement | null,
    applyStructuredPrompt: document.getElementById('applyStructuredPrompt') as HTMLButtonElement | null,
    cancelStructuredPrompt: document.getElementById('cancelStructuredPrompt') as HTMLButtonElement | null,
    copyStructuredPrompt: document.getElementById('copyStructuredPrompt') as HTMLButtonElement | null,

    // Preview modal
    previewModal: document.getElementById('previewModal') as HTMLElement | null,
    previewModalTitle: document.getElementById('previewModalTitle') as HTMLElement | null,
    previewModalBody: document.getElementById('previewModalBody') as HTMLElement | null,
    closePreviewModal: document.getElementById('closePreviewModal') as HTMLButtonElement | null,
    previewModalClose: document.getElementById('previewModalClose') as HTMLButtonElement | null,
    previewModalCopy: document.getElementById('previewModalCopy') as HTMLButtonElement | null,

    // Prompt edit modal
    promptEditModal: document.getElementById('promptEditModal') as HTMLElement | null,
    promptEditName: document.getElementById('promptEditName') as HTMLInputElement | null,
    promptEditText: document.getElementById('promptEditText') as HTMLTextAreaElement | null,
    promptEditClose: document.getElementById('promptEditClose') as HTMLButtonElement | null,
    promptEditCancel: document.getElementById('promptEditCancel') as HTMLButtonElement | null,
    promptEditSave: document.getElementById('promptEditSave') as HTMLButtonElement | null,

    // Status + results
    statusEl: document.getElementById('status') as HTMLElement | null,
    statusTextEl: document.getElementById('statusText') as HTMLElement | null,
    errorEl: document.getElementById('error') as HTMLElement | null,
    resultsEl: document.getElementById('results') as HTMLElement | null,
    synthesisCard: document.getElementById('synthesisCard') as HTMLElement | null,
    synthesisModelEl: document.getElementById('synthesisModel') as HTMLSelectElement | null,
    synthesisModelsUsedEl: document.getElementById('synthesisModelsUsed') as HTMLElement | null,
    synthesisProfileEl: document.getElementById('synthesisProfile') as HTMLElement | null,

    // Notes + files
    notesSidebar: document.getElementById('notesSidebar') as HTMLElement | null,
    notesToggle: document.getElementById('notesToggle') as HTMLButtonElement | null,
    notesList: document.getElementById('notesList') as HTMLElement | null,
    notesSync: document.getElementById('notesSync') as HTMLElement | null,
    fileUploadArea: document.getElementById('fileUploadArea') as HTMLElement | null,
    fileInput: document.getElementById('fileInput') as HTMLInputElement | null,
    fileListEl: document.getElementById('fileList') as HTMLElement | null,
    cameraBtn: document.getElementById('cameraBtn') as HTMLButtonElement | null,
    cameraInput: document.getElementById('cameraInput') as HTMLInputElement | null,

    // Model selection + workflow
    modelSelectionEl: document.getElementById('modelSelection') as HTMLElement | null,
    deliberationToggle: document.getElementById('deliberationToggle') as HTMLElement | null,
    enableDeliberationEl: document.getElementById('enableDeliberation') as HTMLInputElement | null,
    skipSynthesisToggle: document.getElementById('skipSynthesisToggle') as HTMLElement | null,
    skipSynthesisEl: document.getElementById('skipSynthesis') as HTMLInputElement | null,
    tokenCountEl: document.getElementById('tokenCount') as HTMLElement | null,
    tokenDotEl: document.getElementById('tokenDot') as HTMLElement | null,
    tokenWarningEl: document.getElementById('tokenWarning') as HTMLElement | null,
    tokenWarningTextEl: document.getElementById('tokenWarningText') as HTMLElement | null,
    round1Label: document.getElementById('round1Label') as HTMLElement | null,
    round2Section: document.getElementById('round2Section') as HTMLElement | null,
    workflowProgressEl: document.getElementById('workflowProgress') as HTMLElement | null,
    workflowStatus: document.getElementById('workflowStatus') as HTMLElement | null,
    resetWorkflowBtn: document.getElementById('resetWorkflowBtn') as HTMLButtonElement | null,

    // Dictation
    dictationBtn: document.getElementById('dictationBtn') as HTMLButtonElement | null,
    dictationStatus: document.getElementById('dictationStatus') as HTMLElement | null,

    // Sidebar + sessions
    projectSidebar: document.getElementById('projectSidebar') as HTMLElement | null,
    mobileMenuBtn: document.getElementById('mobileMenuBtn') as HTMLButtonElement | null,
    newChatBtn: document.getElementById('newChatBtn') as HTMLButtonElement | null,
    projectSearch: document.getElementById('projectSearch') as HTMLInputElement | null,
    projectList: document.getElementById('projectList') as HTMLElement | null,
    unsortedAccordion: document.getElementById('unsortedAccordion') as HTMLElement | null,
    unsortedList: document.getElementById('unsortedList') as HTMLElement | null,
    unsortedCount: document.getElementById('unsortedCount') as HTMLElement | null,
    allSessionsAccordion: document.getElementById('allSessionsAccordion') as HTMLElement | null,
    allSessionsList: document.getElementById('allSessionsList') as HTMLElement | null,
    allSessionsCount: document.getElementById('allSessionsCount') as HTMLElement | null,
    mobileNotesFab: document.getElementById('mobileNotesFab') as HTMLElement | null,
    mobileNotesBadge: document.getElementById('mobileNotesBadge') as HTMLElement | null,

    // Profile selector
    profileSelectorEl: document.getElementById('profileSelector') as HTMLElement | null
  };
}
