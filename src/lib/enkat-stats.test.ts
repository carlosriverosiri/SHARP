import { describe, expect, it } from 'vitest';
import {
  average,
  bucketForDelay,
  calculateDelayHours,
  summarizeDelayRows
} from './enkat-stats';

describe('enkat-stats', () => {
  it('calculates averages with two decimals', () => {
    expect(average([1, 2, 2])).toBe(1.67);
    expect(average([])).toBe(0);
  });

  it('calculates delay hours only when visit time and sent time exist', () => {
    expect(calculateDelayHours('2026-03-15', null, '2026-03-15T10:00:00')).toBeNull();
    expect(calculateDelayHours('2026-03-15', '08:00', '2026-03-15T10:30:00')).toBe(2.5);
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
        besoksstart_tid: null,
        forsta_sms_skickad_vid: '2026-03-15T11:00:00',
        svarad_vid: null
      }
    ]);

    expect(summary.measuredCount).toBe(2);
    expect(summary.averageDelayHours).toBe(2);
    expect(summary.buckets).toEqual([
      {
        bucket: '0-6h',
        sent: 2,
        answered: 1,
        responseRate: 0.5
      }
    ]);
  });
});
