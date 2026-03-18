import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  type QueryResult = { data: any; error: any };

  const state = {
    enkatSvarResults: [] as QueryResult[],
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
        lte: vi.fn(() => builder),
        lt: vi.fn(() => builder),
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
        lte: vi.fn(() => builder),
        eq: vi.fn(() => builder)
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

vi.mock('../../../../lib/auth', () => ({
  arInloggad: mocks.arInloggadMock,
  hamtaAnvandare: mocks.hamtaAnvandareMock
}));

vi.mock('../../../../lib/supabase', () => ({
  supabaseAdmin: {
    from: mocks.fromMock
  }
}));

vi.mock('../../../../lib/enkat-provider-scope', () => ({
  resolveEnkatProviderScope: mocks.resolveEnkatProviderScopeMock
}));

vi.mock('../../../../lib/enkat-stats', () => ({
  ANONYMITY_THRESHOLD: 5,
  average: (values: number[]) => {
    if (values.length === 0) {
      return 0;
    }

    const sum = values.reduce((total, value) => total + value, 0);
    return Number((sum / values.length).toFixed(2));
  },
  summarizeDelayRows: mocks.summarizeDelayRowsMock
}));

import { GET } from '../report';

function createUrl(path = 'http://localhost/api/enkat/report'): URL {
  return new URL(path);
}

describe('GET /api/enkat/report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.enkatSvarResults.length = 0;
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
        periodLabel: 'Senaste 30 dagarna',
        message: 'Du har ännu inte kopplat ditt konto till ett vårdgivarnamn. Gå till Min profil och välj ditt vårdgivarnamn först.'
      }
    });
    expect(mocks.fromMock).not.toHaveBeenCalled();
  });

  it('returns aggregated admin report data with provider deltas and totals', async () => {
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
            plan_framat: 5
          },
          {
            vardgivare_namn: 'Dr Test',
            helhetsbetyg: 10,
            bemotande: 5,
            information: 5,
            lyssnad_pa: 5,
            plan_framat: 4
          }
        ],
        error: null
      },
      {
        data: [
          {
            vardgivare_namn: 'Dr Test',
            helhetsbetyg: 7,
            bemotande: 4,
            information: 4,
            lyssnad_pa: 4,
            plan_framat: 4
          }
        ],
        error: null
      },
      {
        data: [{ vardgivare_namn: 'Dr Test' }],
        error: null
      }
    );
    mocks.state.enkatUtskickResults.push({
      data: [
        {
          vardgivare_namn: 'Dr Test',
          besoksdatum: '2026-03-18',
          besoksstart_tid: '08:00',
          forsta_sms_skickad_vid: '2026-03-18T09:00:00.000Z',
          svarad_vid: null
        }
      ],
      error: null
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
        scope: 'admin',
        periodLabel: 'Senaste 30 dagarna',
        anonymityThreshold: 5,
        availableProviders: ['Dr Test'],
        providers: [
          {
            providerName: 'Dr Test',
            sampleSize: 2,
            canShowDetails: false,
            overallAverage: 9,
            subscores: {
              bemotande: 4.5,
              information: 4,
              lyssnadPa: 4.5,
              planFramat: 4.5
            },
            delayMetrics: {
              totalRows: 1
            },
            deltaVsPrevious: 2
          }
        ],
        totals: {
          providerCount: 1,
          answerCount: 2
        }
      }
    });
  });

  it('returns 500 when a later report query fails', async () => {
    mocks.resolveEnkatProviderScopeMock.mockResolvedValueOnce({
      isAdmin: true,
      ownProviderName: null,
      effectiveProviderFilter: ''
    });
    mocks.state.enkatSvarResults.push(
      {
        data: [],
        error: null
      },
      {
        data: null,
        error: new Error('previous query failed')
      }
    );

    const response = await GET({
      cookies: {} as Parameters<typeof GET>[0]['cookies'],
      url: createUrl()
    } as Parameters<typeof GET>[0]);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      success: false,
      error: 'Kunde inte läsa rapportdata.',
      details: {
        message: 'previous query failed'
      }
    });
  });
});
