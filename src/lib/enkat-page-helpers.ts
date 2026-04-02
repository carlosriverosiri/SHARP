import type { SmsRoundHelhetsbetyg, SmsRoundHelhetsbetygBreakdown, SmsRoundStats } from './enkat-stats';

export type { SmsRoundHelhetsbetyg, SmsRoundStats };

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
  sentCount?: number;
  deliveredCount?: number;
  reminderCount?: number;
  overallAverage: number;
  highScoreShare?: number;
  lowScoreShare?: number;
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

function rateColorClass(rate: number): string {
  const pct = Math.round(rate * 100);
  return pct >= 50 ? 'rate-high' : pct >= 30 ? 'rate-mid' : 'rate-low';
}

function scoreColorClass(score: number): string {
  return score >= 4 ? 'score-high' : score >= 3 ? 'score-mid' : 'score-low';
}

function formatPercent(rate: number | undefined): string {
  return `${Math.round((rate || 0) * 100)}%`;
}

export function setElementBanner(
  element: HTMLElement | null,
  type: 'info' | 'error' | 'success',
  message: string
): void {
  if (!element) return;
  if (!message.trim()) {
    element.className = 'banner';
    element.textContent = '';
    return;
  }
  element.className = `banner visible ${type}`;
  element.textContent = message;
}

