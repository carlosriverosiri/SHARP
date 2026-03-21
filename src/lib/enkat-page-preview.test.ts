// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEnkatPreviewUi } from './enkat-page-preview';
import type { PreviewData } from './enkat-page-helpers';

function createPreviewRefs() {
  document.body.innerHTML = `
    <input id="fileInput" type="file" />
    <div id="fileName"></div>
    <section id="previewSection" class="hidden"></section>
    <table><tbody id="selectedRowsBody"></tbody></table>
    <table><tbody id="duplicatesBody"></tbody></table>
    <table><tbody id="errorsBody"></tbody></table>
    <div id="bookingTypeSelectionBox" class="hidden"></div>
    <div id="bookingTypeSelectionList"></div>
    <div id="excludedBookingTypesSummaryBox" class="hidden"></div>
    <div id="excludedBookingTypesSummary"></div>
  `;

  return {
    fileInput: document.getElementById('fileInput') as HTMLInputElement,
    fileName: document.getElementById('fileName') as HTMLElement,
    previewSection: document.getElementById('previewSection') as HTMLElement,
    selectedRowsBody: document.getElementById('selectedRowsBody') as HTMLTableSectionElement,
    duplicatesBody: document.getElementById('duplicatesBody') as HTMLTableSectionElement,
    errorsBody: document.getElementById('errorsBody') as HTMLTableSectionElement,
    bookingTypeSelectionBox: document.getElementById('bookingTypeSelectionBox') as HTMLElement,
    bookingTypeSelectionList: document.getElementById('bookingTypeSelectionList') as HTMLElement,
    excludedBookingTypesSummaryBox: document.getElementById('excludedBookingTypesSummaryBox') as HTMLElement,
    excludedBookingTypesSummary: document.getElementById('excludedBookingTypesSummary') as HTMLElement
  };
}

function createPreviewData(): PreviewData {
  return {
    totalRows: 5,
    validRows: 2,
    invalidRows: 1,
    autoExcludedRows: 1,
    duplicateRows: 1,
    previewToken: 'token-1',
    bookingTypeOptions: [
      { bookingTypeRaw: 'Nybesök', selected: true, count: 1 },
      { bookingTypeRaw: 'Återbesök', selected: false, count: 2 }
    ],
    autoExcludedGroups: [
      { label: 'Saknar diagnos', reason: 'Kolumnen Diagnoser är tom', count: 1 }
    ],
    selectedRows: [
      {
        rowIndex: 2,
        patientId: 'p1',
        providerName: 'Dr Test',
        visitDate: '2026-03-15',
        visitStartTime: '08:00',
        bookingTypeRaw: 'Nybesök',
        bookingTypeNormalized: 'nybesok'
      }
    ],
    duplicates: [
      {
        dedupKey: 'p1',
        chosenReason: 'Vald rad prioriterades.',
        keptRowIndex: 2,
        discardedRowIndexes: [3]
      }
    ],
    errors: [
      {
        rowIndex: 4,
        field: 'Mobiltelefon',
        message: 'Ogiltigt telefonnummer.'
      }
    ]
  };
}

describe('enkat-page-preview', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('syncs selected filename and applies preview data to the DOM', () => {
    const refs = createPreviewRefs();
    Object.defineProperty(refs.fileInput, 'files', {
      configurable: true,
      value: [new File(['csv'], 'besok.csv', { type: 'text/csv' })]
    });

    const setBanner = vi.fn();
    const previewUi = createEnkatPreviewUi(refs, setBanner);

    previewUi.syncSelectedFileName();
    const manuallyExcludedRows = previewUi.applyPreviewData(createPreviewData());

    expect(refs.fileName.textContent).toBe('besok.csv');
    expect(refs.fileName.classList.contains('has-file')).toBe(true);
    expect(manuallyExcludedRows).toBe(2);
    expect(previewUi.getCurrentPreview()?.previewToken).toBe('token-1');
    expect(refs.previewSection.classList.contains('hidden')).toBe(false);
    expect(refs.selectedRowsBody.innerHTML).toContain('Dr Test');
    expect(refs.duplicatesBody.innerHTML).toContain('Vald rad prioriterades.');
    expect(refs.errorsBody.innerHTML).toContain('Ogiltigt telefonnummer.');
    expect(refs.bookingTypeSelectionBox.classList.contains('hidden')).toBe(false);
    expect(refs.excludedBookingTypesSummaryBox.classList.contains('hidden')).toBe(false);
    expect(previewUi.getBookingTypeCheckboxes()).toHaveLength(2);
    expect(previewUi.getSelectedBookingTypes()).toEqual(['Nybesök']);
  });

  it('invalidates preview when a booking type checkbox changes', () => {
    const refs = createPreviewRefs();
    const setBanner = vi.fn();
    const previewUi = createEnkatPreviewUi(refs, setBanner);

    previewUi.applyPreviewData(createPreviewData());
    const [firstCheckbox] = previewUi.getBookingTypeCheckboxes();
    firstCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

    expect(previewUi.getCurrentPreview()).toBeNull();
    expect(refs.previewSection.classList.contains('hidden')).toBe(true);
    expect(setBanner).toHaveBeenLastCalledWith(
      'info',
      'Urvalet ändrades. Filen filtreras om automatiskt.'
    );
  });

  it('clears all preview-related UI in one call', () => {
    const refs = createPreviewRefs();
    const previewUi = createEnkatPreviewUi(refs, vi.fn());

    previewUi.applyPreviewData(createPreviewData());
    previewUi.clearAnalysis();

    expect(previewUi.getCurrentPreview()).toBeNull();
    expect(refs.previewSection.classList.contains('hidden')).toBe(true);
    expect(refs.bookingTypeSelectionList.innerHTML).toBe('');
    expect(refs.excludedBookingTypesSummary.innerHTML).toBe('');
  });
});
