import {
  fetchApiData,
  getErrorText,
  normalizePatternText,
  type PreviewData
} from './enkat-page-helpers';
import type { EnkatPreviewUi } from './enkat-page-preview';

type BannerType = 'info' | 'error' | 'success';
type SetBanner = (type: BannerType, message: string) => void;

type SettingsSaveData = {
  patternText?: string;
};

type SendCampaignData = {
  status: string;
  totalSent: number;
  totalFailed: number;
};

type SaveExcludedBookingTypesActionArgs = {
  button: HTMLButtonElement;
  input: HTMLTextAreaElement;
  setStatus: SetBanner;
};

type SubmitPreviewActionArgs = {
  form: HTMLFormElement;
  fileInput: HTMLInputElement;
  previewButton?: HTMLButtonElement | null;
  excludedBookingTypePatternsInput: HTMLTextAreaElement;
  previewUi: EnkatPreviewUi;
  setBanner: SetBanner;
};

type CreateCampaignActionArgs = {
  button: HTMLButtonElement;
  campaignNameInput: HTMLInputElement;
  smsTemplateInput: HTMLInputElement | HTMLTextAreaElement;
  sendReminderInput: HTMLInputElement;
  previewUi: EnkatPreviewUi;
  setBanner: SetBanner;
  afterCreate: () => void;
};

function getTodayCampaignDateLabel(): string {
  return new Date().toLocaleDateString('sv-SE');
}

function resolveCampaignName(rawValue: string): string {
  const trimmed = (rawValue || '').trim();
  const todayLabel = getTodayCampaignDateLabel();
  const defaultBase = 'Patientupplevelse';

  if (!trimmed) {
    return `${defaultBase} ${todayLabel}`;
  }

  if (trimmed.includes(todayLabel)) {
    return trimmed;
  }

  return `${trimmed} ${todayLabel}`;
}

export async function saveExcludedBookingTypesAction({
  button,
  input,
  setStatus
}: SaveExcludedBookingTypesActionArgs): Promise<void> {
  button.disabled = true;
  const normalizedPatternText = normalizePatternText(input.value || '');
  input.value = normalizedPatternText;
  setStatus('info', 'Sparar listan för alla användare...');

  try {
    const data = await fetchApiData<SettingsSaveData>('/api/enkat/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        excludedBookingTypePatterns: normalizedPatternText
      })
    }, 'Kunde inte spara listan.');

    const savedText = data?.patternText || '';
    input.value = savedText;
    input.dataset.defaultValue = savedText;
    setStatus('success', 'Listan sparades i Supabase och används nu som gemensam lista.');
  } catch (error) {
    console.error(error);
    setStatus('error', getErrorText(error, 'Ett oväntat fel uppstod när listan skulle sparas.'));
  } finally {
    button.disabled = false;
  }
}

export async function submitPreviewAction({
  form,
  fileInput,
  previewButton,
  excludedBookingTypePatternsInput,
  previewUi,
  setBanner
}: SubmitPreviewActionArgs): Promise<void> {
  previewUi.clearPreview();

  if (!fileInput.files?.length) {
    setBanner('error', 'Välj en fil först.');
    return;
  }

  if (previewButton) previewButton.disabled = true;
  setBanner('info', 'Läser in filen och filtrerar...');

  try {
    const formData = new FormData(form);
    const normalizedPatternText = normalizePatternText(excludedBookingTypePatternsInput.value || '');
    excludedBookingTypePatternsInput.value = normalizedPatternText;
    formData.set('excludedBookingTypePatterns', normalizedPatternText);
    if (previewUi.getBookingTypeCheckboxes().length > 0) {
      formData.set('selectedBookingTypes', JSON.stringify(previewUi.getSelectedBookingTypes()));
    }

    const data = await fetchApiData<PreviewData>('/api/enkat/upload', {
      method: 'POST',
      body: formData
    }, 'Kunde inte förhandsgranska filen.');

    const manuallyExcludedRows = previewUi.applyPreviewData(data);
    setBanner(
      'success',
      `Preview klar: ${data.validRows} giltiga rader, ${data.autoExcludedRows || 0} automatiskt bortsorterade, ${manuallyExcludedRows} bortvalda via bokningstyp, ${data.invalidRows} ogiltiga och ${data.duplicateRows} bortvalda dublettrader.`
    );
  } catch (error) {
    console.error(error);
    setBanner('error', getErrorText(error, 'Ett oväntat fel uppstod vid uppladdning.'));
  } finally {
    if (previewButton) previewButton.disabled = false;
  }
}

export async function createCampaignAction({
  button,
  campaignNameInput,
  smsTemplateInput,
  sendReminderInput,
  previewUi,
  setBanner,
  afterCreate
}: CreateCampaignActionArgs): Promise<void> {
  const currentPreview = previewUi.getCurrentPreview();

  if (!currentPreview?.selectedRows?.length) {
    setBanner('error', 'Ladda upp en fil först.');
    return;
  }

  if (!currentPreview.previewToken) {
    setBanner('error', 'Previewn saknar verifieringstoken. Läs filen igen innan kampanjen skapas.');
    return;
  }

  button.disabled = true;
  setBanner('info', 'Skapar kampanj...');

  try {
    const campaignName = resolveCampaignName(campaignNameInput.value);
    campaignNameInput.value = campaignName;

    const data = await fetchApiData<SendCampaignData>('/api/enkat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignName,
        smsTemplate: smsTemplateInput.value || '',
        sendNow: true,
        sendReminder: !!sendReminderInput.checked,
        previewToken: currentPreview.previewToken
      })
    }, 'Kunde inte skapa kampanjen.');

    setBanner(
      'success',
      `Kampanj skapad. Status: ${data.status}. Skickade: ${data.totalSent}, misslyckade: ${data.totalFailed}.`
    );
    button.disabled = false;
    afterCreate();
  } catch (error) {
    console.error(error);
    setBanner('error', getErrorText(error, 'Ett oväntat fel uppstod när kampanjen skulle skapas.'));
    button.disabled = false;
  }
}
