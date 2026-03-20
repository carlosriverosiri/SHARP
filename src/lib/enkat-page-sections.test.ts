// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadCampaignHistorySection,
  loadDashboardSection,
  loadReportSection
} from './enkat-page-sections';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('enkat-page-sections', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads dashboard section for admin and updates provider select options', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          scope: 'admin',
          availableProviders: ['Dr A', 'Dr B'],
          providers: [
            {
              providerName: 'Dr A',
              sampleSize: 6,
              canShowDetails: true,
              responseRate: 0.5,
              overallAverage: 8.4,
              subscores: {
                bemotande: 9,
                information: 8,
                lyssnadPa: 8
              },
              delayMetrics: {
                averageDelayHours: 2,
                buckets: []
              },
              latestComments: []
            }
          ],
          totals: {
            providerCount: 1
          }
        }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const bannerEl = document.createElement('div');
    const contentEl = document.createElement('div');
    const providerFilterEl = document.createElement('select');
    providerFilterEl.innerHTML = '<option value="">Alla</option><option value="Dr A">Dr A</option>';
    providerFilterEl.value = 'Dr A';

    await loadDashboardSection({
      bannerEl,
      contentEl,
      providerFilterEl
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/enkat/dashboard?days=90&provider=Dr%20A', undefined);
    expect(bannerEl.textContent).toBe('Visar resultat för 1 vårdgivare.');
    expect(contentEl.innerHTML).toContain('Dr A');
    expect(Array.from(providerFilterEl.querySelectorAll('option')).map((option) => option.value)).toEqual(['', 'Dr A', 'Dr B']);
  });

  it('loads report section for an unconfigured self view', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          scope: 'self',
          configured: false,
          periodLabel: 'Senaste 30 dagarna',
          message: 'Välj vårdgivarnamn först.'
        }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const bannerEl = document.createElement('div');
    const contentEl = document.createElement('div');
    const periodEl = document.createElement('select');
    periodEl.innerHTML = '<option value="month" selected>Month</option>';
    const providerFilterEl = document.createElement('select');

    await loadReportSection({
      bannerEl,
      contentEl,
      periodEl,
      providerFilterEl
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/enkat/report?period=month', undefined);
    expect(bannerEl.textContent).toBe('Rapport laddad: Senaste 30 dagarna.');
    expect(contentEl.innerHTML).toContain('Välj vårdgivarnamn först.');
  });

  it('binds reminder buttons in campaign history and refreshes after send', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: {
            campaigns: [
              {
                id: 'kampanj-1',
                namn: 'Utskick mars',
                status: 'klar',
                created_at: '2026-03-15T09:00:00.000Z',
                total_importerade: 10,
                total_giltiga: 9,
                total_dubletter: 1,
                total_ogiltiga: 0,
                total_skickade: 8,
                total_svar: 4,
                unansweredEligible: 2,
                remindersSent: 1,
                responseRate: 0.5,
                skicka_paminnelse: true,
                queuedInitial: 0
              }
            ]
          }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: {
            eligible: 2,
            sent: 2,
            failed: 0
          }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: {
            campaigns: [
              {
                id: 'kampanj-1',
                namn: 'Utskick mars',
                status: 'klar',
                created_at: '2026-03-15T09:00:00.000Z',
                total_importerade: 10,
                total_giltiga: 9,
                total_dubletter: 1,
                total_ogiltiga: 0,
                total_skickade: 8,
                total_svar: 4,
                unansweredEligible: 2,
                remindersSent: 3,
                responseRate: 0.5,
                skicka_paminnelse: true,
                queuedInitial: 0
              }
            ]
          }
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const afterReminderSent = vi.fn().mockResolvedValue(undefined);
    const bannerEl = document.createElement('div');
    const contentEl = document.createElement('div');

    await loadCampaignHistorySection({
      bannerEl,
      contentEl,
      afterReminderSent
    });

    const button = contentEl.querySelector<HTMLButtonElement>('.remind-btn');
    expect(button).not.toBeNull();

    button?.click();

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/enkat/remind', expect.objectContaining({ method: 'POST' }));
      expect(afterReminderSent).toHaveBeenCalledTimes(1);
    });
  });
});
