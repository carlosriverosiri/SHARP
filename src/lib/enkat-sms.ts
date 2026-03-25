import { formatProviderName, patientFriendlyBookingType } from './enkat-booking-classifier';

const ELKS_API_URL = 'https://api.46elks.com/a1/sms';
type EnkatRuntimeEnvKey = 'ELKS_API_USER' | 'ELKS_API_PASSWORD' | 'SITE' | 'PUBLIC_SITE_URL';

let hasWarnedAboutMissingSiteUrl = false;

function readEnkatRuntimeEnv(key: EnkatRuntimeEnvKey): string {
  const processValue = typeof process !== 'undefined' ? process.env?.[key] : undefined;
  if (typeof processValue === 'string' && processValue.length > 0) {
    return processValue;
  }

  const metaEnv = (import.meta as ImportMeta & {
    env?: Partial<Record<EnkatRuntimeEnvKey, string>>;
  }).env;
  const metaValue = metaEnv?.[key];
  return typeof metaValue === 'string' ? metaValue : '';
}

function getEnkatSmsConfig() {
  const siteUrl = readEnkatRuntimeEnv('SITE') || readEnkatRuntimeEnv('PUBLIC_SITE_URL');
  if (!siteUrl && !hasWarnedAboutMissingSiteUrl) {
    console.warn('⚠️ SITE / PUBLIC_SITE_URL saknas -- enkät-SMS-länkar kommer bli ogiltiga');
    hasWarnedAboutMissingSiteUrl = true;
  }

  return {
    elksApiUser: readEnkatRuntimeEnv('ELKS_API_USER'),
    elksApiPassword: readEnkatRuntimeEnv('ELKS_API_PASSWORD'),
    siteUrl
  };
}

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

/** Kompakt datum utan år (t.ex. 23/3) — sparar tecken i SMS. */
export function formatEnkatVisitDateShort(date: string) {
  try {
    return new Intl.DateTimeFormat('sv-SE', {
      day: 'numeric',
      month: 'numeric'
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
  const { siteUrl } = getEnkatSmsConfig();
  const defaultInitialTemplate =
    'Hur var besöket hos [VÅRDGIVARE] [DATUM_KORT]?\n' +
    'Svara: [LÄNK]\n' +
    'Anonymt.';

  const defaultReminderTemplate =
    'Påminnelse — enkät om besöket [DATUM_KORT] hos [VÅRDGIVARE].\n' +
    'Svara: [LÄNK]';

  const baseTemplate = options?.reminder ? defaultReminderTemplate : defaultInitialTemplate;

  return (template || baseTemplate)
    .replaceAll('[VÅRDGIVARE]', formatProviderName(row.providerName))
    .replaceAll('[DATUM_KORT]', formatEnkatVisitDateShort(row.visitDate))
    .replaceAll('[DATUM]', formatEnkatVisitDate(row.visitDate))
    .replaceAll('[BOKNINGSTYP]', patientFriendlyBookingType(row.bookingTypeRaw))
    .replaceAll('[LÄNK]', `${siteUrl}/e/${code}`);
}

export async function sendEnkatSms(phone: string, message: string): Promise<{ ok: boolean; providerResponse?: unknown; error?: string }> {
  const { elksApiUser, elksApiPassword } = getEnkatSmsConfig();
  if (!elksApiUser || !elksApiPassword) {
    return { ok: false, error: '46elks är inte konfigurerat' };
  }

  try {
    const response = await fetch(ELKS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${elksApiUser}:${elksApiPassword}`).toString('base64'),
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
