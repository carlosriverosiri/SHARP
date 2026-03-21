import {
  getManuallyExcludedRows,
  renderAutoExcludedGroupsList,
  renderBookingTypeOptionsList,
  renderDuplicatesTable,
  renderErrorsTable,
  renderSelectedRowsTable,
  type AutoExcludedGroup,
  type BookingTypeOption,
  type DuplicateRow,
  type PreviewData,
  type SelectedPreviewRow,
  type ValidationErrorRow
} from './enkat-page-helpers';

type BannerType = 'info' | 'error' | 'success';

type PreviewUiRefs = {
  fileInput: HTMLInputElement;
  fileName: HTMLElement;
  previewSection: HTMLElement;
  selectedRowsBody: HTMLTableSectionElement;
  duplicatesBody: HTMLTableSectionElement;
  errorsBody: HTMLTableSectionElement;
  bookingTypeSelectionBox: HTMLElement;
  bookingTypeSelectionList: HTMLElement;
  excludedBookingTypesSummaryBox: HTMLElement;
  excludedBookingTypesSummary: HTMLElement;
};

type SetBanner = (type: BannerType, message: string) => void;

export function createEnkatPreviewUi(refs: PreviewUiRefs, setBanner: SetBanner) {
  let currentPreview: PreviewData | null = null;

  function getCurrentPreview(): PreviewData | null {
    return currentPreview;
  }

  function syncSelectedFileName(): void {
    const selectedFile = refs.fileInput.files?.[0];
    refs.fileName.textContent = selectedFile ? selectedFile.name : 'Ingen fil har valts';
    refs.fileName.classList.toggle('has-file', Boolean(selectedFile));
  }

  function openFilePicker(): void {
    if (typeof refs.fileInput.showPicker === 'function') {
      refs.fileInput.showPicker();
      return;
    }

    refs.fileInput.click();
  }

  function clearPreview(): void {
    currentPreview = null;
    refs.previewSection.classList.add('hidden');
    refs.selectedRowsBody.innerHTML = '';
    refs.duplicatesBody.innerHTML = '';
    refs.errorsBody.innerHTML = '';
  }

  function clearAutoExcludedSummary(): void {
    refs.excludedBookingTypesSummary.innerHTML = '';
    refs.excludedBookingTypesSummaryBox.classList.add('hidden');
  }

  function clearBookingTypeSelection(): void {
    refs.bookingTypeSelectionList.innerHTML = '';
    refs.bookingTypeSelectionBox.classList.add('hidden');
  }

  function clearAnalysis(): void {
    clearPreview();
    clearAutoExcludedSummary();
    clearBookingTypeSelection();
  }

  function invalidatePreview(message: string): void {
    clearPreview();
    setBanner('info', message);
  }

  function invalidateAnalysis(message: string): void {
    clearAnalysis();
    setBanner('info', message);
  }

  function getBookingTypeCheckboxes(): HTMLInputElement[] {
    return Array.from(
      refs.bookingTypeSelectionList.querySelectorAll<HTMLInputElement>('input[name="includedBookingTypes"]')
    );
  }

  function getSelectedBookingTypes(): string[] {
    return getBookingTypeCheckboxes()
      .filter((input) => input.checked)
      .map((input) => input.value);
  }

  function renderBookingTypeOptions(rows: BookingTypeOption[]): void {
    if (!rows.length) {
      clearBookingTypeSelection();
      return;
    }

    refs.bookingTypeSelectionBox.classList.remove('hidden');
    refs.bookingTypeSelectionList.innerHTML = renderBookingTypeOptionsList(rows);

    getBookingTypeCheckboxes().forEach((input) => {
      input.addEventListener('change', () => {
        invalidatePreview('Urvalet ändrades. Filen filtreras om automatiskt.');
      });
    });
  }

  function renderAutoExcludedGroups(rows: AutoExcludedGroup[]): void {
    if (!rows.length) {
      refs.excludedBookingTypesSummaryBox.classList.add('hidden');
      refs.excludedBookingTypesSummary.innerHTML = '';
      return;
    }

    refs.excludedBookingTypesSummaryBox.classList.remove('hidden');
    refs.excludedBookingTypesSummary.innerHTML = renderAutoExcludedGroupsList(rows);
  }

  function renderSelectedRows(rows: SelectedPreviewRow[]): void {
    refs.selectedRowsBody.innerHTML = renderSelectedRowsTable(rows);
  }

  function renderDuplicates(rows: DuplicateRow[]): void {
    refs.duplicatesBody.innerHTML = renderDuplicatesTable(rows);
  }

  function renderErrors(rows: ValidationErrorRow[]): void {
    refs.errorsBody.innerHTML = renderErrorsTable(rows);
  }

  function applyPreviewData(data: PreviewData): number {
    currentPreview = data;
    renderBookingTypeOptions(data.bookingTypeOptions || []);
    renderAutoExcludedGroups(data.autoExcludedGroups || []);
    renderSelectedRows(data.selectedRows || []);
    renderDuplicates(data.duplicates || []);
    renderErrors(data.errors || []);
    refs.previewSection.classList.remove('hidden');
    return getManuallyExcludedRows(data.bookingTypeOptions);
  }

  return {
    applyPreviewData,
    clearAnalysis,
    clearPreview,
    getBookingTypeCheckboxes,
    getCurrentPreview,
    getSelectedBookingTypes,
    invalidateAnalysis,
    invalidatePreview,
    openFilePicker,
    syncSelectedFileName
  };
}

export type EnkatPreviewUi = ReturnType<typeof createEnkatPreviewUi>;
