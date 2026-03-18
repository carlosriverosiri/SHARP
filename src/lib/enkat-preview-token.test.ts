import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnkatPreviewRow } from './enkat-csv-parser';
import {
  createEnkatPreviewToken,
  hashEnkatPreviewToken,
  verifyEnkatPreviewToken
} from './enkat-preview-token';

const TEST_SECRET = 'test-secret';

const sampleRows: EnkatPreviewRow[] = [
  {
    rowIndex: 1,
    patientId: 'patient-1',
    phone: '0701234567',
    providerName: 'Dr Test',
    visitDate: '2026-03-15',
    visitStartTime: '08:00',
    bookingTypeRaw: 'Nybesok',
    bookingTypeNormalized: 'nybesok'
  }
];

function resignToken(
  token: string,
  mutate: (payload: Record<string, unknown>) => Record<string, unknown>
): string {
  const [encodedPayload] = token.split('.');
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Record<string, unknown>;
  const nextPayload = mutate(payload);
  const nextEncodedPayload = Buffer.from(JSON.stringify(nextPayload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', TEST_SECRET)
    .update(nextEncodedPayload)
    .digest('base64url');

  return `${nextEncodedPayload}.${signature}`;
}

describe('enkat-preview-token', () => {
  beforeEach(() => {
    vi.stubEnv('PERSONAL_SESSION_SECRET', TEST_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('creates and verifies a preview token roundtrip', () => {
    const token = createEnkatPreviewToken({
      userId: 'user-1',
      fileName: 'besok.csv',
      totalRows: 10,
      validRows: 8,
      invalidRows: 1,
      duplicateRows: 1,
      autoExcludedRows: 2,
      selectedRows: sampleRows
    });

    const payload = verifyEnkatPreviewToken(token, 'user-1');

    expect(payload.userId).toBe('user-1');
    expect(payload.fileName).toBe('besok.csv');
    expect(payload.selectedRows).toEqual(sampleRows);
    expect(payload.validRows).toBe(8);
  });

  it('rejects token for a different user', () => {
    const token = createEnkatPreviewToken({
      userId: 'user-1',
      fileName: 'besok.csv',
      totalRows: 2,
      validRows: 1,
      invalidRows: 1,
      duplicateRows: 0,
      autoExcludedRows: 0,
      selectedRows: sampleRows
    });

    expect(() => verifyEnkatPreviewToken(token, 'user-2')).toThrow('annan anvandare');
  });

  it('rejects a tampered token', () => {
    const token = createEnkatPreviewToken({
      userId: 'user-1',
      fileName: 'besok.csv',
      totalRows: 2,
      validRows: 1,
      invalidRows: 1,
      duplicateRows: 0,
      autoExcludedRows: 0,
      selectedRows: sampleRows
    });

    const tamperedToken = `${token}x`;

    expect(() => verifyEnkatPreviewToken(tamperedToken, 'user-1')).toThrow('kunde inte verifieras');
  });

  it('rejects an expired token even with a valid signature', () => {
    const token = createEnkatPreviewToken({
      userId: 'user-1',
      fileName: 'besok.csv',
      totalRows: 2,
      validRows: 1,
      invalidRows: 1,
      duplicateRows: 0,
      autoExcludedRows: 0,
      selectedRows: sampleRows
    });

    const expiredToken = resignToken(token, (payload) => ({
      ...payload,
      issuedAt: '2020-01-01T00:00:00.000Z',
      expiresAt: '2020-01-01T00:05:00.000Z'
    }));

    expect(() => verifyEnkatPreviewToken(expiredToken, 'user-1')).toThrow('gatt ut');
  });

  it('hashes the same token deterministically', () => {
    const token = createEnkatPreviewToken({
      userId: 'user-1',
      fileName: 'besok.csv',
      totalRows: 2,
      validRows: 1,
      invalidRows: 1,
      duplicateRows: 0,
      autoExcludedRows: 0,
      selectedRows: sampleRows
    });

    const firstHash = hashEnkatPreviewToken(token);
    const secondHash = hashEnkatPreviewToken(token);

    expect(firstHash).toBe(secondHash);
    expect(firstHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
