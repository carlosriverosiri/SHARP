import { describe, expect, it } from 'vitest';
import { parseEnkatCsv } from './enkat-csv-parser';

function joinCsv(rows: string[][]): string {
  return rows.map((row) => row.join(';')).join('\n');
}

describe('enkat-csv-parser', () => {
  it('requires Diagnoser column in the import file', () => {
    const csv = joinCsv([
      ['PatientID', 'Mobiltelefon', 'Vardgivare', 'Datum', 'Bokningstyp'],
      ['p1', '0701234567', 'Dr A', '2026-03-15', 'Nybesök']
    ]);

    const result = parseEnkatCsv(csv);

    expect(result.totalRows).toBe(0);
    expect(result.validRows).toBe(0);
    expect(result.errors[0]?.message).toContain('diagnoser');
  });

  it('auto-excludes rows with empty Diagnoser without turning them into validation errors', () => {
    const csv = joinCsv([
      ['PatientID', 'Mobiltelefon', 'Vardgivare', 'Datum', 'Bokningstyp', 'Diagnoser', 'Starttid'],
      ['p1', '0701234567', 'Dr A', '2026-03-15', 'Nybesök', '', '08:00'],
      ['p2', '0707654321', 'Dr B', '2026-03-15', 'Återbesök', 'M17', '09:30']
    ]);

    const result = parseEnkatCsv(csv);

    expect(result.totalRows).toBe(2);
    expect(result.validRows).toBe(1);
    expect(result.invalidRows).toBe(0);
    expect(result.autoExcludedRows).toBe(1);
    expect(result.autoExcludedGroups).toEqual([
      expect.objectContaining({
        label: 'Saknar diagnos',
        reason: 'Kolumnen Diagnoser är tom',
        count: 1
      })
    ]);
    expect(result.selectedRows[0]?.patientId).toBe('p2');
  });

  it('keeps booking type options visible while positive selection limits preview rows', () => {
    const csv = joinCsv([
      ['PatientID', 'Mobiltelefon', 'Vardgivare', 'Datum', 'Bokningstyp', 'Diagnoser', 'Starttid'],
      ['p1', '0701234567', 'Dr A', '2026-03-15', 'Nybesök', 'M17', '08:00'],
      ['p2', '0707654321', 'Dr A', '2026-03-15', 'Återbesök', 'M17', '09:00']
    ]);

    const result = parseEnkatCsv(csv, {
      includedBookingTypes: ['Återbesök']
    });

    expect(result.bookingTypeOptions).toEqual([
      expect.objectContaining({ bookingTypeRaw: 'Nybesök', count: 1, selected: false }),
      expect.objectContaining({ bookingTypeRaw: 'Återbesök', count: 1, selected: true })
    ]);
    expect(result.selectedRows).toHaveLength(1);
    expect(result.selectedRows[0]?.bookingTypeRaw).toBe('Återbesök');
  });

  it('applies fixed exclusion patterns before preview options are built', () => {
    const csv = joinCsv([
      ['PatientID', 'Mobiltelefon', 'Vardgivare', 'Datum', 'Bokningstyp', 'Diagnoser', 'Starttid'],
      ['p1', '0701234567', 'Dr A', '2026-03-15', 'Telefonkontakt', 'M17', '08:00'],
      ['p2', '0707654321', 'Dr A', '2026-03-15', 'Nybesök', 'M17', '09:00']
    ]);

    const result = parseEnkatCsv(csv, {
      excludedBookingTypePatterns: ['telefon']
    });

    expect(result.autoExcludedRows).toBe(1);
    expect(result.autoExcludedGroups).toEqual([
      expect.objectContaining({
        label: 'Telefonkontakt',
        reason: 'Bokningstyp matchade regeln "telefon"'
      })
    ]);
    expect(result.bookingTypeOptions).toEqual([
      expect.objectContaining({ bookingTypeRaw: 'Nybesök', selected: true })
    ]);
  });

  it('deduplicates repeated patients and keeps the higher-priority booking type', () => {
    const csv = joinCsv([
      ['PatientID', 'Mobiltelefon', 'Vardgivare', 'Datum', 'Bokningstyp', 'Diagnoser', 'Starttid'],
      ['p1', '0701234567', 'Dr A', '2026-03-15', 'Återbesök', 'M17', '08:00'],
      ['p1', '0701234567', 'Dr A', '2026-03-15', 'Remiss knä', 'M17', '08:30']
    ]);

    const result = parseEnkatCsv(csv);

    expect(result.validRows).toBe(1);
    expect(result.duplicateRows).toBe(1);
    expect(result.selectedRows[0]?.bookingTypeNormalized).toBe('nybesok_remiss');
    expect(result.duplicates[0]).toEqual(
      expect.objectContaining({
        keptRowIndex: 3,
        discardedRowIndexes: [2]
      })
    );
    expect(result.duplicates[0]?.chosenReason).toContain('nybesok_remiss går före aterbesok');
  });
});
