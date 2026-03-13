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
  if (value.includes('nybesok') || value.includes('nybesok')) return 'nybesok';
  if (value.includes('remiss')) return 'nybesok_remiss';
  if (value.includes('ab') || value.includes('aterbesok')) return 'aterbesok';
  if (value.includes('ssk')) return 'ssk_besok';
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
