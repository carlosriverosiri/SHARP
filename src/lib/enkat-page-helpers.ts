type ApiSuccessEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

type DelayBucket = {
  bucket: string;
  responseRate: number;
};

type DelayMetrics = {
  averageDelayHours?: number;
  buckets?: DelayBucket[];
};

type CommentItem = {
  type: string;
  text: string;
  createdAt?: string;
};

type ProviderSubscores = {
  bemotande: number;
  information: number;
  lyssnadPa: number;
};

export type ProviderCardData = {
  providerName: string;
  sampleSize: number;
  canShowDetails: boolean;
  responseRate: number;
  reminderCount?: number;
  overallAverage: number;
  subscores: ProviderSubscores;
  delayMetrics?: DelayMetrics;
  latestComments?: CommentItem[];
};

export type CampaignCardData = {
  id: string;
  namn: string | null;
  status: string;
  created_at: string;
  total_importerade: number;
  total_giltiga: number;
  total_dubletter: number;
  total_ogiltiga: number;
  total_skickade: number;
  total_svar: number;
  unansweredEligible: number;
  remindersSent: number;
  responseRate: number;
  skicka_paminnelse: boolean;
  queuedInitial: number;
  sms_mall?: string | null;
  surveyCodes?: string[];
};

export type ReportProviderData = {
  providerName: string;
  sampleSize: number;
  canShowDetails: boolean;
  overallAverage: number;
  subscores: ProviderSubscores;
  deltaVsPrevious: number;
  delayMetrics?: DelayMetrics;
};

export type BookingTypeOption = {
  bookingTypeRaw: string;
  selected: boolean;
  count: number;
};

export type AutoExcludedGroup = {
  label: string;
  count: number;
  reason: string;
};

export type SelectedPreviewRow = {
  rowIndex: number;
  patientId: string;
  providerName: string;
  visitDate: string;
  visitStartTime: string | null;
  bookingTypeRaw: string | null;
  bookingTypeNormalized: string;
};

export type DuplicateRow = {
  dedupKey: string;
  keptRowIndex: number;
  discardedRowIndexes: number[];
  chosenReason: string;
};

export type ValidationErrorRow = {
  rowIndex: number;
  field: string;
  message: string;
};

export type PreviewData = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  autoExcludedRows?: number;
  duplicateRows: number;
  bookingTypeOptions?: BookingTypeOption[];
  autoExcludedGroups?: AutoExcludedGroup[];
  selectedRows?: SelectedPreviewRow[];
  duplicates?: DuplicateRow[];
  errors?: ValidationErrorRow[];
  previewToken?: string;
};

export function setElementBanner(
  element: HTMLElement | null,
  type: 'info' | 'error' | 'success',
  message: string
): void {
  if (!element) return;
  element.className = `banner visible ${type}`;
  element.textContent = message;
}

export function getErrorText(error: unknown, fallbackMessage: string): string {
  return error instanceof Error && error.message ? error.message : fallbackMessage;
}

function getNetworkErrorMessage(fallbackMessage: string, error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'Begäran avbröts. Försök igen.';
  }

  const errorMessage = error instanceof Error ? error.message : '';
  if (/failed to fetch|load failed|networkerror|network request failed/i.test(errorMessage)) {
    return `${fallbackMessage} Kunde inte nå servern. Kontrollera att du fortfarande är inloggad och försök igen.`;
  }

  return fallbackMessage;
}

export async function fetchApiData<T>(
  url: string,
  options: RequestInit | undefined,
  fallbackMessage: string
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      credentials: options?.credentials ?? 'include'
    });
  } catch (error) {
    throw new Error(getNetworkErrorMessage(fallbackMessage, error));
  }

  let payload: ApiSuccessEnvelope<T> | null = null;

  try {
    payload = await response.json() as ApiSuccessEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || fallbackMessage);
  }

  return payload.data as T;
}

export function normalizePatternText(value: unknown): string {
  const seen = new Set<string>();
  return String(value || '')
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => {
      if (!row || seen.has(row)) return false;
      seen.add(row);
      return true;
    })
    .join('\n');
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatDateTime(value: unknown): string {
  if (!value) return '—';
  try {
    return new Date(String(value)).toLocaleString('sv-SE');
  } catch {
    return String(value);
  }
}

