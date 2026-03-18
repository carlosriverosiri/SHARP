import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDefaultExcludedBookingTypePatternText, parseExcludedBookingTypePatterns } from '../../../../lib/enkat-follow-up-rules';

const mocks = vi.hoisted(() => {
  type QueryResult = { data: any; error: any };

  const state = {
    getResults: [] as QueryResult[],
    postResults: [] as QueryResult[],
    upsertPayloads: [] as any[]
  };

  const nextResult = (queue: QueryResult[], fallback: QueryResult): QueryResult => {
    if (queue.length > 0) {
      return queue.shift() as QueryResult;
    }

    return fallback;
  };

  const fromMock = vi.fn((table: string) => {
    if (table !== 'enkat_installningar') {
      throw new Error(`Unexpected table: ${table}`);
    }

    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => nextResult(state.getResults, { data: null, error: null }))
        })),
        single: vi.fn(async () => nextResult(state.postResults, { data: null, error: null }))
      })),
      upsert: vi.fn((payload: unknown) => {
        state.upsertPayloads.push(payload);
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => nextResult(state.postResults, { data: null, error: null }))
          }))
        };
      })
    };
  });

  return {
    state,
    fromMock,
    arInloggadMock: vi.fn(),
    hamtaAnvandareMock: vi.fn()
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

import { GET, POST } from '../settings';

function createPostRequest(overrides: Record<string, unknown> = {}): Request {
  return new Request('http://localhost/api/enkat/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      excludedBookingTypePatterns: ['ssk', 'telefon'],
      ...overrides
    })
  });
}

describe('/api/enkat/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.getResults.length = 0;
    mocks.state.postResults.length = 0;
    mocks.state.upsertPayloads.length = 0;

    mocks.arInloggadMock.mockResolvedValue(true);
    mocks.hamtaAnvandareMock.mockResolvedValue({
      id: 'user-1',
      email: 'carlos@example.com',
      roll: 'admin',
      namn: 'Carlos Test'
    });
  });

  it('returns fallback defaults when the settings table is missing', async () => {
    mocks.state.getResults.push({
      data: null,
      error: {
        code: '42P01',
        message: 'relation "enkat_installningar" does not exist'
      }
    });

    const response = await GET({
      cookies: {} as Parameters<typeof GET>[0]['cookies']
    } as Parameters<typeof GET>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      excludedBookingTypePatterns: parseExcludedBookingTypePatterns(getDefaultExcludedBookingTypePatternText()),
      patternText: getDefaultExcludedBookingTypePatternText(),
      updatedAt: null,
      updatedBy: null,
      usingFallbackDefaults: true
    });
    expect(body.warning).toContain('025-enkat-installningar.sql');
  });

  it('returns stored settings when the shared row exists', async () => {
    mocks.state.getResults.push({
      data: {
        exkludera_bokningstyper: ['ssk', 'telefon'],
        updated_at: '2026-03-18T10:00:00.000Z',
        updated_by: 'user-1'
      },
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
        excludedBookingTypePatterns: ['ssk', 'telefon'],
        patternText: 'ssk\ntelefon',
        updatedAt: '2026-03-18T10:00:00.000Z',
        updatedBy: 'user-1',
        usingFallbackDefaults: false
      }
    });
  });

  it('blocks non-admin users from saving settings', async () => {
    mocks.hamtaAnvandareMock.mockResolvedValueOnce({
      id: 'user-2',
      email: 'personal@example.com',
      roll: 'personal',
      namn: 'Personal Test'
    });

    const response = await POST({
      request: createPostRequest(),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: 'Endast administratör kan spara listan över bokningstyper som aldrig ska följas upp.'
    });
    expect(mocks.state.upsertPayloads).toHaveLength(0);
  });

  it('normalizes and saves the shared exclusion list for admins', async () => {
    mocks.state.postResults.push({
      data: {
        exkludera_bokningstyper: ['ssk', 'telefon'],
        updated_at: '2026-03-18T10:30:00.000Z',
        updated_by: 'user-1'
      },
      error: null
    });

    const response = await POST({
      request: createPostRequest({
        excludedBookingTypePatterns: [' ssk ', 'telefon', 'ssk', '']
      }),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.state.upsertPayloads).toEqual([
      {
        id: 'standard',
        exkludera_bokningstyper: ['ssk', 'telefon'],
        updated_by: 'user-1'
      }
    ]);
    expect(body).toEqual({
      success: true,
      data: {
        excludedBookingTypePatterns: ['ssk', 'telefon'],
        patternText: 'ssk\ntelefon',
        updatedAt: '2026-03-18T10:30:00.000Z',
        updatedBy: 'user-1',
        usingFallbackDefaults: false
      }
    });
  });

  it('returns a clear migration error when saving without the settings table', async () => {
    mocks.state.postResults.push({
      data: null,
      error: {
        code: '42P01',
        message: 'relation "enkat_installningar" does not exist'
      }
    });

    const response = await POST({
      request: createPostRequest(),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      success: false,
      error: 'Tabellen enkat_installningar saknas. Kör migreringen 025-enkat-installningar.sql först.'
    });
  });
});
