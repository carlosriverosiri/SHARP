import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  type QueryResult = { data: any; error: any };

  const state = {
    existingCampaignResults: [] as QueryResult[],
    campaignInsertResults: [] as QueryResult[],
    utskickInsertResults: [] as QueryResult[],
    deliveryLogResults: [] as QueryResult[],
    deletedCampaignIds: [] as string[],
    insertedCampaignRows: [] as any[],
    insertedUtskickRows: [] as any[],
    insertedDeliveryLogs: [] as any[]
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
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => nextResult(state.existingCampaignResults, { data: null, error: null }))
          }))
        })),
        insert: vi.fn((payload: unknown) => {
          state.insertedCampaignRows.push(payload);
          return {
            select: vi.fn(() => ({
              single: vi.fn(async () => nextResult(state.campaignInsertResults, { data: null, error: null }))
            }))
          };
        }),
        delete: vi.fn(() => ({
          eq: vi.fn(async (_column: string, id: string) => {
            state.deletedCampaignIds.push(id);
            return { data: null, error: null };
          })
        }))
      };
    }

    if (table === 'enkat_utskick') {
      return {
        insert: vi.fn((payload: unknown) => {
          state.insertedUtskickRows.push(payload);
          return {
            select: vi.fn(async () => nextResult(state.utskickInsertResults, { data: null, error: null }))
          };
        })
      };
    }

    if (table === 'enkat_delivery_log') {
      return {
        insert: vi.fn(async (payload: unknown) => {
          state.insertedDeliveryLogs.push(payload);
          return nextResult(state.deliveryLogResults, { data: null, error: null });
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
    krypteraMock: vi.fn((value: string) => `enc:${value}`),
    dekrypteraMock: vi.fn((value: string) => value),
    buildEnkatSmsMessageMock: vi.fn(),
    sendEnkatSmsMock: vi.fn(),
    processQueuedEnkatMessagesMock: vi.fn(),
    hashEnkatPreviewTokenMock: vi.fn(),
    verifyEnkatPreviewTokenMock: vi.fn()
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
  kryptera: mocks.krypteraMock,
  dekryptera: mocks.dekrypteraMock
}));

vi.mock('../../../../lib/enkat-sms', () => ({
  buildEnkatSmsMessage: mocks.buildEnkatSmsMessageMock,
  sendEnkatSms: mocks.sendEnkatSmsMock
}));

vi.mock('../../../../lib/enkat-queue', () => ({
  processQueuedEnkatMessages: mocks.processQueuedEnkatMessagesMock
}));

vi.mock('../../../../lib/enkat-preview-token', () => ({
  hashEnkatPreviewToken: mocks.hashEnkatPreviewTokenMock,
  verifyEnkatPreviewToken: mocks.verifyEnkatPreviewTokenMock
}));

import { POST } from '../send';

function createPreviewPayload() {
  return {
    version: 1 as const,
    userId: 'user-1',
    fileName: 'besok.csv',
    totalRows: 1,
    validRows: 1,
    invalidRows: 0,
    duplicateRows: 0,
    autoExcludedRows: 0,
    issuedAt: '2026-03-18T10:00:00.000Z',
    expiresAt: '2026-03-18T10:30:00.000Z',
    selectedRows: [
      {
        rowIndex: 2,
        patientId: 'patient-1',
        phone: '+46701234567',
        providerName: 'Dr Test',
        visitDate: '2026-03-18',
        visitStartTime: '08:00',
        bookingTypeRaw: 'Nybesök',
        bookingTypeNormalized: 'nybesok'
      }
    ]
  };
}

function createRequest(overrides: Record<string, unknown> = {}): Request {
  return new Request('http://localhost/api/enkat/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      campaignName: 'Vecka 12',
      smsTemplate: 'Hej!',
      sendNow: true,
      scheduledSendAt: null,
      sendReminder: true,
      reminderAfterHours: 48,
      previewToken: 'preview-token-1',
      ...overrides
    })
  });
}

function createInvalidJsonRequest(): Request {
  return new Request('http://localhost/api/enkat/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: '{invalid-json'
  });
}