export function getManuallyExcludedRows(options: BookingTypeOption[] | undefined): number {
  return (options || [])
    .filter((row) => row.selected === false)
    .reduce((sum, row) => sum + row.count, 0);
}

export function renderSummaryCards(data: PreviewData): string {
  const manuallyExcludedRows = getManuallyExcludedRows(data.bookingTypeOptions);
  const cards: Array<[string, number]> = [
    ['Totala rader', data.totalRows],
    ['Giltiga rader', data.validRows],
    ['Ogiltiga rader', data.invalidRows],
    ['Auto-bortsorterade', data.autoExcludedRows || 0],
    ['Ej valda rader', manuallyExcludedRows],
    ['Bortvalda dubletter', data.duplicateRows]
  ];

  return cards.map(([label, value]) => `
    <div class="summary-card">
      <div class="summary-label">${escapeHtml(label)}</div>
      <div class="summary-value">${escapeHtml(value)}</div>
    </div>
  `).join('');
}

export function renderBookingTypeOptionsList(rows: BookingTypeOption[]): string {
  return rows.map((row) => `
    <label class="rule-preview-item booking-type-option">
      <input
        type="checkbox"
        name="includedBookingTypes"
        value="${escapeHtml(row.bookingTypeRaw)}"
        ${row.selected ? 'checked' : ''}
      />
      <div class="booking-type-option-main">
        <div class="booking-type-option-title">${escapeHtml(row.bookingTypeRaw)}</div>
        <div class="helper" style="margin-top: 4px;">${escapeHtml(row.count)} rad${row.count === 1 ? '' : 'er'} kvar efter fasta bortsorteringar</div>
      </div>
    </label>
  `).join('');
}

export function renderAutoExcludedGroupsList(rows: AutoExcludedGroup[]): string {
  return rows.map((row) => `
    <div class="rule-preview-item">
      <div class="rule-preview-top">
        <strong>${escapeHtml(row.label)}</strong>
        <span class="pill warn">${escapeHtml(row.count)} rad${row.count === 1 ? '' : 'er'}</span>
      </div>
      <div class="helper" style="margin-top: 8px;">Orsak: ${escapeHtml(row.reason)}</div>
    </div>
  `).join('');
}

export function renderSelectedRowsTable(rows: SelectedPreviewRow[]): string {
  return rows.length
    ? rows.map((row) => `
        <tr>
          <td>${escapeHtml(row.rowIndex)}</td>
          <td>${escapeHtml(row.patientId)}</td>
          <td>${escapeHtml(row.providerName)}</td>
          <td>${escapeHtml(row.visitDate)}</td>
          <td>${escapeHtml(row.visitStartTime || '—')}</td>
          <td>${escapeHtml(row.bookingTypeRaw || '—')}</td>
          <td><span class="pill info">${escapeHtml(row.bookingTypeNormalized)}</span></td>
        </tr>
      `).join('')
    : '<tr><td colspan="7">Inga giltiga rader hittades.</td></tr>';
}

