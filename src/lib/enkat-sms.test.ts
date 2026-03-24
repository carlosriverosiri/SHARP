import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildEnkatSmsMessage, sendEnkatSms } from './enkat-sms';

const ORIGINAL_ENV = { ...process.env };

describe('enkat-sms runtime environment', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ELKS_API_USER;
    delete process.env.ELKS_API_PASSWORD;
    delete process.env.SITE;
    delete process.env.PUBLIC_SITE_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...ORIGINAL_ENV };
  });

  it('uses process env for site URL and 46elks credentials in Node runtimes', async () => {
    process.env.ELKS_API_USER = 'netlify-user';
    process.env.ELKS_API_PASSWORD = 'netlify-pass';
    process.env.PUBLIC_SITE_URL = 'https://specialist.se';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'sms-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const message = buildEnkatSmsMessage(
      null,
      {
        providerName: 'Carlos Test',
        visitDate: '2026-03-24',
        bookingTypeRaw: '3. REMISS AXEL',
        bookingTypeNormalized: 'nybesok_remiss'
      },
      'kod-123'
    );

    expect(message).toContain('https://specialist.se/e/kod-123');

    const result = await sendEnkatSms('+46701234567', message);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.46elks.com/a1/sms',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from('netlify-user:netlify-pass').toString('base64')}`
        })
      })
    );
  });

  it('returns configuration error without 46elks credentials', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendEnkatSms('+46701234567', 'Hej');

    expect(result).toEqual({
      ok: false,
      error: '46elks är inte konfigurerat'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
