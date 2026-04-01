import { describe, expect, it } from 'vitest';
import {
  average,
  bucketForDelay,
  calculateDelayHours,
  summarizeDelayRows,
  summarizeSmsRoundHelhetsbetyg,
  summarizeSmsRoundStats
} from './enkat-stats';

describe('enkat-stats', () => {
  it('calculates averages rounded to one decimal', () => {
    expect(average([1, 2, 2])).toBe(1.7);
    expect(average([])).toBe(0);
  });

  it('calculates delay hours only when visit time and sent time exist', () => {
    expect(calculateDelayHours('2026-03-15', null, '2026-03-15T10:00:00')).toBeNull();
    expect(calculateDelayHours('2026-03-15', '08:00', '2026-03-15T10:30:00')).toBe(2.5);
  });

  it('accepts Postgres-style TIME strings with seconds', () => {
    expect(calculateDelayHours('2026-03-15', '08:00:00', '2026-03-15T10:30:00')).toBe(2.5);
    expect(calculateDelayHours('2026-03-15', '07:30:00', '2026-03-15T17:00:00')).toBe(9.5);
  });

  it('buckets delay hours on the intended boundaries', () => {
    expect(bucketForDelay(6)).toBe('0-6h');
    expect(bucketForDelay(6.01)).toBe('6-24h');
    expect(bucketForDelay(24)).toBe('6-24h');
    expect(bucketForDelay(24.01)).toBe('24-48h');
    expect(bucketForDelay(49)).toBe('48h+');
  });

  it('summarizes measured rows and response rates per bucket', () => {
    const summary = summarizeDelayRows([
      {
        vardgivare_namn: 'Dr A',
        besoksdatum: '2026-03-15',
        besoksstart_tid: '08:00',
        forsta_sms_skickad_vid: '2026-03-15T09:00:00',
        svarad_vid: '2026-03-15T12:00:00'
      },
      {
        vardgivare_namn: 'Dr A',
        besoksdatum: '2026-03-15',
        besoksstart_tid: '08:00',
        forsta_sms_skickad_vid: '2026-03-15T11:00:00',
        svarad_vid: null
      },
      {
        vardgivare_namn: 'Dr A',
        besoksdatum: '2026-03-15',
        besoksstart_tid: '13:00',
        forsta_sms_skickad_vid: '2026-03-15T17:00:00',
        paminnelse_skickad_vid: '2026-03-16T16:00:00',
        svarad_vid: '2026-03-16T18:00:00'
      },
      {
        vardgivare_namn: 'Dr A',
        besoksdatum: '2026-03-15',
        besoksstart_tid: null,
        forsta_sms_skickad_vid: '2026-03-15T11:00:00',
        svarad_vid: null
      }
    ]);

    expect(summary.measuredCount).toBe(3);
    expect(summary.averageDelayHours).toBe(2.7);
    expect(summary.buckets).toEqual([
      {
        bucket: '0-6h',
        sent: 3,
        answered: 2,
        responseRate: 0.667
      }
    ]);
  });

  it('summarizes first-SMS vs reminder response funnel', () => {
    const stats = summarizeSmsRoundStats([
      {
        vardgivare_namn: 'Dr A',
        besoksdatum: '2026-03-15',
        besoksstart_tid: '08:00',
        forsta_sms_skickad_vid: '2026-03-15T09:00:00',
        svarad_vid: '2026-03-15T12:00:00'
      },
      {
        vardgivare_namn: 'Dr A',
        besoksdatum: '2026-03-15',
        besoksstart_tid: '09:00',
        forsta_sms_skickad_vid: '2026-03-15T10:00:00',
        paminnelse_skickad_vid: '2026-03-16T15:00:00',
        svarad_vid: '2026-03-16T18:00:00'
      },
      {
        vardgivare_namn: 'Dr A',
        besoksdatum: '2026-03-15',
        besoksstart_tid: '10:00',
        forsta_sms_skickad_vid: '2026-03-15T11:00:00',
        paminnelse_skickad_vid: '2026-03-16T15:00:00',
        svarad_vid: null
      }
    ]);

    expect(stats.firstSmsRecipients).toBe(3);
    expect(stats.answeredAfterFirstOnly).toBe(1);
    expect(stats.remindersSent).toBe(2);
    expect(stats.answeredAfterReminder).toBe(1);
    expect(stats.firstRoundRate).toBeCloseTo(1 / 3, 4);
    expect(stats.reminderRoundRate).toBe(0.5);
  });

  it('summarizes helhetsbetyg per SMS-runda with anonymity threshold', () => {
    const rows = [
      {
        id: 'a',
        vardgivare_namn: 'Dr A',
        besoksdatum: '2026-03-15',
        besoksstart_tid: '08:00',
        forsta_sms_skickad_vid: '2026-03-15T09:00:00.000Z',
        paminnelse_skickad_vid: null,
        svarad_vid: '2026-03-15T12:00:00.000Z'
      },
      {
        id: 'b',
        vardgivare_namn: 'Dr A',
        besoksdatum: '2026-03-15',
        besoksstart_tid: '09:00',
        forsta_sms_skickad_vid: '2026-03-15T10:00:00.000Z',
        paminnelse_skickad_vid: '2026-03-16T15:00:00.000Z',
        svarad_vid: '2026-03-16T18:00:00.000Z'
      }
    ] as const;

    const scores = new Map<string, number>([
      ['a', 4],
      ['b', 2]
    ]);

    const under = summarizeSmsRoundHelhetsbetyg([...rows], scores, 5);
    expect(under.afterFirstSmsOnly).toEqual({ sampleSize: 1, averageHelhet: null });
    expect(under.afterReminder).toEqual({ sampleSize: 1, averageHelhet: null });

    const over = summarizeSmsRoundHelhetsbetyg([...rows], scores, 1);
    expect(over.afterFirstSmsOnly).toEqual({ sampleSize: 1, averageHelhet: 4 });
    expect(over.afterReminder).toEqual({ sampleSize: 1, averageHelhet: 2 });
  });
});
