import { describe, expect, it } from 'vitest';
import { isReminderSendDue, reminderEligibleAtUtcIso } from './enkat-reminder-time';

describe('enkat-reminder-time', () => {
  it('plans reminder at next calendar day 16:00 Europe/Stockholm (CET i mars)', () => {
    const iso = reminderEligibleAtUtcIso('2026-03-18T14:00:00.000Z');
    expect(iso).toBe('2026-03-19T15:00:00.000Z');
  });

  it('isReminderSendDue är false före planerad tidpunkt', () => {
    const first = '2026-03-18T14:00:00.000Z';
    expect(isReminderSendDue(first, new Date('2026-03-19T14:59:59.000Z'))).toBe(false);
  });

  it('isReminderSendDue är true vid och efter planerad tidpunkt', () => {
    const first = '2026-03-18T14:00:00.000Z';
    expect(isReminderSendDue(first, new Date('2026-03-19T15:00:00.000Z'))).toBe(true);
    expect(isReminderSendDue(first, new Date('2026-03-20T08:00:00.000Z'))).toBe(true);
  });

  it('returnerar false utan första SMS-tid', () => {
    expect(isReminderSendDue(null)).toBe(false);
    expect(isReminderSendDue(undefined)).toBe(false);
  });
});
