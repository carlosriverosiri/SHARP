import {
  escapeHtml,
  fetchApiData,
  getErrorText,
  renderCampaignCard,
  renderProviderCard,
  renderReportProvider,
  setElementBanner,
  updateSelectOptions,
  type CampaignCardData,
  type ProviderCardData,
  type ReportProviderData
} from './enkat-page-helpers';

type DashboardSelfData = {
  scope: 'self';
  configured: boolean;
  message?: string;
} & Partial<ProviderCardData>;

type DashboardAdminData = {
  scope: 'admin';
  availableProviders?: string[];
  providers?: ProviderCardData[];
  totals: {
    providerCount: number;
  };
};

type DashboardData = DashboardSelfData | DashboardAdminData;

type CampaignHistoryData = {
  campaigns?: CampaignCardData[];
};

type ReminderSendData = {
  eligible: number;
  sent: number;
  failed: number;
};

type ReportSelfData = {
  scope: 'self';
  configured: boolean;
  periodLabel: string;
  message?: string;
} & Partial<ReportProviderData>;

type ReportAdminData = {
  scope: 'admin';
  periodLabel: string;
  availableProviders?: string[];
  providers?: ReportProviderData[];
};

type ReportData = ReportSelfData | ReportAdminData;

type DashboardSectionContext = {
  bannerEl: HTMLElement;
  contentEl: HTMLElement;
  providerFilterEl: HTMLSelectElement | null;
};

type CampaignHistorySectionContext = {
  bannerEl: HTMLElement;
  contentEl: HTMLElement;
  afterReminderSent?: () => Promise<void>;
};

type ReportSectionContext = {
  bannerEl: HTMLElement;
  contentEl: HTMLElement;
  periodEl: HTMLSelectElement;
  providerFilterEl: HTMLSelectElement | null;
};

export async function loadDashboardSection({
  bannerEl,
  contentEl,
  providerFilterEl
}: DashboardSectionContext): Promise<void> {
  setElementBanner(bannerEl, 'info', 'Laddar resultatöversikt...');
  contentEl.innerHTML = '';

  try {
    const provider = providerFilterEl?.value || '';
    const data = await fetchApiData<DashboardData>(
      `/api/enkat/dashboard?days=90${provider ? `&provider=${encodeURIComponent(provider)}` : ''}`,
      undefined,
      'Kunde inte läsa dashboarddata.'
    );

    updateSelectOptions(providerFilterEl, data.scope === 'admin' ? data.availableProviders || [] : [], provider);
    setElementBanner(
      bannerEl,
      'success',
      data.scope === 'admin'
        ? `Visar resultat för ${data.totals.providerCount} vårdgivare.`
        : 'Visar dina egna resultat för de senaste 90 dagarna.'
    );

    if (data.scope === 'self') {
      if (!data.configured) {
        contentEl.innerHTML = `<div class="muted-box">${escapeHtml(data.message)}</div>`;
        return;
      }

      contentEl.innerHTML = renderProviderCard(data as ProviderCardData);
      return;
    }

    const providers = data.providers || [];
    if (!providers.length) {
      contentEl.innerHTML = '<div class="muted-box">Inga enkätsvar hittades ännu för vald period.</div>';
      return;
    }

    contentEl.innerHTML = `
      <div style="display:grid;gap:16px;">
        ${providers.map((item) => renderProviderCard(item)).join('')}
      </div>
    `;
  } catch (error) {
    console.error(error);
    setElementBanner(bannerEl, 'error', getErrorText(error, 'Kunde inte ladda resultatöversikten.'));
  }
}

export async function loadCampaignHistorySection({
  bannerEl,
  contentEl,
  afterReminderSent
}: CampaignHistorySectionContext): Promise<void> {
  setElementBanner(bannerEl, 'info', 'Laddar kampanjhistorik...');
  contentEl.innerHTML = '';

  try {
    const data = await fetchApiData<CampaignHistoryData>(
      '/api/enkat/campaigns',
      undefined,
      'Kunde inte läsa kampanjhistoriken.'
    );
    const campaigns = data.campaigns || [];

    if (!campaigns.length) {
      setElementBanner(bannerEl, 'success', 'Ingen kampanjhistorik ännu.');
      contentEl.innerHTML = '<div class="muted-box">När du skapar dina första kampanjer visas de här.</div>';
      return;
    }

    setElementBanner(bannerEl, 'success', `Visar ${campaigns.length} kampanjer.`);
    contentEl.innerHTML = `<div style="display:grid;gap:16px;">${campaigns.map((item) => renderCampaignCard(item)).join('')}</div>`;

    contentEl.querySelectorAll<HTMLButtonElement>('.remind-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const campaignId = button.getAttribute('data-campaign-id');
        if (!campaignId) return;

        button.disabled = true;
        setElementBanner(bannerEl, 'info', 'Skickar påminnelser...');

        try {
          const result = await fetchApiData<ReminderSendData>('/api/enkat/remind', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId })
          }, 'Kunde inte skicka påminnelser.');

          setElementBanner(
            bannerEl,
            'success',
            `Påminnelser skickade. Berörda: ${result.eligible}, skickade: ${result.sent}, misslyckade: ${result.failed}.`
          );
          await loadCampaignHistorySection({ bannerEl, contentEl, afterReminderSent });
          if (afterReminderSent) {
            await afterReminderSent();
          }
        } catch (error) {
          console.error(error);
          setElementBanner(bannerEl, 'error', getErrorText(error, 'Ett oväntat fel uppstod vid påminnelseutskick.'));
          button.disabled = false;
        }
      });
    });
  } catch (error) {
    console.error(error);
    setElementBanner(bannerEl, 'error', getErrorText(error, 'Kunde inte ladda kampanjhistoriken.'));
  }
}

export async function loadReportSection({
  bannerEl,
  contentEl,
  periodEl,
  providerFilterEl
}: ReportSectionContext): Promise<void> {
  setElementBanner(bannerEl, 'info', 'Laddar rapport...');
  contentEl.innerHTML = '';

  try {
    const period = periodEl.value || 'month';
    const provider = providerFilterEl?.value || '';
    const data = await fetchApiData<ReportData>(
      `/api/enkat/report?period=${encodeURIComponent(period)}${provider ? `&provider=${encodeURIComponent(provider)}` : ''}`,
      undefined,
      'Kunde inte läsa rapporten.'
    );

    updateSelectOptions(providerFilterEl, data.scope === 'admin' ? data.availableProviders || [] : [], provider);
    setElementBanner(bannerEl, 'success', `Rapport laddad: ${data.periodLabel}.`);

    if (data.scope === 'self') {
      if (!data.configured) {
        contentEl.innerHTML = `<div class="muted-box">${escapeHtml(data.message)}</div>`;
        return;
      }

      if (!data.canShowDetails) {
        contentEl.innerHTML = `<div class="muted-box">${escapeHtml(data.message || 'För få svar för att visa resultat på ett integritetssäkert sätt.')}</div>`;
        return;
      }

      contentEl.innerHTML = renderReportProvider(data as ReportProviderData);
      return;
    }

    const providers = data.providers || [];
    if (!providers.length) {
      contentEl.innerHTML = '<div class="muted-box">Inga rapportdata hittades för vald period.</div>';
      return;
    }

    contentEl.innerHTML = `
      <div style="display:grid;gap:16px;">
        ${providers.map((item) => renderReportProvider(item)).join('')}
      </div>
    `;
  } catch (error) {
    console.error(error);
    setElementBanner(bannerEl, 'error', getErrorText(error, 'Kunde inte ladda rapporten.'));
  }
}
