import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  type QueryResult = { data: any; error: any };

  const state = {
    enkatSvarResults: [] as QueryResult[],
    enkatDeliveryLogResults: [] as QueryResult[],
    enkatUtskickResults: [] as QueryResult[]
  };

  const nextResult = (queue: QueryResult[], fallback: QueryResult): QueryResult => {
    if (queue.length > 0) {
      return queue.shift() as QueryResult;
    }

    return fallback;
  };

  const fromMock = vi.fn((table: string) => {
    if (table === 'enkat_svar') {
      const result = nextResult(state.enkatSvarResults, { data: [], error: null });
      const builder = {
        data: result.data,
        error: result.error,
        select: vi.fn(() => builder),
        gte: vi.fn(() => builder),
        order: vi.fn(() => builder),
        eq: vi.fn(() => builder)
      };

      return builder;
    }

    if (table === 'enkat_delivery_log') {
      const result = nextResult(state.enkatDeliveryLogResults, { data: [], error: null });
      const builder = {
        data: result.data,
        error: result.error,
        select: vi.fn(() => builder),
        gte: vi.fn(() => builder),
        in: vi.fn(() => builder),
        eq: vi.fn(() => builder)
      };

      return builder;
    }

    if (table === 'enkat_utskick') {
      const result = nextResult(state.enkatUtskickResults, { data: [], error: null });
      const builder = {
        data: result.data,
        error: result.error,
        select: vi.fn(() => builder),
        not: vi.fn(() => builder),
        gte: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        in: vi.fn(() => builder)
      };

      return builder;
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    state,
    fromMock,
    arInloggadMock: vi.fn(),
    hamtaAnvandareMock: vi.fn(),
    resolveEnkatProviderScopeMock: vi.fn(),
    summarizeDelayRowsMock: vi.fn()
  };
});

vi.mock('../../../lib/auth', () => ({
  arInloggad: mocks.arInloggadMock,
  hamtaAnvandare: mocks.hamtaAnvandareMock
}));

vi.mock('../../../lib/supabase', () => ({
  supabaseAdmin: {
    from: mocks.fromMock
  }
}));

vi.mock('../../../lib/enkat-provider-scope', () => ({
  resolveEnkatProviderScope: mocks.resolveEnkatProviderScopeMock
}));

vi.mock('../../../lib/enkat-stats', () => ({
  ANONYMITY_THRESHOLD: 2,
  average: (values: number[]) => {
    if (values.length === 0) {
      return 0;
    }

    const sum = values.reduce((total, value) => total + value, 0);
    return Number((sum / values.length).toFixed(2));
  },
  summarizeDelayRows: mocks.summarizeDelayRowsMock
}));

import { GET } from './dashboard';

function createUrl(path = 'http://localhost/api/enkat/dashboard'): URL {
  return new URL(path);
}

