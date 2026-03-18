import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state = {
    settingsResult: { data: null as any, error: null as any }
  };

  const fromMock = vi.fn((table: string) => {
    if (table !== 'enkat_installningar') {
      throw new Error(`Unexpected table: ${table}`);
    }

    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => state.settingsResult)
        }))
      }))
    };
  });

  return {
    state,
    fromMock,
    arInloggadMock: vi.fn(),
    hamtaAnvandareMock: vi.fn(),
    parseEnkatCsvMock: vi.fn(),
    createEnkatPreviewTokenMock: vi.fn()
  };
});

vi.mock('../../../lib/auth', () => ({
  arInloggad: mocks.arInloggadMock,
  hamtaAnvandare: mocks.hamtaAnvandareMock
}));

vi.mock('../../../lib/supabase', () => ({
  supabaseAdmin: {
    from: mocks.fromMock
  }
}));

vi.mock('../../../lib/enkat-csv-parser', () => ({
  parseEnkatCsv: mocks.parseEnkatCsvMock
}));

vi.mock('../../../lib/enkat-preview-token', () => ({
  createEnkatPreviewToken: mocks.createEnkatPreviewTokenMock
}));

import { POST } from './upload';

function createUploadRequest(options: {
  file?: File;
  excludedBookingTypePatterns?: string;
  selectedBookingTypes?: string[];
} = {}): Request {
  const formData = new FormData();

  if (options.file) {
    formData.set('file', options.file);
  }

  if (options.excludedBookingTypePatterns !== undefined) {
    formData.set('excludedBookingTypePatterns', options.excludedBookingTypePatterns);
  }

  if (options.selectedBookingTypes) {
    formData.set('selectedBookingTypes', JSON.stringify(options.selectedBookingTypes));
  }

  return new Request('http://localhost/api/enkat/upload', {
    method: 'POST',
    body: formData
  });
}

describe('POST /api/enkat/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.state.settingsResult = {
      data: {
        exkludera_bokningstyper: ['telefon', 'ssk']
      },
      error: null
    };

    mocks.arInloggadMock.mockResolvedValue(true);
    mocks.hamtaAnvandareMock.mockResolvedValue({
      id: 'user-1',
      email: 'carlos@example.com',
      roll: 'admin',
      namn: 'Carlos Test'
    });
    mocks.parseEnkatCsvMock.mockReturnValue({
      totalRows: 2,
      validRows: 1,
      invalidRows: 0,
      autoExcludedRows: 1,
      duplicateRows: 0,
      bookingTypeOptions: [
        { bookingTypeRaw: 'Nybesök', count: 1, selected: true }
      ],
      autoExcludedGroups: [],
      selectedRows: [
        {
          rowIndex: 2,
          patientId: 'patient-1',
          phone: '+46701234567',
          providerName: 'Dr Test',
          visitDate: '2026-03-18',
          visitStartTime: '08:00',
          bookingTypeRaw: 'Nybesök',
          bookingTypeNormalized: 'nybesok'
        }
      ],
      duplicates: [],
      errors: []
    });
    mocks.createEnkatPreviewTokenMock.mockReturnValue('preview-token-1');
  });

  it('returns 401 when the user is not logged in', async () => {
    mocks.arInloggadMock.mockResolvedValueOnce(false);

    const response = await POST({
      request: createUploadRequest(),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: 'Ej inloggad'
    });
  });

  it('returns 400 when no file is uploaded', async () => {
    const response = await POST({
      request: createUploadRequest(),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: 'Ingen fil uppladdad'
    });
    expect(mocks.parseEnkatCsvMock).not.toHaveBeenCalled();
  });

  it('returns 400 when the parsed file contains too many rows', async () => {
    mocks.parseEnkatCsvMock.mockReturnValueOnce({
      totalRows: 501,
      validRows: 500,
      invalidRows: 1,
      autoExcludedRows: 0,
      duplicateRows: 0,
      bookingTypeOptions: [],
      autoExcludedGroups: [],
      selectedRows: [],
      duplicates: [],
      errors: []
    });

    const response = await POST({
      request: createUploadRequest({
        file: new File(['Patient-ID;Mobiltelefon\n1;0701234567'], 'besok.csv', { type: 'text/csv' })
      }),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: 'Filen innehåller för många rader. Max 500 rader tillåts i V1.',
      details: { totalRows: 501 }
    });
    expect(mocks.createEnkatPreviewTokenMock).not.toHaveBeenCalled();
  });

  it('uses shared exclusion rules and selected booking types when building preview data', async () => {
    const response = await POST({
      request: createUploadRequest({
        file: new File(['Patient-ID;Mobiltelefon\n1;0701234567'], 'besok.csv', { type: 'text/csv' }),
        selectedBookingTypes: ['Nybesök']
      }),
      cookies: {} as Parameters<typeof POST>[0]['cookies']
    } as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.parseEnkatCsvMock).toHaveBeenCalledWith(
      'Patient-ID;Mobiltelefon\n1;0701234567',
      {
        excludedBookingTypePatterns: ['telefon', 'ssk'],
        includedBookingTypes: ['Nybesök']
      }
    );
    expect(mocks.createEnkatPreviewTokenMock).toHaveBeenCalledWith({
      userId: 'user-1',
      fileName: 'besok.csv',
      totalRows: 2,
      validRows: 1,
      invalidRows: 0,
      duplicateRows: 0,
      autoExcludedRows: 1,
      selectedRows: [
        {
          rowIndex: 2,
          patientId: 'patient-1',
          phone: '+46701234567',
          providerName: 'Dr Test',
          visitDate: '2026-03-18',
          visitStartTime: '08:00',
          bookingTypeRaw: 'Nybesök',
          bookingTypeNormalized: 'nybesok'
        }
      ]
    });
    expect(body).toEqual({
      success: true,
      data: {
        fileName: 'besok.csv',
        previewToken: 'preview-token-1',
        uploadedBy: 'carlos@example.com',
        excludedBookingTypePatterns: ['telefon', 'ssk'],
        totalRows: 2,
        validRows: 1,
        invalidRows: 0,
        autoExcludedRows: 1,
        duplicateRows: 0,
        bookingTypeOptions: [
          { bookingTypeRaw: 'Nybesök', count: 1, selected: true }
        ],
        autoExcludedGroups: [],
        selectedRows: [
          {
            rowIndex: 2,
            patientId: 'patient-1',
            phone: '+46701234567',
            providerName: 'Dr Test',
            visitDate: '2026-03-18',
            visitStartTime: '08:00',
            bookingTypeRaw: 'Nybesök',
            bookingTypeNormalized: 'nybesok'
          }
        ],
        duplicates: [],
        errors: []
      }
    });
  });
});
