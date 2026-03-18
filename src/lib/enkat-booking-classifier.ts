export type NormalizedBookingType =
  | 'nybesok'
  | 'nybesok_remiss'
  | 'aterbesok'
  | 'ssk_besok'
  | 'telefon'
  | 'ovrigt';

export function normalizeSwedishText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyBookingType(rawValue?: string | null): NormalizedBookingType {
  const value = normalizeSwedishText(rawValue || '');

  if (!value) return 'ovrigt';
  if (value.includes('remiss')) return 'nybesok_remiss';
  if (value.includes('nybesok') || value.includes('nb')) return 'nybesok';
  if (value.includes('ssk')) return 'ssk_besok';
  if (value.includes('aterbesok') || /\bab\b/.test(value)) return 'aterbesok';
  if (value.includes('telefon')) return 'telefon';

  return 'ovrigt';
}

export function getBookingTypePriority(type: NormalizedBookingType): number {
  switch (type) {
    case 'nybesok':
      return 1;
    case 'nybesok_remiss':
      return 2;
    case 'aterbesok':
      return 3;
    case 'ssk_besok':
      return 4;
    case 'telefon':
      return 5;
    default:
      return 6;
  }
}

/**
 * Converts an internal booking type code to a patient-friendly label.
 * Used in SMS text and on the patient survey page.
 */
export function patientFriendlyBookingType(rawValue?: string | null): string {
  if (!rawValue) return 'Besök';

  const value = normalizeSwedishText(rawValue);

  const bodyPart = value.includes('axel') ? 'axel'
    : value.includes('kna') ? 'knä'
    : value.includes('armbage') ? 'armbåge'
    : value.includes('handled') ? 'handled'
    : value.includes('hoft') ? 'höft'
    : value.includes('fot') ? 'fot'
    : null;

  if (value.includes('remiss') || value.match(/^\d+\.\s*remiss/)) {
    return bodyPart ? `Nybesök ${bodyPart}` : 'Nybesök';
  }

  if (value.includes('ab op') || value.includes('aterbesok op')) {
    return bodyPart ? `Återbesök efter operation ${bodyPart}` : 'Återbesök efter operation';
  }

  if (value.includes('ssk')) return 'Sjuksköterskebesök';

  if (value.includes('ab') || value.includes('aterbesok')) {
    return bodyPart ? `Återbesök ${bodyPart}` : 'Återbesök';
  }

  if (value.includes('operation') || value.match(/^\d+\.\s*operation/)) {
    return bodyPart ? `Operation ${bodyPart}` : 'Operation';
  }

  if (value.includes('suturtagning')) return 'Suturtagning';
  if (value.includes('telefon')) return 'Telefonkontakt';
  if (value.includes('nybesok')) return bodyPart ? `Nybesök ${bodyPart}` : 'Nybesök';
  if (value.includes('kuralink')) return 'Digitalt besök';

  return rawValue.trim();
}

/**
 * Adds "Dr." prefix to a provider name if it doesn't already have one.
 */
export function formatProviderName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (/^(dr\.?|doktor)\s/i.test(trimmed)) return trimmed;
  return `Dr. ${trimmed}`;
}

export function getBookingChoiceReason(
  keptType: NormalizedBookingType,
  discardedType: NormalizedBookingType,
  keptDate?: string,
  discardedDate?: string
): string {
  const keptPriority = getBookingTypePriority(keptType);
  const discardedPriority = getBookingTypePriority(discardedType);

  if (keptPriority < discardedPriority) {
    return `Vald rad prioriterades eftersom ${keptType} går före ${discardedType}.`;
  }

  if (keptDate && discardedDate && keptDate !== discardedDate) {
    return `Vald rad prioriterades eftersom besöksdatum ${keptDate} bedömdes mer relevant än ${discardedDate}.`;
  }

  return 'Vald rad prioriterades enligt deduplikeringsreglerna.';
}