describe('GET /api/enkat/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.enkatSvarResults.length = 0;
    mocks.state.enkatDeliveryLogResults.length = 0;
    mocks.state.enkatUtskickResults.length = 0;

    mocks.arInloggadMock.mockResolvedValue(true);
    mocks.hamtaAnvandareMock.mockResolvedValue({
      id: 'user-1',
      email: 'carlos@example.com',
      roll: 'admin',
      namn: 'Carlos Test'
    });
    mocks.summarizeDelayRowsMock.mockImplementation((rows: unknown[]) => ({
      totalRows: rows.length
    }));
  });

  it('returns 401 when the user is not logged in', async () => {
    mocks.arInloggadMock.mockResolvedValueOnce(false);

    const response = await GET({
      cookies: {} as Parameters<typeof GET>[0]['cookies'],
      url: createUrl()
    } as Parameters<typeof GET>[0]);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: 'Ej inloggad'
    });
  });

  it('returns configured false for self scope without provider mapping', async () => {
    mocks.resolveEnkatProviderScopeMock.mockResolvedValueOnce({
      isAdmin: false,
      ownProviderName: '',
      effectiveProviderFilter: ''
    });

    const response = await GET({
      cookies: {} as Parameters<typeof GET>[0]['cookies'],
      url: createUrl()
    } as Parameters<typeof GET>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        scope: 'self',
        configured: false,
        message: 'Du har ännu inte kopplat ditt konto till ett vårdgivarnamn. Gå till Min profil och välj ditt vårdgivarnamn först.'
      }
    });
    expect(mocks.fromMock).not.toHaveBeenCalled();
  });

  it('returns aggregated admin dashboard data including reminder and comment metrics', async () => {
    mocks.resolveEnkatProviderScopeMock.mockResolvedValueOnce({
      isAdmin: true,
      ownProviderName: null,
      effectiveProviderFilter: ''
    });
    mocks.state.enkatSvarResults.push(
      {
        data: [
          {
            vardgivare_namn: 'Dr Test',
            helhetsbetyg: 8,
            bemotande: 4,
            information: 3,
            lyssnad_pa: 4,
            plan_framat: 5,
            kommentar_bra: 'Bra bemötande',
            kommentar_forbattra: null,
            created_at: '2026-03-18T10:00:00.000Z'
          },
          {
            vardgivare_namn: 'Dr Test',
            helhetsbetyg: 10,
            bemotande: 5,
            information: 5,
            lyssnad_pa: 5,
            plan_framat: 4,
            kommentar_bra: null,
            kommentar_forbattra: 'Mer information',
            created_at: '2026-03-18T11:00:00.000Z'
          }
        ],
        error: null
      },
      {
        data: [{ vardgivare_namn: 'Dr Test' }],
        error: null
      }
    );
    mocks.state.enkatDeliveryLogResults.push({
      data: [
        { status: 'sent', typ: 'forsta_sms', utskick_id: 'u1' },
        { status: 'delivered', typ: 'forsta_sms', utskick_id: 'u1' },
        { status: 'sent', typ: 'paminnelse', utskick_id: 'u2' }
      ],
      error: null
    });
    mocks.state.enkatUtskickResults.push(
      {
        data: [
          {
            id: 'u1',
            vardgivare_namn: 'Dr Test',
            besoksdatum: '2026-03-18',
            besoksstart_tid: '08:00',
            forsta_sms_skickad_vid: '2026-03-18T09:00:00.000Z',
            svarad_vid: null
          }
        ],
        error: null
      },
      {
        data: [
          { id: 'u1', vardgivare_namn: 'Dr Test' },
          { id: 'u2', vardgivare_namn: 'Dr Test' }
        ],
        error: null
      }
    );

    const response = await GET({
      cookies: {} as Parameters<typeof GET>[0]['cookies'],
      url: createUrl()
    } as Parameters<typeof GET>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        scope: 'admin',
        anonymityThreshold: 2,
        availableProviders: ['Dr Test'],
        providers: [
          {
            providerName: 'Dr Test',
            sampleSize: 2,
            canShowDetails: true,
            responseRate: 1,
            deliveredCount: 1,
            sentCount: 2,
            reminderCount: 1,
            overallAverage: 9,
            subscores: {
              bemotande: 4.5,
              information: 4,
              lyssnadPa: 4.5,
              planFramat: 4.5
            },
            highScoreShare: 0.5,
            lowScoreShare: 0,
            latestComments: [
              { type: 'bra', text: 'Bra bemötande', createdAt: '2026-03-18T10:00:00.000Z' },
              { type: 'forbattra', text: 'Mer information', createdAt: '2026-03-18T11:00:00.000Z' }
            ],
            delayMetrics: {
              totalRows: 1
            }
          }
        ],
        totals: {
          providerCount: 1,
          answerCount: 2
        }
      }
    });
  });

  it('returns 500 when the delivery log query fails', async () => {
    mocks.resolveEnkatProviderScopeMock.mockResolvedValueOnce({
      isAdmin: true,
      ownProviderName: null,
      effectiveProviderFilter: ''
    });
    mocks.state.enkatSvarResults.push({
      data: [],
      error: null
    });
    mocks.state.enkatDeliveryLogResults.push({
      data: null,
      error: new Error('log query failed')
    });

    const response = await GET({
      cookies: {} as Parameters<typeof GET>[0]['cookies'],
      url: createUrl()
    } as Parameters<typeof GET>[0]);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      success: false,
      error: 'Kunde inte läsa dashboarddata.',
      details: {
        message: 'log query failed'
      }
    });
  });
});
