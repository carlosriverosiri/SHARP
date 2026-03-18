import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  type QueryResult = { data: any; error: any };

  const state = {
    campaignSingleResults: [] as QueryResult[],
    utskickSelectResults: [] as QueryResult[],
    updateResults: [] as QueryResult[],
    campaignFilters: [] as Array<Array<[string, unknown]>>,
    utskickFilters: [] as Array<Array<[string, unknown]>>,
    updatedUtskickIds: [] as string[],
    updatePayloads: [] as any[],
    deliveryLogs: [] as any[]
  };

  const nextResult = (queue: QueryResult[], fallback: QueryResult): QueryResult => {
    if (queue.length > 0) {
      return queue.shift() as QueryResult;
    }

    return fallback;
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
            single: vi.fn(async () => nextResult(state.campaignSingleResults, { data: null, error: null }))
          };

          return builder;
        })
      };
    }

    if (table === 'enkat_utskick') {
      return {
        select: vi.fn(() => {
          const filters: Array<[string, unknown]> = [];
          state.utskickFilters.push(filters);
          const result = nextResult(state.utskickSelectResults, { data: [], error: null });
          const builder = {
            data: result.data,
            error: result.error,
            eq: vi.fn((column: string, value: unknown) => {
              filters.push([column, value]);
              return builder;
            }),
            is: vi.fn((column: string, value: unknown) => {
              filters.push([`is:${column}`, value]);
              return builder;
            })
          };

          return builder;
        }),
        update: vi.fn((payload: unknown) => {
          state.updatePayloads.push(payload);
          const result = nextResult(state.updateResults, { data: null, error: null });
          return {
            eq: vi.fn(async (_column: string, id: string) => {
              state.updatedUtskickIds.push(id);
              return result;
            })
          };
        })
      };
    }

    if (table === 'enkat_delivery_log') {
      return {
        insert: vi.fn(async (payload: unknown) => {
          state.deliveryLogs.push(payload);
          return { data: null, error: null };
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
    dekrypteraMock: vi.fn(),
    buildEnkatSmsMessageMock: vi.fn(),
    sendEnkatSmsMock: vi.fn()
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

vi.mock('../../../lib/kryptering', () => ({
  dekryptera: mocks.dekrypteraMock
}));

vi.mock('../../../lib/enkat-sms', () => ({
  buildEnkatSmsMessage: mocks.buildEnkatSmsMessageMock,
  sendEnkatSms: mocks.sendEnkatSmsMock
}));

import { POST } from './remind';

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
    mocks.state.utskickSelectResults.length = 0;
    mocks.state.updateResults.length = 0;
    mocks.state.campaignFilters.length = 0;
    mocks.state.utskickFilters.length = 0;
    mocks.state.updatedUtskickIds.length = 0;
    mocks.state.updatePayloads.length = 0;
    mocks.state.deliveryLogs.length = 0;

    mocks.arInloggadMock.mockResolvedValue(true);
    mocks.hamtaAnvandareMock.mockResolvedValue({
      id: 'user-1',
      email: 'carlos@example.com',
      roll: 'admin',
      namn: 'Carlos Test'
    });
    mocks.dekrypteraMock.mockImplementation((value: string) => `0${value}`);
    mocks.buildEnkatSmsMessageMock.mockImplementation((_template, _row, code, options) => `sms:${code}:${options?.reminder === true}`);
    mocks.sendEnkatSmsMock.mockResolvedValue({
      ok: true,
      providerResponse: 'provider-ok'
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
        namn: 'Vecka 12',
        status: 'skickar',
        sms_mall: 'Hej!',
        skicka_paminnelse: true,
        paminnelse_efter_timmar: 48
      },
      error: null
    });
    mocks.state.utskickSelectResults.push({
      data: [],
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
  });

  it('returns 400 when reminders are disabled for the campaign', async () => {
    mocks.state.campaignSingleResults.push({
      data: {
        id: 'kampanj-1',
        skapad_av: 'user-1',
        namn: 'Vecka 12',
        status: 'skickar',
        sms_mall: 'Hej!',
        skicka_paminnelse: false,
        paminnelse_efter_timmar: 48
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
  });

  it('summarizes sent and failed reminders while skipping expired rows', async () => {
    mocks.state.campaignSingleResults.push({
      data: {
        id: 'kampanj-1',
        skapad_av: 'user-1',
        namn: 'Vecka 12',
        status: 'skickar',
        sms_mall: 'Hej!',
        skicka_paminnelse: true,
        paminnelse_efter_timmar: 48
      },
      error: null
    });
    mocks.state.utskickSelectResults.push({
      data: [
        {
          id: 'utskick-expired',
          unik_kod: 'expired-code',
          vardgivare_namn: 'Dr Test',
          besoksdatum: '2026-03-18',
          bokningstyp_raw: 'Nybesök',
          bokningstyp_normaliserad: 'nybesok',
          telefon_temp_krypterad: 'enc-expired',
          used: false,
          paminnelse_skickad_vid: null,
          expires_at: '2020-01-01T00:00:00.000Z'
        },
        {
          id: 'utskick-missing-phone',
          unik_kod: 'missing-phone',
          vardgivare_namn: 'Dr Test',
          besoksdatum: '2026-03-18',
          bokningstyp_raw: 'Nybesök',
          bokningstyp_normaliserad: 'nybesok',
          telefon_temp_krypterad: 'bad-phone',
          used: false,
          paminnelse_skickad_vid: null,
          expires_at: '2099-01-01T00:00:00.000Z'
        },
        {
          id: 'utskick-success',
          unik_kod: 'success-code',
          vardgivare_namn: 'Dr Test',
          besoksdatum: '2026-03-18',
          bokningstyp_raw: 'Nybesök',
          bokningstyp_normaliserad: 'nybesok',
          telefon_temp_krypterad: '12345',
          used: false,
          paminnelse_skickad_vid: null,
          expires_at: '2099-01-01T00:00:00.000Z'
        },
        {
          id: 'utskick-failed',
          unik_kod: 'failed-code',
          vardgivare_namn: 'Dr Test',
          besoksdatum: '2026-03-18',
          bokningstyp_raw: 'Nybesök',
          bokningstyp_normaliserad: 'nybesok',
          telefon_temp_krypterad: '67890',
          used: false,
          paminnelse_skickad_vid: null,
          expires_at: '2099-01-01T00:00:00.000Z'
        }
      ],
      error: null
    });
    mocks.dekrypteraMock.mockImplementation((value: string) => {
      if (value === 'bad-phone') {
        throw new Error('decode failed');
      }

      return `0${value}`;
    });
    mocks.sendEnkatSmsMock
      .mockResolvedValueOnce({
        ok: true,
        providerResponse: 'sent-ok'
      })
      .mockResolvedValueOnce({
        ok: false,
        error: 'provider failed',
        providerResponse: 'sent-failed'
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
    expect(mocks.buildEnkatSmsMessageMock).toHaveBeenCalledTimes(2);
    expect(mocks.buildEnkatSmsMessageMock).toHaveBeenNthCalledWith(
      1,
      'Hej!',
      {
        providerName: 'Dr Test',
        visitDate: '2026-03-18',
        bookingTypeRaw: 'Nybesök',
        bookingTypeNormalized: 'nybesok'
      },
      'success-code',
      { reminder: true }
    );
    expect(mocks.state.updatedUtskickIds).toEqual(['utskick-success']);
    expect(mocks.state.deliveryLogs).toEqual([
      {
        kampanj_id: 'kampanj-1',
        utskick_id: 'utskick-missing-phone',
        typ: 'paminnelse',
        status: 'failed',
        provider: '46elks',
        felkod: 'missing_phone',
        felmeddelande: 'Kunde inte dekryptera eller hitta telefonnummer för påminnelse'
      },
      {
        kampanj_id: 'kampanj-1',
        utskick_id: 'utskick-success',
        typ: 'paminnelse',
        status: 'sent',
        provider: '46elks',
        provider_response: 'sent-ok'
      },
      {
        kampanj_id: 'kampanj-1',
        utskick_id: 'utskick-failed',
        typ: 'paminnelse',
        status: 'failed',
        provider: '46elks',
        provider_response: 'sent-failed',
        felkod: 'send_failed',
        felmeddelande: 'provider failed'
      }
    ]);
  });
});