export function getErrorText(error: unknown, fallbackMessage: string): string {
  const raw = error instanceof Error && error.message ? error.message : fallbackMessage;
  if (raw === 'Ej inloggad') {
    return 'Inloggningen kunde inte verifieras för den här delen av sidan. Ladda om sidan. Om det kvarstår: logga ut och logga in igen.';
  }
  return raw;
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

/** Ett decimaltecken för medelbetyg, deltavärden och timmar i enkät-UI. */
export function formatEnkatMeanScore(value: number): string {
  return Number(value).toFixed(1);
}

/** Visas i kampanjhistorik under 640px; fullständigt namn döljs visuellt men finns kvar för skärmläsare. */
const CAMPAIGN_NAME_PATIENTUPPLEVELSE_MOBILE_SHORT = 'Patientupp';

/** Exakt "Patientupplevelse" eller samma stam + datum (YYYY-MM-DD, YYYYMMDD, med/utan mellanslag). */
function isPatientupplevelseCampaignLabel(label: string): boolean {
  if (/^patientupplevelse$/i.test(label)) return true;
  if (/^patientupplevelse\s+(\d{4}-\d{2}-\d{2}|\d{8})$/i.test(label)) return true;
  if (/^patientupplevelse\d{8}$/i.test(label)) return true;
  return false;
}

export function formatCampaignNameForHistoryCell(namn: string | null): string {
  const label = (namn || '').trim() || 'Namnlös';
  if (isPatientupplevelseCampaignLabel(label)) {
    return `<span class="campaign-name--full">${escapeHtml(label)}</span><span class="campaign-name--short" aria-hidden="true">${escapeHtml(CAMPAIGN_NAME_PATIENTUPPLEVELSE_MOBILE_SHORT)}</span>`;
  }
  return escapeHtml(label);
}

export function formatDateTime(value: unknown): string {
  if (!value) return '—';
  try {
    return new Date(String(value)).toLocaleString('sv-SE');
  } catch {
    return String(value);
  }
}

export function formatShortDate(value: unknown): string {
  if (!value) return '—';
  try {
    return new Date(String(value)).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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

function renderHelhetsbetygSnittLine(
  breakdown: SmsRoundHelhetsbetygBreakdown,
  anonymityThreshold: number
): string {
  if (breakdown.sampleSize === 0) {
    return 'Inga kopplade helhetsbetyg i den här gruppen.';
  }
  if (breakdown.averageHelhet === null) {
    return `Helhetsbetyg visas inte — ${escapeHtml(breakdown.sampleSize)} svar (under tröskeln ${escapeHtml(anonymityThreshold)}).`;
  }
  return `Medel helhetsbetyg: ${escapeHtml(formatEnkatMeanScore(breakdown.averageHelhet))} (${escapeHtml(breakdown.sampleSize)} svar)`;
}

/** Visar svarsfrekvens: (1) bland alla som fått första SMS, (2) bland de som fått påminnelse. */
export function renderSmsRoundCard(
  stats: SmsRoundStats | null | undefined,
  helhetsbetyg?: SmsRoundHelhetsbetyg | null,
  anonymityThreshold = 5
): string {
  const s = stats ?? {
    firstSmsRecipients: 0,
    answeredAfterFirstOnly: 0,
    remindersSent: 0,
    answeredAfterReminder: 0,
    firstRoundRate: 0,
    reminderRoundRate: null as number | null
  };

  const firstPct = Math.round(s.firstRoundRate * 100);
  const remPct =
    s.reminderRoundRate === null ? null : Math.round(s.reminderRoundRate * 100);

  const reminderSub =
    s.remindersSent === 0
      ? 'Inga påminnelser skickade i vald period.'
      : `${escapeHtml(s.answeredAfterReminder)} svar av ${escapeHtml(s.remindersSent)} påminnelse-SMS`;

  const h = helhetsbetyg ?? null;
  const firstHelhetBlock = h
    ? `<div class="kpi-card-helhet-snitt" role="status">${renderHelhetsbetygSnittLine(h.afterFirstSmsOnly, anonymityThreshold)}</div>`
    : '';
  const reminderHelhetBlock = h
    ? `<div class="kpi-card-helhet-snitt" role="status">${renderHelhetsbetygSnittLine(h.afterReminder, anonymityThreshold)}</div>`
    : '';

  return `
    <div class="kpi-row sms-round-row" role="region" aria-label="Svarsfrekvens första SMS och påminnelse">
      <div class="kpi-card sms-round-card">
        <div class="kpi-card-label">Svar efter första SMS</div>
        <div class="kpi-card-value">${escapeHtml(firstPct)}%</div>
        <div class="kpi-card-sub">${escapeHtml(s.answeredAfterFirstOnly)} svar av ${escapeHtml(s.firstSmsRecipients)} med första SMS (ingen påminnelse)</div>
        ${firstHelhetBlock}
        <div class="kpi-card-hint">Andel av alla som fått första enkät-SMS som svarade innan påminnelse skickades.</div>
      </div>
      <div class="kpi-card sms-round-card">
        <div class="kpi-card-label">Svar efter påminnelse</div>
        <div class="kpi-card-value">${remPct === null ? '—' : escapeHtml(remPct) + '%'}</div>
        <div class="kpi-card-sub">${reminderSub}</div>
        ${reminderHelhetBlock}
        <div class="kpi-card-hint">Andel av skickade påminnelser där patienten sedan svarade (svar efter påminnelsen).</div>
      </div>
    </div>
  `;
}

export function renderKpiRow(providers: ProviderCardData[]): string {
  const totalSent = providers.reduce((sum, p) => sum + (p.sentCount || 0), 0);
  const totalAnswered = providers.reduce((sum, p) => sum + p.sampleSize, 0);
  const overallRate = totalSent > 0 ? totalAnswered / totalSent : 0;
  const overallAvg = totalAnswered > 0
    ? providers.reduce((sum, p) => sum + p.overallAverage * p.sampleSize, 0) / totalAnswered
    : 0;
  const ratePct = Math.round(overallRate * 100);

  return `
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-card-label">Patienter kontaktade</div>
        <div class="kpi-card-value">${escapeHtml(totalSent)}</div>
        <div class="kpi-card-sub">${escapeHtml(providers.length)} vårdgivare</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-card-label">Besvarade</div>
        <div class="kpi-card-value">${escapeHtml(totalAnswered)}</div>
        <div class="kpi-card-sub">av ${escapeHtml(totalSent)} patienter</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-card-label">Svarsfrekvens</div>
        <div class="kpi-card-value">${escapeHtml(ratePct)}%</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar"><div class="progress-bar-fill ${rateColorClass(overallRate)}" style="width: ${ratePct}%"></div></div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-card-label">Medelbetyg</div>
        <div class="kpi-card-value">${escapeHtml(formatEnkatMeanScore(overallAvg))}</div>
        <div class="kpi-card-sub">Helhetsbetyg (1–5)</div>
      </div>
    </div>
  `;
}

export function renderProviderCard(item: ProviderCardData): string {
  const ratePct = Math.round(item.responseRate * 100);

  if (!item.canShowDetails) {
    return `
      <div class="provider-card-v2">
        <div class="provider-card-header">
          <div>
            <h3 class="provider-card-name">${escapeHtml(item.providerName)}</h3>
            <div class="provider-card-sample">${escapeHtml(item.sampleSize)} svar</div>
          </div>
        </div>
        <div class="provider-card-empty">För få svar för att visa resultat på ett integritetssäkert sätt.</div>
      </div>
    `;
  }

  const comments = (item.latestComments || []).slice(0, 4);
  const commentHtml = comments.length
    ? `
      <div class="provider-comments">
        ${comments.map((c) => `
          <div class="provider-comment">
            <div class="provider-comment-type type-${c.type === 'bra' ? 'bra' : 'forbattra'}">${c.type === 'bra' ? 'Positivt' : 'Kan förbättras'}</div>
            <div>${escapeHtml(c.text)}</div>
          </div>
        `).join('')}
      </div>
    `
    : '';

  return `
    <div class="provider-card-v2">
      <div class="provider-card-header">
        <div>
          <h3 class="provider-card-name">${escapeHtml(item.providerName)}</h3>
          <div class="provider-card-sample">${escapeHtml(item.sampleSize)} svar</div>
        </div>
        <div class="score-badge ${scoreColorClass(item.overallAverage)}">${escapeHtml(formatEnkatMeanScore(item.overallAverage))}</div>
      </div>

      <div class="progress-bar-wrap">
        <div class="progress-bar-labels">
          <span>Svarsfrekvens</span>
          <span>${escapeHtml(ratePct)}%</span>
        </div>
        <div class="progress-bar"><div class="progress-bar-fill ${rateColorClass(item.responseRate)}" style="width: ${ratePct}%"></div></div>
      </div>

      <div class="score-grid">
        <div class="score-item">
          <div class="score-item-value">${escapeHtml(formatEnkatMeanScore(item.overallAverage))}</div>
          <div class="score-item-label">Helhet</div>
        </div>
        <div class="score-item">
          <div class="score-item-value">${escapeHtml(formatEnkatMeanScore(item.subscores.bemotande))}</div>
          <div class="score-item-label">Bemötande</div>
        </div>
        <div class="score-item">
          <div class="score-item-value">${escapeHtml(formatEnkatMeanScore(item.subscores.information))}</div>
          <div class="score-item-label">Information</div>
        </div>
        <div class="score-item">
          <div class="score-item-value">${escapeHtml(formatEnkatMeanScore(item.subscores.lyssnadPa))}</div>
          <div class="score-item-label">Lyssnad på</div>
        </div>
      </div>

      <div class="provider-meta">
        Patienter kontaktade: ${escapeHtml(item.sentCount || 0)}
        · Påminnelser: ${escapeHtml(item.reminderCount || 0)}
        · Tid till SMS: ${escapeHtml(formatEnkatMeanScore(item.delayMetrics?.averageDelayHours ?? 0))} h
      </div>

      ${commentHtml}
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
        <div class="summary-card"><div class="summary-label">Påminnelser skickade</div><div class="summary-value">${escapeHtml(item.remindersSent)}</div></div>
      </div>

      <div class="meta-list">
        <div>Giltiga: <strong>${escapeHtml(item.total_giltiga)}</strong> · Dubletter: <strong>${escapeHtml(item.total_dubletter)}</strong> · Ogiltiga: <strong>${escapeHtml(item.total_ogiltiga)}</strong></div>
        <div>Svarsfrekvens: <strong>${escapeHtml(item.responseRate)}</strong> · ${escapeHtml(statusText)}</div>
      </div>
      ${surveyCodeSection}
      ${smsTemplateSection}
    </div>
  `;
}

export function renderCampaignTable(campaigns: CampaignCardData[]): string {
  const rows = campaigns.map((item) => {
    const ratePct = Math.round(item.responseRate * 100);
    const statusClass = item.status === 'klar' ? 'status-klar'
      : item.status === 'skickar' ? 'status-skickar'
      : item.status === 'fel' ? 'status-fel'
      : 'status-default';
    const statusLabel = item.status === 'klar' ? 'Klar'
      : item.status === 'skickar' ? 'Skickar'
      : item.status === 'fel' ? 'Fel'
      : 'Väntar';

    return `
      <tr>
        <td class="cell-name">${formatCampaignNameForHistoryCell(item.namn)}</td>
        <td class="cell-date">${escapeHtml(formatShortDate(item.created_at))}</td>
        <td class="cell-num">${escapeHtml(item.total_skickade)}</td>
        <td class="cell-num">${escapeHtml(item.total_svar)}</td>
        <td>
          <div class="campaign-rate-bar">
            <div class="progress-bar"><div class="progress-bar-fill ${rateColorClass(item.responseRate)}" style="width: ${ratePct}%"></div></div>
            <span class="rate-label">${escapeHtml(ratePct)}%</span>
          </div>
        </td>
        <td><span class="status-badge ${statusClass}">${escapeHtml(statusLabel)}</span></td>
        <td>
          <button
            type="button"
            class="delete-campaign-btn"
            data-campaign-id="${escapeHtml(item.id)}"
            data-campaign-name="${escapeHtml(item.namn || 'Namnlös')}"
            aria-label="Radera kampanj ${escapeHtml(item.namn || '')}"
          ><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="campaign-table-wrap">
      <table class="campaign-table">
        <colgroup>
          <col style="width: 16%">
          <col style="width: 15%">
          <col style="width: 10%">
          <col style="width: 8%">
          <col style="width: 25%">
          <col style="width: 14%">
          <col style="width: 12%">
        </colgroup>
        <thead>
          <tr>
            <th>Kampanj</th>
            <th>Datum</th>
            <th style="text-align: right">Skickade</th>
            <th style="text-align: right">Svar</th>
            <th>Svarsfrekvens</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

export function renderReportProvider(item: ReportProviderData): string {
  const deltaSymbol = item.deltaVsPrevious > 0 ? '↑' : item.deltaVsPrevious < 0 ? '↓' : '→';
  const deltaClass = item.deltaVsPrevious > 0 ? 'delta-up' : item.deltaVsPrevious < 0 ? 'delta-down' : 'delta-flat';

  if (!item.canShowDetails) {
    return `
      <div class="provider-card-v2">
        <div class="provider-card-header">
          <div>
            <h3 class="provider-card-name">${escapeHtml(item.providerName)}</h3>
            <div class="provider-card-sample">${escapeHtml(item.sampleSize)} svar</div>
          </div>
        </div>
        <div class="provider-card-empty">För få svar för att visa resultat på ett integritetssäkert sätt.</div>
      </div>
    `;
  }

  return `
    <div class="provider-card-v2">
      <div class="provider-card-header">
        <div>
          <h3 class="provider-card-name">${escapeHtml(item.providerName)}</h3>
          <div class="provider-card-sample">${escapeHtml(item.sampleSize)} svar</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="score-badge ${scoreColorClass(item.overallAverage)}">${escapeHtml(formatEnkatMeanScore(item.overallAverage))}</div>
          <span class="delta-badge ${deltaClass}">${deltaSymbol} ${item.deltaVsPrevious >= 0 ? '+' : ''}${escapeHtml(formatEnkatMeanScore(item.deltaVsPrevious))}</span>
        </div>
      </div>

      <div class="score-grid">
        <div class="score-item">
          <div class="score-item-value">${escapeHtml(formatEnkatMeanScore(item.overallAverage))}</div>
          <div class="score-item-label">Helhet</div>
        </div>
        <div class="score-item">
          <div class="score-item-value">${escapeHtml(formatEnkatMeanScore(item.subscores.bemotande))}</div>
          <div class="score-item-label">Bemötande</div>
        </div>
        <div class="score-item">
          <div class="score-item-value">${escapeHtml(formatEnkatMeanScore(item.subscores.information))}</div>
          <div class="score-item-label">Information</div>
        </div>
        <div class="score-item">
          <div class="score-item-value">${escapeHtml(formatEnkatMeanScore(item.subscores.lyssnadPa))}</div>
          <div class="score-item-label">Lyssnad på</div>
        </div>
      </div>

      <div class="provider-meta">
        Tid till SMS: ${escapeHtml(formatEnkatMeanScore(item.delayMetrics?.averageDelayHours ?? 0))} h
        · Fördröjningsfönster: ${(item.delayMetrics?.buckets || []).map((bucket) => `${escapeHtml(bucket.bucket)} (${escapeHtml(formatPercent(bucket.responseRate))})`).join(' · ') || 'Ingen data ännu'}
      </div>
    </div>
  `;
}

export function updateSelectOptions(
  selectEl: HTMLSelectElement | null,
  values: string[] | undefined,
  selectedValue?: string
): void {
  if (!selectEl) return;

  const placeholderOptions = Array.from(selectEl.querySelectorAll('option'))
    .filter((option) => option.value === '');
  const normalizedValues = [...new Set(values || [])];
  const desiredValues = selectedValue && !normalizedValues.includes(selectedValue)
    ? [...normalizedValues, selectedValue]
    : normalizedValues;

  selectEl.innerHTML = '';
  for (const option of placeholderOptions) {
    selectEl.appendChild(option);
  }

  for (const value of desiredValues) {
    if (!value) continue;
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  }

  if (selectedValue !== undefined) {
    selectEl.value = selectedValue;
  }
}