describe('POST /api/enkat/send', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.state.existingCampaignResults.length = 0;
    mocks.state.campaignInsertResults.length = 0;
    mocks.state.utskickInsertResults.length = 0;
    mocks.state.deliveryLogResults.length = 0;
    mocks.state.deletedCampaignIds.length = 0;
    mocks.state.insertedCampaignRows.length = 0;
    mocks.state.insertedUtskickRows.length = 0;
    mocks.state.insertedDeliveryLogs.length = 0;

    mocks.arInloggadMock.mockResolvedValue(true);
    mocks.hamtaAnvandareMock.mockResolvedValue({
      id: 'user-1',
      email: 'carlos@example.com',
      roll: 'superadmin',
      namn: 'Carlos Test'
    });
    mocks.hashEnkatPreviewTokenMock.mockReturnValue('preview-hash-1');
    mocks.verifyEnkatPreviewTokenMock.mockReturnValue(createPreviewPayload());
    mocks.processQueuedEnkatMessagesMock.mockResolvedValue({
      sent: 1,
      failed: 0
    });

    mocks.state.campaignInsertResults.push({
      data: { id: 'kampanj-1', status: 'skickar' },
      error: null
    });
    mocks.state.utskickInsertResults.push({
      data: [
        {
          id: 'utskick-1',
          unik_kod: 'code-1',
          vardgivare_namn: 'Dr Test',
          besoksdatum: '2026-03-18',
          bokningstyp_raw: 'Nybesök',
          bokningstyp_normaliserad: 'nybesok',
          telefon_temp_krypterad: 'enc:+46701234567'
        }
      ],
      error: null
    });
    mocks.state.deliveryLogResults.push({
      data: null,
      error: null
    });
  });

  it('returns an already created campaign when the preview hash already exists', async () => {
    mocks.state.existingCampaignResults.push({
      data: {
        id: 'kampanj-42',
        status: 'redo',
        total_giltiga: 3,
        total_skickade: 1
      },
      error: null
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
        campaignId: 'kampanj-42',
        status: 'redo',
        totalValid: 3,
        totalQueued: 3,
        totalSent: 1,
        totalFailed: 0,
        alreadyCreated: true
      }
    });
    expect(mocks.state.insertedCampaignRows).toHaveLength(0);
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
    expect(mocks.verifyEnkatPreviewTokenMock).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON requests', async () => {
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
    expect(mocks.verifyEnkatPreviewTokenMock).not.toHaveBeenCalled();
  });

  it('returns 400 when preview token verification fails', async () => {
    mocks.verifyEnkatPreviewTokenMock.mockImplementationOnce(() => {
      throw new Error('Preview-token har gatt ut.');
    });

    const response = await POST({
      request: createRequest(),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: 'Preview-token har gatt ut.'
    });
    expect(mocks.state.insertedCampaignRows).toHaveLength(0);
  });

  it('creates a scheduled campaign without processing the queue when sendNow is false', async () => {
    mocks.state.existingCampaignResults.push({
      data: null,
      error: null
    });
    mocks.state.campaignInsertResults[0] = {
      data: { id: 'kampanj-1', status: 'redo' },
      error: null
    };

    const response = await POST({
      request: createRequest({ sendNow: false }),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.status).toBe('redo');
    expect(body.data.totalSent).toBe(0);
    expect(body.data.totalFailed).toBe(0);
    expect(mocks.processQueuedEnkatMessagesMock).not.toHaveBeenCalled();
    expect(mocks.state.insertedUtskickRows[0][0]).toEqual(
      expect.objectContaining({
        telefon_temp_krypterad: 'enc:+46701234567',
        bokningstyp_normaliserad: 'nybesok'
      })
    );
    expect(mocks.state.insertedUtskickRows[0][0].patient_id_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns status fel when immediate sending only fails', async () => {
    mocks.state.existingCampaignResults.push({
      data: null,
      error: null
    });
    mocks.processQueuedEnkatMessagesMock.mockResolvedValueOnce({
      sent: 0,
      failed: 2
    });

    const response = await POST({
      request: createRequest(),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.status).toBe('fel');
    expect(body.data.totalSent).toBe(0);
    expect(body.data.totalFailed).toBe(2);
    expect(mocks.processQueuedEnkatMessagesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: 'kampanj-1',
        limit: 50
      })
    );
  });

  it('falls back to the existing campaign after a unique preview hash conflict on insert', async () => {
    mocks.state.existingCampaignResults.push(
      {
        data: null,
        error: null
      },
      {
        data: {
          id: 'kampanj-99',
          status: 'skickar',
          total_giltiga: 1,
          total_skickade: 0
        },
        error: null
      }
    );
    mocks.state.campaignInsertResults[0] = {
      data: null,
      error: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "preview_token_hash"'
      }
    };

    const response = await POST({
      request: createRequest(),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.alreadyCreated).toBe(true);
    expect(body.data.campaignId).toBe('kampanj-99');
    expect(mocks.state.deletedCampaignIds).toHaveLength(0);
  });

  it('cleans up the created campaign if utskick rows cannot be inserted', async () => {
    mocks.state.existingCampaignResults.push({
      data: null,
      error: null
    });
    mocks.state.utskickInsertResults[0] = {
      data: null,
      error: {
        message: 'insert failed'
      }
    };

    const response = await POST({
      request: createRequest(),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Kunde inte skapa enkätkampanjen.');
    expect(body.details).toEqual({
      message: 'insert failed'
    });
    expect(mocks.state.deletedCampaignIds).toEqual(['kampanj-1']);
  });

  it('cleans up the created campaign if delivery log creation fails', async () => {
    mocks.state.existingCampaignResults.push({
      data: null,
      error: null
    });
    mocks.state.deliveryLogResults[0] = {
      data: null,
      error: {
        message: 'log failed'
      }
    };

    const response = await POST({
      request: createRequest(),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Kunde inte skapa enkätkampanjen.');
    expect(body.details).toEqual({
      message: 'log failed'
    });
    expect(mocks.state.deletedCampaignIds).toEqual(['kampanj-1']);
  });
});
