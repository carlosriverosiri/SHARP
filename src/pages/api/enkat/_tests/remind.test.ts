import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state = {
    campaignSingleResults: [] as Array<{ data: unknown; error: unknown }>,
    campaignFilters: [] as Array<Array<[string, unknown]>>
  };

  const nextSingle = () => {
    if (state.campaignSingleResults.length > 0) {
      return state.campaignSingleResults.shift() as { data: unknown; error: unknown };
    }
    return { data: null, error: null };
  };

  const fromMock = vi.fn((table: string) => {
    if (table === 'enkat_kampanjer') {
      return {
        select: vi.fn(() => {
          const filters: Array<[string, unknown]> = [];
          state.campaignFilters.push(filters);
          const builder = {
            eq: vi.fn((column: string, value: unknown) => {
              filters.push([column, value]);
              return builder;
            }),
            single: vi.fn(async () => nextSingle())
          };
          return builder;
        })
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    state,
    fromMock,
    arInloggadMock: vi.fn(),
    hamtaAnvandareMock: vi.fn(),
    dispatchEnkatRemindersMock: vi.fn()
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

vi.mock('../../../../lib/kryptering', () => ({
  dekryptera: vi.fn((value: string) => `dec:${value}`)
}));

vi.mock('../../../../lib/enkat-remind-runner', () => ({
  dispatchEnkatReminders: mocks.dispatchEnkatRemindersMock
}));

import { POST } from '../remind';

function createRequest(overrides: Record<string, unknown> = {}): Request {
  return new Request('http://localhost/api/enkat/remind', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      campaignId: 'kampanj-1',
      ...overrides
    })
  });
}

function createInvalidJsonRequest(): Request {
  return new Request('http://localhost/api/enkat/remind', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: '{invalid-json'
  });
}

describe('POST /api/enkat/remind', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.state.campaignSingleResults.length = 0;
    mocks.state.campaignFilters.length = 0;

    mocks.arInloggadMock.mockResolvedValue(true);
    mocks.hamtaAnvandareMock.mockResolvedValue({
      id: 'user-1',
      email: 'carlos@example.com',
      roll: 'admin',
      namn: 'Carlos Test'
    });
    mocks.dispatchEnkatRemindersMock.mockResolvedValue({
      eligible: 0,
      sent: 0,
      failed: 0
    });
  });

  it('returns 401 when the user is not logged in', async () => {
    mocks.arInloggadMock.mockResolvedValueOnce(false);

    const response = await POST({
      request: createRequest(),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: 'Ej inloggad'
    });
    expect(mocks.dispatchEnkatRemindersMock).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON', async () => {
    const response = await POST({
      request: createInvalidJsonRequest(),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: 'Ogiltig JSON i request.'
    });
    expect(mocks.dispatchEnkatRemindersMock).not.toHaveBeenCalled();
  });

  it('applies skapad_av filter for non-admin users', async () => {
    mocks.hamtaAnvandareMock.mockResolvedValueOnce({
      id: 'user-1',
      email: 'carlos@example.com',
      roll: 'personal',
      namn: 'Carlos Test'
    });
    mocks.state.campaignSingleResults.push({
      data: {
        id: 'kampanj-1',
        skapad_av: 'user-1',
        skicka_paminnelse: true
      },
      error: null
    });

    const response = await POST({
      request: createRequest(),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      campaignId: 'kampanj-1',
      eligible: 0,
      sent: 0,
      failed: 0
    });
    expect(mocks.state.campaignFilters[0]).toEqual([
      ['id', 'kampanj-1'],
      ['skapad_av', 'user-1']
    ]);
    expect(mocks.dispatchEnkatRemindersMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Function),
      { campaignId: 'kampanj-1' }
    );
  });

  it('returns 400 when reminders are disabled for the campaign', async () => {
    mocks.state.campaignSingleResults.push({
      data: {
        id: 'kampanj-1',
        skapad_av: 'user-1',
        skicka_paminnelse: false
      },
      error: null
    });

    const response = await POST({
      request: createRequest(),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: 'Påminnelser är inte aktiverade för kampanjen.'
    });
    expect(mocks.dispatchEnkatRemindersMock).not.toHaveBeenCalled();
  });

  it('returns dispatch summary for admin', async () => {
    mocks.state.campaignSingleResults.push({
      data: {
        id: 'kampanj-1',
        skapad_av: 'user-1',
        skicka_paminnelse: true
      },
      error: null
    });
    mocks.dispatchEnkatRemindersMock.mockResolvedValueOnce({
      eligible: 3,
      sent: 1,
      failed: 2
    });

    const response = await POST({
      request: createRequest(),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        campaignId: 'kampanj-1',
        eligible: 3,
        sent: 1,
        failed: 2
      }
    });
  });
});
