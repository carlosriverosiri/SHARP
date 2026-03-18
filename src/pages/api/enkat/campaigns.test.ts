import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  type QueryResult = { data: any; error: any };

  const state = {
    campaignResults: [] as QueryResult[],
    utskickResults: [] as QueryResult[],
    deliveryLogResults: [] as QueryResult[],
    campaignFilters: [] as Array<Array<[string, unknown]>>
  };

  const nextResult = (queue: QueryResult[], fallback: QueryResult): QueryResult => {
    if (queue.length > 0) {
      return queue.shift() as QueryResult;
    }

    return fallback;
  };

  const fromMock = vi.fn((table: string) => {
    if (table === 'enkat_kampanjer') {
      const filters: Array<[string, unknown]> = [];
      state.campaignFilters.push(filters);
      const result = nextResult(state.campaignResults, { data: [], error: null });
      const builder = {
        data: result.data,
        error: result.error,
        select: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        eq: vi.fn((column: string, value: unknown) => {
          filters.push([column, value]);
          return builder;
        })
      };

      return builder;
    }

    if (table === 'enkat_utskick') {
      const result = nextResult(state.utskickResults, { data: [], error: null });
      const builder = {
        data: result.data,
        error: result.error,
        select: vi.fn(() => builder),
        in: vi.fn(() => builder),
        not: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        is: vi.fn(() => builder),
        gte: vi.fn(() => builder)
      };

      return builder;
    }

    if (table === 'enkat_delivery_log') {
      const result = nextResult(state.deliveryLogResults, { data: [], error: null });
      const builder = {
        data: result.data,
        error: result.error,
        select: vi.fn(() => builder),
        in: vi.fn(() => builder),
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
    hamtaAnvandareMock: vi.fn()
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

import { GET } from './campaigns';

describe('GET /api/enkat/campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.campaignResults.length = 0;
    mocks.state.utskickResults.length = 0;
    mocks.state.deliveryLogResults.length = 0;
    mocks.state.campaignFilters.length = 0;

    mocks.arInloggadMock.mockResolvedValue(true);
    mocks.hamtaAnvandareMock.mockResolvedValue({
      id: 'user-1',
      email: 'carlos@example.com',
      roll: 'admin',
      namn: 'Carlos Test'
    });
  });

  it('returns 401 when the user is not logged in', async () => {
    mocks.arInloggadMock.mockResolvedValueOnce(false);

    const response = await GET({
      cookies: {} as Parameters<typeof GET>[0]['cookies']
    } as Parameters<typeof GET>[0]);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: 'Ej inloggad'
    });
  });

  it('applies skapad_av filter for non-admin users', async () => {
    mocks.hamtaAnvandareMock.mockResolvedValueOnce({
      id: 'user-1',
      email: 'carlos@example.com',
      roll: 'personal',
      namn: 'Carlos Test'
    });
    mocks.state.campaignResults.push({
      data: [],
      error: null
    });

    const response = await GET({
      cookies: {} as Parameters<typeof GET>[0]['cookies']
    } as Parameters<typeof GET>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        campaigns: []
      }
    });
    expect(mocks.state.campaignFilters[0]).toEqual([
      ['skapad_av', 'user-1']
    ]);
  });

  it('aggregates reminder stats and response rate for campaign rows', async () => {
    mocks.state.campaignResults.push({
      data: [
        {
          id: 'kampanj-1',
          namn: 'Vecka 12',
          status: 'skickar',
          total_importerade: 10,
          total_giltiga: 8,
          total_dubletter: 1,
          total_ogiltiga: 1,
          total_skickade: 4,
          total_svar: 3,
          skicka_paminnelse: true,
          paminnelse_efter_timmar: 48,
          created_at: '2026-03-18T10:00:00.000Z',
          skapad_av: 'user-1'
        }
      ],
      error: null
    });
    mocks.state.utskickResults.push(
      {
        data: [{ kampanj_id: 'kampanj-1' }, { kampanj_id: 'kampanj-1' }],
        error: null
      },
      {
        data: [{ kampanj_id: 'kampanj-1' }],
        error: null
      }
    );
    mocks.state.deliveryLogResults.push({
      data: [{ kampanj_id: 'kampanj-1' }, { kampanj_id: 'kampanj-1' }, { kampanj_id: 'kampanj-1' }],
      error: null
    });

    const response = await GET({
      cookies: {} as Parameters<typeof GET>[0]['cookies']
    } as Parameters<typeof GET>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        campaigns: [
          {
            id: 'kampanj-1',
            namn: 'Vecka 12',
            status: 'skickar',
            total_importerade: 10,
            total_giltiga: 8,
            total_dubletter: 1,
            total_ogiltiga: 1,
            total_skickade: 4,
            total_svar: 3,
            skicka_paminnelse: true,
            paminnelse_efter_timmar: 48,
            created_at: '2026-03-18T10:00:00.000Z',
            skapad_av: 'user-1',
            remindersSent: 2,
            unansweredEligible: 1,
            queuedInitial: 3,
            responseRate: 0.75
          }
        ]
      }
    });
  });

  it('returns 500 when a reminder stats query fails', async () => {
    mocks.state.campaignResults.push({
      data: [
        {
          id: 'kampanj-1',
          namn: 'Vecka 12',
          status: 'skickar',
          total_importerade: 10,
          total_giltiga: 8,
          total_dubletter: 1,
          total_ogiltiga: 1,
          total_skickade: 4,
          total_svar: 3,
          skicka_paminnelse: true,
          paminnelse_efter_timmar: 48,
          created_at: '2026-03-18T10:00:00.000Z',
          skapad_av: 'user-1'
        }
      ],
      error: null
    });
    mocks.state.utskickResults.push(
      {
        data: null,
        error: new Error('stat query failed')
      },
      {
        data: [],
        error: null
      }
    );
    mocks.state.deliveryLogResults.push({
      data: [],
      error: null
    });

    const response = await GET({
      cookies: {} as Parameters<typeof GET>[0]['cookies']
    } as Parameters<typeof GET>[0]);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      success: false,
      error: 'Kunde inte läsa kampanjhistorik.',
      details: {
        message: 'stat query failed'
      }
    });
  });
});