export function renderDuplicatesTable(rows: DuplicateRow[]): string {
  return rows.length
    ? rows.map((row) => `
        <tr>
          <td>${escapeHtml(row.dedupKey)}</td>
          <td>${escapeHtml(row.keptRowIndex)}</td>
          <td>${escapeHtml(row.discardedRowIndexes.join(', '))}</td>
          <td>${escapeHtml(row.chosenReason)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4">Inga dubletter hittades.</td></tr>';
}

export function renderErrorsTable(rows: ValidationErrorRow[]): string {
  return rows.length
    ? rows.map((row) => `
        <tr>
          <td>${escapeHtml(row.rowIndex)}</td>
          <td>${escapeHtml(row.field)}</td>
          <td>${escapeHtml(row.message)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="3">Inga valideringsfel hittades.</td></tr>';
}

export function renderProviderCard(item: ProviderCardData): string {
  const comments = (item.latestComments || [])
    .slice(0, 4)
    .map((comment) => `
      <div class="comment-card">
        <div class="comment-label">${comment.type === 'bra' ? 'Bra' : 'Förbättra'}</div>
        <div>${escapeHtml(comment.text)}</div>
      </div>
    `)
    .join('');

  const details = item.canShowDetails
    ? `
      <div class="metric-grid-4">
        <div class="summary-card"><div class="summary-label">Helhet</div><div class="summary-value">${escapeHtml(item.overallAverage)}</div></div>
        <div class="summary-card"><div class="summary-label">Bemötande</div><div class="summary-value">${escapeHtml(item.subscores.bemotande)}</div></div>
        <div class="summary-card"><div class="summary-label">Info</div><div class="summary-value">${escapeHtml(item.subscores.information)}</div></div>
        <div class="summary-card"><div class="summary-label">Lyssnad på</div><div class="summary-value">${escapeHtml(item.subscores.lyssnadPa)}</div></div>
      </div>
      <div class="meta-list">
        <div>Svarsfrekvens: <strong>${escapeHtml(item.responseRate)}</strong> · Svar: <strong>${escapeHtml(item.sampleSize)}</strong> · Påminnelser: <strong>${escapeHtml(item.reminderCount || 0)}</strong></div>
        <div>Genomsnittlig tid till första SMS: <strong>${escapeHtml(item.delayMetrics?.averageDelayHours ?? 0)} h</strong></div>
        <div>Fördröjningsfönster: ${(item.delayMetrics?.buckets || []).map((bucket) => `${escapeHtml(bucket.bucket)} (${escapeHtml(bucket.responseRate)})`).join(' · ') || 'Ingen data ännu'}</div>
      </div>
      ${comments ? `<div class="comment-grid">${comments}</div>` : '<div class="empty-note">Inga kommentarer ännu.</div>'}
    `
    : '<div class="empty-note">För få svar för att visa resultat på ett integritetssäkert sätt.</div>';

  return `
    <div class="data-card data-card--metrics">
      <div class="data-card-header">
        <div>
          <h3 class="data-card-title">${escapeHtml(item.providerName)}</h3>
          <div class="data-card-subtitle">Underlag: ${escapeHtml(item.sampleSize)}</div>
        </div>
      </div>
      ${details}
    </div>
  `;
}

export function renderCampaignCard(item: CampaignCardData): string {
  const statusText =
    item.status === 'skickar' && item.queuedInitial > 0
      ? `Köad batch kvar: ${item.queuedInitial}`
      : item.status === 'klar'
        ? 'Utskicket är klart'
        : item.status === 'fel'
          ? 'Något gick fel i utskicket'
          : 'Kampanjen väntar eller bearbetas';

  const surveyCodes = (item.surveyCodes || []).slice(0, 3);
  const surveyCodeSection = surveyCodes.length
    ? `
      <div style="margin-top:12px;">
        <div class="data-card-subtitle" style="margin-bottom:6px;">URL till enkät</div>
        <div class="link-stack">
          ${surveyCodes.map((code) => `
            <div class="link-card">
              <a href="/e/${encodeURIComponent(code)}" target="_blank" rel="noopener noreferrer">/e/${escapeHtml(code)}</a>
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '<div class="empty-note">Inga enkätkoder hittades för kampanjen ännu.</div>';

  const smsTemplateSection = item.sms_mall
    ? `
      <details style="margin-top:12px;">
        <summary class="details-toggle">Visa SMS-mall som användes</summary>
        <pre class="template-panel">${escapeHtml(item.sms_mall)}</pre>
      </details>
    `
    : '';

  return `
    <div class="data-card data-card--campaign">
      <div class="data-card-header">
        <div>
          <h3 class="data-card-title">${escapeHtml(item.namn || 'Namnlös kampanj')}</h3>
          <div class="data-card-subtitle">Skapad ${escapeHtml(formatDateTime(item.created_at))}</div>
        </div>
        <span class="pill ${item.status === 'klar' ? 'ok' : item.status === 'fel' ? 'warn' : 'info'}">${escapeHtml(item.status)}</span>
      </div>

      <div class="metric-grid-4">
        <div class="summary-card"><div class="summary-label">Importerade</div><div class="summary-value">${escapeHtml(item.total_importerade)}</div></div>
        <div class="summary-card"><div class="summary-label">Skickade</div><div class="summary-value">${escapeHtml(item.total_skickade)}</div></div>
        <div class="summary-card"><div class="summary-label">Svar</div><div class="summary-value">${escapeHtml(item.total_svar)}</div></div>
        <div class="summary-card"><div class="summary-label">Påminn möjliga</div><div class="summary-value">${escapeHtml(item.unansweredEligible)}</div></div>
      </div>

      <div class="meta-list">
        <div>Giltiga: <strong>${escapeHtml(item.total_giltiga)}</strong> · Dubletter: <strong>${escapeHtml(item.total_dubletter)}</strong> · Ogiltiga: <strong>${escapeHtml(item.total_ogiltiga)}</strong> · Påminnelser skickade: <strong>${escapeHtml(item.remindersSent)}</strong></div>
        <div>Svarsfrekvens: <strong>${escapeHtml(item.responseRate)}</strong> · ${escapeHtml(statusText)}</div>
      </div>
      ${surveyCodeSection}
      ${smsTemplateSection}

      <div class="actions">
        <button
          type="button"
          class="btn btn-secondary remind-btn"
          data-campaign-id="${escapeHtml(item.id)}"
          ${item.unansweredEligible > 0 && item.skicka_paminnelse ? '' : 'disabled'}
        >
          Skicka påminnelse
        </button>
      </div>
    </div>
  `;
}

export function renderReportProvider(item: ReportProviderData): string {
  return `
    <div class="data-card data-card--metrics">
      <div class="data-card-header">
        <div>
          <h3 class="data-card-title">${escapeHtml(item.providerName)}</h3>
          <div class="data-card-subtitle">Underlag: ${escapeHtml(item.sampleSize)}</div>
        </div>
        <span class="pill ${item.deltaVsPrevious >= 0 ? 'ok' : 'warn'}">
          ${item.deltaVsPrevious >= 0 ? '+' : ''}${escapeHtml(item.deltaVsPrevious)}
        </span>
      </div>

      ${
        item.canShowDetails
          ? `
            <div class="metric-grid-4">
              <div class="summary-card"><div class="summary-label">Helhet</div><div class="summary-value">${escapeHtml(item.overallAverage)}</div></div>
              <div class="summary-card"><div class="summary-label">Bemötande</div><div class="summary-value">${escapeHtml(item.subscores.bemotande)}</div></div>
              <div class="summary-card"><div class="summary-label">Info</div><div class="summary-value">${escapeHtml(item.subscores.information)}</div></div>
              <div class="summary-card"><div class="summary-label">Lyssnad på</div><div class="summary-value">${escapeHtml(item.subscores.lyssnadPa)}</div></div>
            </div>
            <div class="meta-list">
              <div>Genomsnittlig tid till första SMS: <strong>${escapeHtml(item.delayMetrics?.averageDelayHours ?? 0)} h</strong></div>
              <div>Fördröjningsfönster: ${(item.delayMetrics?.buckets || []).map((bucket) => `${escapeHtml(bucket.bucket)} (${escapeHtml(bucket.responseRate)})`).join(' · ') || 'Ingen data ännu'}</div>
            </div>
          `
          : '<div class="empty-note">För få svar för att visa resultat på ett integritetssäkert sätt.</div>'
      }
    </div>
  `;
}

export function updateSelectOptions(
  selectEl: HTMLSelectElement | null,
  values: string[] | undefined,
  selectedValue?: string
): void {
  if (!selectEl) return;

  const current = new Set(
    Array.from(selectEl.querySelectorAll('option'))
      .map((option) => option.value)
  );

  for (const value of values || []) {
    if (!current.has(value)) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      selectEl.appendChild(option);
    }
  }

  if (selectedValue !== undefined) {
    selectEl.value = selectedValue;
  }
}
