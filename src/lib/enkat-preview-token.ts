import crypto from 'node:crypto';
import type { EnkatPreviewRow } from './enkat-csv-parser';

const PREVIEW_TOKEN_VERSION = 1 as const;
const PREVIEW_TOKEN_TTL_MS = 30 * 60 * 1000;

export type EnkatPreviewTokenPayload = {
  version: typeof PREVIEW_TOKEN_VERSION;
  userId: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  autoExcludedRows: number;
  issuedAt: string;
  expiresAt: string;
  selectedRows: EnkatPreviewRow[];
};

type CreateEnkatPreviewTokenInput = {
  userId: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  autoExcludedRows: number;
  selectedRows: EnkatPreviewRow[];
};

function getPreviewSigningSecret(): string {
  const secret = import.meta.env.PERSONAL_SESSION_SECRET || import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!secret) {
    throw new Error('Saknar server-side secret for preview-token till enkat.');
  }

  return secret;
}

function encodePayload(payload: EnkatPreviewTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload(encodedPayload: string): unknown {
  return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
}

function signEncodedPayload(encodedPayload: string): string {
  return crypto
    .createHmac('sha256', getPreviewSigningSecret())
    .update(encodedPayload)
    .digest('base64url');
}

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPreviewRow(value: unknown): value is EnkatPreviewRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const row = value as Record<string, unknown>;
  return typeof row.rowIndex === 'number'
    && typeof row.patientId === 'string'
    && typeof row.phone === 'string'
    && typeof row.providerName === 'string'
    && typeof row.visitDate === 'string'
    && (typeof row.visitStartTime === 'string' || row.visitStartTime === null)
    && (typeof row.bookingTypeRaw === 'string' || row.bookingTypeRaw === null)
    && typeof row.bookingTypeNormalized === 'string';
}

function assertValidPayload(payload: unknown): asserts payload is EnkatPreviewTokenPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('Preview-token saknar giltig payload.');
  }

  const maybePayload = payload as Record<string, unknown>;
  if (maybePayload.version !== PREVIEW_TOKEN_VERSION) {
    throw new TypeError('Preview-token har en version som inte stods.');
  }

  if (typeof maybePayload.userId !== 'string' || !maybePayload.userId.trim()) {
    throw new TypeError('Preview-token saknar userId.');
  }

  if (typeof maybePayload.fileName !== 'string' || !maybePayload.fileName.trim()) {
    throw new TypeError('Preview-token saknar filnamn.');
  }

  if (!isNonNegativeInteger(maybePayload.totalRows)
    || !isNonNegativeInteger(maybePayload.validRows)
    || !isNonNegativeInteger(maybePayload.invalidRows)
    || !isNonNegativeInteger(maybePayload.duplicateRows)
    || !isNonNegativeInteger(maybePayload.autoExcludedRows)) {
    throw new TypeError('Preview-token har ogiltiga sammanfattningsvarden.');
  }

  if (typeof maybePayload.issuedAt !== 'string' || typeof maybePayload.expiresAt !== 'string') {
    throw new TypeError('Preview-token saknar tidsstamplar.');
  }

  if (!Array.isArray(maybePayload.selectedRows) || maybePayload.selectedRows.some((row) => !isPreviewRow(row))) {
    throw new TypeError('Preview-token innehaller ogiltiga previewrader.');
  }
}

export function createEnkatPreviewToken(input: CreateEnkatPreviewTokenInput): string {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + PREVIEW_TOKEN_TTL_MS);

  const payload: EnkatPreviewTokenPayload = {
    version: PREVIEW_TOKEN_VERSION,
    userId: input.userId,
    fileName: input.fileName,
    totalRows: input.totalRows,
    validRows: input.validRows,
    invalidRows: input.invalidRows,
    duplicateRows: input.duplicateRows,
    autoExcludedRows: input.autoExcludedRows,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    selectedRows: input.selectedRows
  };

  const encodedPayload = encodePayload(payload);
  const signature = signEncodedPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyEnkatPreviewToken(token: string, expectedUserId: string): EnkatPreviewTokenPayload {
  const [encodedPayload, signature] = String(token || '').split('.');
  if (!encodedPayload || !signature) {
    throw new Error('Ogiltig preview-token.');
  }

  const expectedSignature = signEncodedPayload(encodedPayload);
  if (!safeEquals(signature, expectedSignature)) {
    throw new Error('Preview-token kunde inte verifieras.');
  }

  const payload = decodePayload(encodedPayload);
  assertValidPayload(payload);

  if (payload.userId !== expectedUserId) {
    throw new Error('Preview-token tillhor en annan anvandare.');
  }

  if (new Date(payload.expiresAt).getTime() < Date.now()) {
    throw new Error('Preview-token har gatt ut. Las filen igen och skapa en ny preview.');
  }

  if (payload.selectedRows.length === 0) {
    throw new Error('Preview-token innehaller inga valda rader.');
  }

  return payload;
}

export function hashEnkatPreviewToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
