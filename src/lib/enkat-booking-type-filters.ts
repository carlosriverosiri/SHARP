export type EnkatBookingTypeFilterId = 'kuralink' | 'kna' | 'axel' | 'armbage';

export type EnkatBookingTypeFilterDefinition = {
  id: EnkatBookingTypeFilterId;
  label: string;
  matchTerms: string[];
};

export const ENKAT_BOOKING_TYPE_FILTERS: readonly EnkatBookingTypeFilterDefinition[] = [
  {
    id: 'kuralink',
    label: 'Kuralink',
    matchTerms: ['kuralink']
  },
  {
    id: 'kna',
    label: 'Knä',
    matchTerms: ['knä', 'kna']
  },
  {
    id: 'axel',
    label: 'Axel',
    matchTerms: ['axel']
  },
  {
    id: 'armbage',
    label: 'Armbåge',
    matchTerms: ['armbå', 'armba', 'armbåge', 'armbage']
  }
] as const;

const FILTER_IDS = new Set<EnkatBookingTypeFilterId>(
  ENKAT_BOOKING_TYPE_FILTERS.map((filter) => filter.id)
);

export function parseEnkatBookingTypeFilterIds(
  rawValue: string | null | undefined
): EnkatBookingTypeFilterId[] {
  const seen = new Set<EnkatBookingTypeFilterId>();

  for (const part of String(rawValue ?? '').split(',')) {
    const normalized = part.trim().toLowerCase();
    if (!normalized || normalized === 'all') {
      continue;
    }

    if (FILTER_IDS.has(normalized as EnkatBookingTypeFilterId)) {
      seen.add(normalized as EnkatBookingTypeFilterId);
    }
  }

  return [...seen];
}

export function buildEnkatBookingTypeRawOrFilter(
  filterIds: readonly EnkatBookingTypeFilterId[]
): string | null {
  const clauses = filterIds.flatMap((filterId) => {
    const config = ENKAT_BOOKING_TYPE_FILTERS.find((item) => item.id === filterId);
    if (!config) {
      return [];
    }

    return config.matchTerms.map((term) => `bokningstyp_raw.ilike.*${term}*`);
  });

  return clauses.length > 0 ? clauses.join(',') : null;
}
