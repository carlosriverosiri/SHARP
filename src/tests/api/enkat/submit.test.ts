import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn()
}));

vi.mock('../../../lib/supabase', () => ({
  supabaseAdmin: {
    rpc: rpcMock
  }
}));

import { POST } from '../../../pages/api/enkat/submit';

function createSubmitRequest(overrides: Record<string, unknown> = {}): Request {
  return new Request('http://localhost/api/enkat/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code: 'ABC123456789',
      overallScore: 5,
      bemotande: 5,
      information: 4,
      lyssnadPa: 5,
      planFramat: 4,
      commentGood: '',
      commentImprove: '',
      ...overrides
    })
  });
}

describe('POST /api/enkat/submit', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({
      data: {
        status: 'ok',
        kampanj_id: 'kampanj-1',
        utskick_id: 'utskick-1',
        svarad_vid: '2026-03-18T10:00:00.000Z'
      },
      error: null
    });
  });

  it('masks sensitive comment data before saving the response', async () => {
    const request = createSubmitRequest({
      commentGood: 'Mejla mig på test@example.com eller ring 0701234567. Personnummer 19900101-0017.',
      commentImprove: 'Kontakta "anna@example.com" i stället.'
    });

    const response = await POST({ request } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        message: 'Ditt svar är registrerat anonymt.'
      }
    });
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('submit_enkat_response', {
      p_code: 'ABC123456789',
      p_helhetsbetyg: 5,
      p_bemotande: 5,
      p_information: 4,
      p_lyssnad_pa: 5,
      p_plan_framat: 4,
      p_kommentar_bra:
        'Mejla mig på [e-post borttagen] eller ring [telefon borttagen]. Personnummer [personnummer borttaget].',
      p_kommentar_forbattra: 'Kontakta "[e-post borttagen]" i stället.'
    });
  });

  it('masks formatted Swedish phone numbers before saving the response', async () => {
    const request = createSubmitRequest({
      commentGood: 'Ring mig på +46 70 123 45 67 eller 070-123 45 67.'
    });

    await POST({ request } as Parameters<typeof POST>[0]);

    expect(rpcMock).toHaveBeenCalledWith(
      'submit_enkat_response',
      expect.objectContaining({
        p_kommentar_bra: 'Ring mig på [telefon borttagen] eller [telefon borttagen].'
      })
    );
  });

  it('returns 400 without calling RPC for a too short survey code', async () => {
    const request = createSubmitRequest({
      code: 'kortkod'
    });

    const response = await POST({ request } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: 'Ogiltig enkätkod.'
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid_code', 404, 'Länken är ogiltig eller saknas.'],
    ['already_used', 409, 'Den här länken har redan använts.'],
    ['expired', 410, 'Länken har gått ut.']
  ] as const)('maps %s to status %i', async (submitStatus, expectedStatus, expectedError) => {
    rpcMock.mockResolvedValueOnce({
      data: {
        status: submitStatus,
        kampanj_id: null,
        utskick_id: null,
        svarad_vid: null
      },
      error: null
    });

    const response = await POST({ request: createSubmitRequest() } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(expectedStatus);
    expect(body).toEqual({
      success: false,
      error: expectedError
    });
  });
});
