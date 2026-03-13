import Papa from 'papaparse';
import {
  classifyBookingType,
  getBookingChoiceReason,
  getBookingTypePriority,
  normalizeSwedishText,
  type NormalizedBookingType
} from './enkat-booking-classifier';

type RawCsvRow = Record<string, string>;

export type EnkatPreviewRow = {
  rowIndex: number;
  patientId: string;
  phone: string;
  providerName: string;
  visitDate: string;
  visitStartTime: string | null;
  bookingTypeRaw: string | null;
  bookingTypeNormalized: NormalizedBookingType;
};

export type EnkatDuplicateGroup = {
  dedupKey: string;
  patientId: string | null;
  chosenReason: string;
  keptRowIndex: number;
  discardedRowIndexes: number[];
};

export type EnkatValidationError = {
  rowIndex: number;
  field: string;
  message: string;
};

export type EnkatParseResult = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  selectedRows: EnkatPreviewRow[];
  duplicates: EnkatDuplicateGroup[];
  errors: EnkatValidationError[];
};

const REQUIRED_HEADERS = ['patientid', 'mobiltelefon', 'vardgivare', 'datum'] as const;

function canonicalizeHeader(value: string): string {
  return normalizeSwedishText(value).replace(/[^a-z0-9]/g, '');
}

function mapHeaders(headers: string[]): Record<string, string> {
  const mapped: Record<string, string> = {};

  for (const header of headers) {
    const canonical = canonicalizeHeader(header);
    if (canonical === 'patientid') mapped.patientid = header;
    else if (canonical === 'mobiltelefon') mapped.mobiltelefon = header;
    else if (canonical === 'vardgivare') mapped.vardgivare = header;
    else if (canonical === 'datum') mapped.datum = header;
    else if (canonical === 'bokningstyp') mapped.bokningstyp = header;
    else if (canonical === 'starttid') mapped.starttid = header;
  }

  return mapped;
}

function cleanCell(row: RawCsvRow, key?: string): string {
  if (!key) return '';
  return String(row[key] ?? '').trim();
}

function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\+46\d{7,12}$/.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/\D/g, '');
  if (/^0\d{8,11}$/.test(digits)) return `+46${digits.slice(1)}`;
  if (/^46\d{7,12}$/.test(digits)) return `+${digits}`;

  return null;
}

function normalizeDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const date = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return trimmed;
}

function normalizeTime(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function choosePreferredRow(rows: EnkatPreviewRow[]): { kept: EnkatPreviewRow; discarded: EnkatPreviewRow[]; reason: string } {
  const sorted = [...rows].sort((a, b) => {
    const priorityDiff = getBookingTypePriority(a.bookingTypeNormalized) - getBookingTypePriority(b.bookingTypeNormalized);
    if (priorityDiff !== 0) return priorityDiff;

    const dateDiff = new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime();
    if (dateDiff !== 0) return dateDiff;

    return a.rowIndex - b.rowIndex;
  });

  const kept = sorted[0];
  const discarded = sorted.slice(1);
  const firstDiscarded = discarded[0];
  const reason = firstDiscarded
    ? getBookingChoiceReason(
        kept.bookingTypeNormalized,
        firstDiscarded.bookingTypeNormalized,
        kept.visitDate,
        firstDiscarded.visitDate
      )
    : 'Ingen dubblett att hantera.';

  return { kept, discarded, reason };
}

export function parseEnkatCsv(csvText: string, globalBookingType?: string): EnkatParseResult {
  const parsed = Papa.parse<RawCsvRow>(csvText, {
    header: true,
    delimiter: ';',
    skipEmptyLines: 'greedy'
  });

  const headers = parsed.meta.fields || [];
  const headerMap = mapHeaders(headers);

  const errors: EnkatValidationError[] = [];
  for (const required of REQUIRED_HEADERS) {
    if (!headerMap[required]) {
      errors.push({
        rowIndex: 0,
        field: required,
        message: `Saknar obligatorisk kolumn: ${required}`
      });
    }
  }

  if (errors.length > 0) {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: errors.length,
      duplicateRows: 0,
      selectedRows: [],
      duplicates: [],
      errors
    };
  }

  const selectedCandidates: EnkatPreviewRow[] = [];

  parsed.data.forEach((row, index) => {
    const rowIndex = index + 2;
    const patientId = cleanCell(row, headerMap.patientid);
    const providerName = cleanCell(row, headerMap.vardgivare);
    const normalizedPhone = normalizePhone(cleanCell(row, headerMap.mobiltelefon));
    const normalizedDate = normalizeDate(cleanCell(row, headerMap.datum));
    const visitStartTime = normalizeTime(cleanCell(row, headerMap.starttid));
    const bookingTypeRaw = cleanCell(row, headerMap.bokningstyp) || globalBookingType?.trim() || '';
    const bookingTypeNormalized = classifyBookingType(bookingTypeRaw);

    if (!patientId) {
      errors.push({ rowIndex, field: 'Patient-ID', message: 'Patient-ID saknas.' });
    }
    if (!normalizedPhone) {
      errors.push({ rowIndex, field: 'Mobiltelefon', message: 'Ogiltigt telefonnummer.' });
    }
    if (!providerName) {
      errors.push({ rowIndex, field: 'Vårdgivare', message: 'Vårdgivare saknas.' });
    }
    if (!normalizedDate) {
      errors.push({ rowIndex, field: 'Datum', message: 'Ogiltigt datumformat. Förväntat YYYY-MM-DD.' });
    }

    if (!patientId || !normalizedPhone || !providerName || !normalizedDate) {
      return;
    }

    selectedCandidates.push({
      rowIndex,
      patientId,
      phone: normalizedPhone,
      providerName,
      visitDate: normalizedDate,
      visitStartTime,
      bookingTypeRaw: bookingTypeRaw || null,
      bookingTypeNormalized
    });
  });

  const groups = new Map<string, EnkatPreviewRow[]>();
  for (const row of selectedCandidates) {
    const dedupKey = row.patientId || row.phone;
    const current = groups.get(dedupKey) || [];
    current.push(row);
    groups.set(dedupKey, current);
  }

  const selectedRows: EnkatPreviewRow[] = [];
  const duplicates: EnkatDuplicateGroup[] = [];

  for (const [dedupKey, rows] of groups.entries()) {
    if (rows.length === 1) {
      selectedRows.push(rows[0]);
      continue;
    }

    const { kept, discarded, reason } = choosePreferredRow(rows);
    selectedRows.push(kept);
    duplicates.push({
      dedupKey,
      patientId: kept.patientId || null,
      chosenReason: reason,
      keptRowIndex: kept.rowIndex,
      discardedRowIndexes: discarded.map((row) => row.rowIndex)
    });
  }

  selectedRows.sort((a, b) => a.rowIndex - b.rowIndex);

  return {
    totalRows: parsed.data.length,
    validRows: selectedRows.length,
    invalidRows: [...new Set(errors.map((err) => err.rowIndex))].filter((value) => value !== 0).length,
    duplicateRows: duplicates.reduce((sum, item) => sum + item.discardedRowIndexes.length, 0),
    selectedRows,
    duplicates,
    errors
  };
}
