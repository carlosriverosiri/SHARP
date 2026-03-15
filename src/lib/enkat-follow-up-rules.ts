import { normalizeSwedishText } from './enkat-booking-classifier';

export const DEFAULT_NEVER_FOLLOW_UP_BOOKING_PATTERNS = [
  'ssk',
  'suturtagning',
  'telefon',
  'tel.tid sll',
  'admin',
  'sll-tel'
] as const;

export type ExcludedBookingTypePreset = {
  id: string;
  name: string;
  description: string;
  patterns: string[];
};

export const EXCLUDED_BOOKING_TYPE_PRESETS: ExcludedBookingTypePreset[] = [
  {
    id: 'aterbesok',
    name: 'Även återbesök',
    description: 'Tar bort telefon-, admin-, SSK- och suturtyper men behåller vanliga mottagningsbesök och återbesök.',
    patterns: [...DEFAULT_NEVER_FOLLOW_UP_BOOKING_PATTERNS]
  },
  {
    id: 'utan_operation',
    name: 'Utan operation',
    description: 'Som standardmallen men sorterar även bort operationstyper. Bra när enkät ska gälla mottagningsbesök.',
    patterns: [...DEFAULT_NEVER_FOLLOW_UP_BOOKING_PATTERNS, 'operation']
  },
  {
    id: 'nybesok_remiss',
    name: 'Bara nybesök/remiss',
    description: 'Sorterar bort operation och återbesöksliknande bokningar. Bra för ren nybesöks- och remissuppföljning.',
    patterns: [...DEFAULT_NEVER_FOLLOW_UP_BOOKING_PATTERNS, 'operation', 'aterbesok', 'ab']
  },
  {
    id: 'ingen',
    name: 'Ingen auto-exkludering',
    description: 'Behåll alla bokningstyper i previewn. Använd när du vill göra allt urval manuellt.',
    patterns: []
  }
];

function canonicalizeBookingRule(value: string): string {
  return normalizeSwedishText(value).replace(/[^a-z0-9]/g, '');
}

export function parseExcludedBookingTypePatterns(value?: string | null): string[] {
  const rows = String(value || '')
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  return [...new Set(rows)];
}

export function formatExcludedBookingTypePatterns(patterns?: string[] | null): string {
  if (!Array.isArray(patterns)) return '';

  return [...new Set(
    patterns
      .map((pattern) => String(pattern || '').trim())
      .filter(Boolean)
  )].join('\n');
}

export function getDefaultExcludedBookingTypePatternText(): string {
  return DEFAULT_NEVER_FOLLOW_UP_BOOKING_PATTERNS.join('\n');
}

export function findExcludedBookingTypePattern(
  rawBookingType: string | null | undefined,
  patterns: string[]
): string | null {
  const bookingType = canonicalizeBookingRule(rawBookingType || '');
  if (!bookingType) return null;

  for (const pattern of patterns) {
    const canonicalPattern = canonicalizeBookingRule(pattern);
    if (!canonicalPattern) continue;
    if (bookingType.includes(canonicalPattern)) {
      return pattern;
    }
  }

  return null;
}
