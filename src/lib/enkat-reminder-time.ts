import { DateTime } from 'luxon';

/** Påminnelser planeras i svensk lokaltid. */
export const ENKAT_REMINDER_TIMEZONE = 'Europe/Stockholm';
/** Nästa kalenderdag efter första SMS, kl denna timme. */
export const ENKAT_REMINDER_HOUR_LOCAL = 16;
export const ENKAT_REMINDER_MINUTE_LOCAL = 0;

/**
 * Tidpunkt (UTC) då påminnelse tidigast får skickas:
 * nästa kalenderdag i Stockholm efter första SMS, kl 16:00 lokal tid.
 */
export function reminderEligibleAtUtcIso(firstSmsIso: string): string {
  const instant = DateTime.fromISO(firstSmsIso, { setZone: true });
  if (!instant.isValid) {
    throw new Error('Ogiltigt datum för första SMS.');
  }
  const local = instant.setZone(ENKAT_REMINDER_TIMEZONE);
  const at16NextDay = local
    .startOf('day')
    .plus({ days: 1 })
    .set({
      hour: ENKAT_REMINDER_HOUR_LOCAL,
      minute: ENKAT_REMINDER_MINUTE_LOCAL,
      second: 0,
      millisecond: 0
    });
  const utc = at16NextDay.toUTC();
  const iso = utc.toISO();
  if (!iso) {
    throw new Error('Kunde inte beräkna påminnelsetid.');
  }
  return iso;
}

export function isReminderSendDue(
  firstSmsIso: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!firstSmsIso) return false;
  try {
    const due = DateTime.fromISO(reminderEligibleAtUtcIso(firstSmsIso), { zone: 'utc' });
    const nowUtc = DateTime.fromJSDate(now, { zone: 'utc' });
    return nowUtc >= due;
  } catch {
    return false;
  }
}
