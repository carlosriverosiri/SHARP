import type { Anvandare } from './auth';
import { harMinstPortalRoll } from './portal-roles';
import { supabaseAdmin } from './supabase';

export type EnkatProviderScope = {
  isAdmin: boolean;
  ownProviderName: string | null;
  effectiveProviderFilter: string | null;
};

export async function getEnkatUserProviderName(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('vardgivare_namn')
      .eq('id', userId)
      .maybeSingle();

    if (error) return null;

    const providerName = data?.vardgivare_namn?.trim();
    return providerName || null;
  } catch {
    return null;
  }
}

export async function resolveEnkatProviderScope(
  anvandare: Anvandare,
  requestedProviderFilter?: string | null
): Promise<EnkatProviderScope> {
  const isAdmin = harMinstPortalRoll(anvandare.roll, 'admin');
  const requestedProvider = requestedProviderFilter?.trim() || null;

  if (isAdmin) {
    return {
      isAdmin: true,
      ownProviderName: null,
      effectiveProviderFilter: requestedProvider
    };
  }

  const ownProviderName = await getEnkatUserProviderName(anvandare.id);
  return {
    isAdmin: false,
    ownProviderName,
    effectiveProviderFilter: ownProviderName
  };
}
