import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  getManuallyExcludedRows,
  normalizePatternText,
  renderErrorsTable,
  renderSelectedRowsTable,
  renderSummaryCards
} from './enkat-page-helpers';

describe('enkat-page-helpers', () => {
  it('normalizes multiline pattern text by trimming and deduplicating', () => {
    const normalized = normalizePatternText(' Nybesok \n\nOperation\nNybesok\n Operation ');

    expect(normalized).toBe('Nybesok\nOperation');
  });

  it('escapes html-sensitive characters', () => {
    expect(escapeHtml('<tag attr="x">Tom & Jerry</tag>')).toBe('&lt;tag attr=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/tag&gt;');
  });

  it('counts manually excluded rows from unchecked booking types', () => {
    expect(getManuallyExcludedRows([
      { bookingTypeRaw: 'Nybesok', selected: true, count: 3 },
      { bookingTypeRaw: 'Operation', selected: false, count: 2 },
      { bookingTypeRaw: 'Kontroll', selected: false, count: 1 }
    ])).toBe(3);
  });

  it('renders summary cards with computed excluded row count', () => {
    const html = renderSummaryCards({
      totalRows: 10,
      validRows: 7,
      invalidRows: 1,
      autoExcludedRows: 1,
      duplicateRows: 1,
      bookingTypeOptions: [
        { bookingTypeRaw: 'Nybesok', selected: true, count: 4 },
        { bookingTypeRaw: 'Operation', selected: false, count: 2 }
      ]
    });

    expect(html).toContain('Totala rader');
    expect(html).toContain('Giltiga rader');
    expect(html).toContain('Ej valda rader');
    expect(html).toContain('>2<');
  });

  it('renders empty-state rows for selected rows and validation errors', () => {
    expect(renderSelectedRowsTable([])).toContain('Inga giltiga rader hittades.');
    expect(renderErrorsTable([])).toContain('Inga valideringsfel hittades.');
  });

  it('renders selected row values safely', () => {
    const html = renderSelectedRowsTable([
      {
        rowIndex: 3,
        patientId: 'patient-1',
        providerName: 'Dr <Test>',
        visitDate: '2026-03-15',
        visitStartTime: null,
        bookingTypeRaw: 'Nybesok',
        bookingTypeNormalized: 'nybesok'
      }
    ]);

    expect(html).toContain('patient-1');
    expect(html).toContain('Dr &lt;Test&gt;');
    expect(html).toContain('nybesok');
  });
});
