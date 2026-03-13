const ELKS_API_URL = 'https://api.46elks.com/a1/sms';
const ELKS_API_USER = import.meta.env.ELKS_API_USER || '';
const ELKS_API_PASSWORD = import.meta.env.ELKS_API_PASSWORD || '';
const SITE_URL = import.meta.env.SITE || import.meta.env.PUBLIC_SITE_URL || 'https://specialist.se';

export type EnkatSmsRow = {
  providerName: string;
  visitDate: string;
  bookingTypeRaw: string | null;
  bookingTypeNormalized: string | null;
};

export function formatEnkatVisitDate(date: string) {
  try {
    return new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(`${date}T12:00:00`));
  } catch {
    return date;
  }
}

export function buildEnkatSmsMessage(
  template: string | null | undefined,
  row: EnkatSmsRow,
  code: string,
  options?: { reminder?: boolean }
) {
  const defaultInitialTemplate =
    'Hej! Hur nöjd var du med ditt besök hos [VÅRDGIVARE] den [DATUM] ([BOKNINGSTYP])?\n' +
    'Svara här: [LÄNK]\n' +
    'Enkäten är anonym. Tack!';

  const defaultReminderTemplate =
    'Hej! Om du vill hjälpa oss förbättra mottagningen får du gärna svara på vår korta anonyma enkät om ditt besök hos [VÅRDGIVARE] den [DATUM] ([BOKNINGSTYP]).\n' +
    'Svara här: [LÄNK]\n' +
    'Tack!';

  const baseTemplate = options?.reminder ? defaultReminderTemplate : defaultInitialTemplate;

  return (template || baseTemplate)
    .replaceAll('[VÅRDGIVARE]', row.providerName)
    .replaceAll('[DATUM]', formatEnkatVisitDate(row.visitDate))
    .replaceAll('[BOKNINGSTYP]', row.bookingTypeRaw || row.bookingTypeNormalized || 'besöket')
    .replaceAll('[LÄNK]', `${SITE_URL}/e/${code}`);
}

export async function sendEnkatSms(phone: string, message: string): Promise<{ ok: boolean; providerResponse?: unknown; error?: string }> {
  if (!ELKS_API_USER || !ELKS_API_PASSWORD) {
    return { ok: false, error: '46elks är inte konfigurerat' };
  }

  try {
    const response = await fetch(ELKS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${ELKS_API_USER}:${ELKS_API_PASSWORD}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        from: 'Specialist',
        to: phone,
        message
      })
    });

    const text = await response.text();
    let providerResponse: unknown = text;
    try {
      providerResponse = JSON.parse(text);
    } catch {
      // keep raw text
    }

    if (!response.ok) {
      return { ok: false, providerResponse, error: typeof providerResponse === 'string' ? providerResponse : 'SMS-fel' };
    }

    return { ok: true, providerResponse };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Okänt SMS-fel' };
  }
}
