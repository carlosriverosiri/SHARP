import { initSessions } from './sessions';
import type { AiCouncilSession } from './types';
import { initNotesActions } from './notes-actions';

type SessionsSetupOptions = {
  notesList: HTMLElement | null;
  notesSync: HTMLElement | null;
  notesSidebar: HTMLElement | null;
  notesToggle: HTMLElement | null;
  promptEl: HTMLTextAreaElement | null;
  renderMarkdown: (text: string) => string;
  escapeHtml: (text: string) => string;
  copyToClipboard: (text: string, btn?: HTMLElement) => void;
  updateNotesBadge: () => void;
  showLogoutBanner: () => void;
  getSessions: () => AiCouncilSession[];
  setSessions: (sessions: AiCouncilSession[]) => void;
  getUserIsLoggedIn: () => boolean;
  setUserIsLoggedIn: (value: boolean) => void;
  getUseSupabase: () => boolean;
  setUseSupabase: (value: boolean) => void;
  getKbProjectMap: () => Record<string, string>;
  getCurrentProjectFilter: () => string;
  contextEl: HTMLTextAreaElement | HTMLInputElement | null;
  synthesisModelEl: HTMLSelectElement | HTMLInputElement | null;
  getCurrentPrompt: () => string;
  getCurrentResponses: () => any;
};

export function initSessionsSetup(options: SessionsSetupOptions) {
  const {
    notesList,
    notesSync,
    notesSidebar,
    notesToggle,
    promptEl,
    renderMarkdown,
    escapeHtml,
    copyToClipboard,
    updateNotesBadge,
    showLogoutBanner,
    getSessions,
    setSessions,
    getUserIsLoggedIn,
    setUserIsLoggedIn,
    getUseSupabase,
    setUseSupabase,
    getKbProjectMap,
    getCurrentProjectFilter,
    contextEl,
    synthesisModelEl,
    getCurrentPrompt,
    getCurrentResponses
  } = options;

  const sessionsApi = initSessions({
    notesList,
    notesSync,
    notesSidebar,
    promptEl,
    renderMarkdown,
    escapeHtml,
    copyToClipboard,
    updateNotesBadge,
    showLogoutBanner,
    getSessions,
    setSessions,
    getUserIsLoggedIn,
    setUserIsLoggedIn,
    getUseSupabase,
    setUseSupabase,
    getKbProjectMap,
    getCurrentProjectFilter
  });

  initNotesActions({
    notesSidebar,
    notesToggle,
    getSessions,
    getUserIsLoggedIn,
    getUseSupabase,
    loadSessions: sessionsApi.loadSessions,
    getCurrentPrompt,
    getCurrentResponses,
    contextEl,
    synthesisModelEl,
    saveSession: sessionsApi.saveSession,
    copyToClipboard
  });

  return {
    loadSessions: sessionsApi.loadSessions,
    renderSessions: sessionsApi.renderSessions,
    saveSession: sessionsApi.saveSession,
    openSession: sessionsApi.openSession
  };
}
