import type { APIRoute } from 'astro';
import { jsonResponse as json } from '../../../lib/enkat-api-helpers';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { harMinstPortalRoll } from '../../../lib/portal-roles';
import { supabaseAdmin } from '../../../lib/supabase';
import {
  formatExcludedBookingTypePatterns,
  getDefaultExcludedBookingTypePatternText,
  parseExcludedBookingTypePatterns
} from '../../../lib/enkat-follow-up-rules';

export const prerender = false;

const SETTINGS_ROW_ID = 'standard';

function isMissingSettingsTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: string; message?: string };
  return maybeError.code === '42P01' || maybeError.message?.includes('enkat_installningar') === true;
}

function buildSettingsPayload(record?: { exkludera_bokningstyper?: unknown; updated_at?: string | null; updated_by?: string | null } | null) {
  const fallbackText = getDefaultExcludedBookingTypePatternText();
  const hasStoredPatterns = Array.isArray(record?.exkludera_bokningstyper);
  const storedText = formatExcludedBookingTypePatterns(hasStoredPatterns ? record?.exkludera_bokningstyper as string[] : null);
  const patternText = hasStoredPatterns ? storedText : fallbackText;

  return {
    excludedBookingTypePatterns: parseExcludedBookingTypePatterns(patternText),
    patternText,
    updatedAt: record?.updated_at || null,
    updatedBy: record?.updated_by || null,
    usingFallbackDefaults: !hasStoredPatterns
  };
}

export const GET: APIRoute = async ({ cookies }) => {
  if (!await arInloggad(cookies)) {
    return json({ success: false, error: 'Ej inloggad' }, 401);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('enkat_installningar')
      .select('exkludera_bokningstyper, updated_at, updated_by')
      .eq('id', SETTINGS_ROW_ID)
      .maybeSingle();

    if (error) {
      if (isMissingSettingsTable(error)) {
        return json({
          success: true,
          data: buildSettingsPayload(null),
          warning: 'Tabellen enkat_installningar saknas. Kör migreringen 025-enkat-installningar.sql för delad lagring.'
        });
      }

      return json({ success: false, error: error.message || 'Kunde inte läsa inställningarna.' }, 500);
    }

    return json({ success: true, data: buildSettingsPayload(data) });
  } catch (error: any) {
    return json({ success: false, error: error?.message || 'Okänt fel vid läsning av inställningar.' }, 500);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!await arInloggad(cookies)) {
    return json({ success: false, error: 'Ej inloggad' }, 401);
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return json({ success: false, error: 'Kunde inte hämta användare' }, 401);
  }

  if (!harMinstPortalRoll(anvandare.roll, 'admin')) {
    return json({ success: false, error: 'Endast administratör kan spara den gemensamma standardmallen.' }, 403);
  }

  try {
    const body = await request.json();
    const patternText = typeof body?.excludedBookingTypePatterns === 'string'
      ? body.excludedBookingTypePatterns
      : Array.isArray(body?.excludedBookingTypePatterns)
        ? formatExcludedBookingTypePatterns(body.excludedBookingTypePatterns)
        : '';

    const excludedBookingTypePatterns = parseExcludedBookingTypePatterns(patternText);

    const { data, error } = await supabaseAdmin
      .from('enkat_installningar')
      .upsert({
        id: SETTINGS_ROW_ID,
        exkludera_bokningstyper: excludedBookingTypePatterns,
        updated_by: anvandare.id
      }, { onConflict: 'id' })
      .select('exkludera_bokningstyper, updated_at, updated_by')
      .single();

    if (error) {
      if (isMissingSettingsTable(error)) {
        return json({
          success: false,
          error: 'Tabellen enkat_installningar saknas. Kör migreringen 025-enkat-installningar.sql först.'
        }, 500);
      }

      return json({ success: false, error: error.message || 'Kunde inte spara standardmallen.' }, 500);
    }

    return json({
      success: true,
      data: buildSettingsPayload(data)
    });
  } catch (error: any) {
    return json({ success: false, error: error?.message || 'Okänt fel vid sparande av inställningar.' }, 500);
  }
};
