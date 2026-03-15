import type { APIRoute } from 'astro';
import { jsonResponse as json } from '../../../lib/enkat-api-helpers';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { parseEnkatCsv } from '../../../lib/enkat-csv-parser';
import {
  formatExcludedBookingTypePatterns,
  getDefaultExcludedBookingTypePatternText,
  parseExcludedBookingTypePatterns
} from '../../../lib/enkat-follow-up-rules';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

async function getSharedExcludedBookingTypePatternText() {
  try {
    const { data, error } = await supabaseAdmin
      .from('enkat_installningar')
      .select('exkludera_bokningstyper')
      .eq('id', 'standard')
      .maybeSingle();

    if (error || !data) {
      return getDefaultExcludedBookingTypePatternText();
    }

    const storedText = formatExcludedBookingTypePatterns(data.exkludera_bokningstyper);
    return storedText;
  } catch {
    return getDefaultExcludedBookingTypePatternText();
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!await arInloggad(cookies)) {
    return json({ success: false, error: 'Ej inloggad' }, 401);
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return json({ success: false, error: 'Kunde inte hämta användare' }, 401);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const hasSubmittedPatterns = formData.has('excludedBookingTypePatterns');
    const submittedPatternText = String(formData.get('excludedBookingTypePatterns') ?? '').trim();
    const patternText = hasSubmittedPatterns ? submittedPatternText : await getSharedExcludedBookingTypePatternText();
    const excludedBookingTypePatterns = parseExcludedBookingTypePatterns(
      patternText
    );

    if (!(file instanceof File)) {
      return json({ success: false, error: 'Ingen fil uppladdad' }, 400);
    }

    if (file.size === 0) {
      return json({ success: false, error: 'Filen är tom' }, 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return json({ success: false, error: 'Filen är för stor. Max 5 MB tillåts i V1.' }, 400);
    }

    const rawBytes = await file.arrayBuffer();
    let text = new TextDecoder('utf-8').decode(rawBytes);

    if (text.includes('\uFFFD')) {
      text = new TextDecoder('latin1').decode(rawBytes);
    }

    const result = parseEnkatCsv(text, { excludedBookingTypePatterns });

    if (result.totalRows > 500) {
      return json({
        success: false,
        error: 'Filen innehåller för många rader. Max 500 rader tillåts i V1.',
        details: { totalRows: result.totalRows }
      }, 400);
    }

    return json({
      success: true,
      data: {
        fileName: file.name,
        uploadedBy: anvandare.email,
        excludedBookingTypePatterns,
        ...result
      }
    });
  } catch (error: any) {
    console.error('Enkät-upload misslyckades:', error);
    return json({
      success: false,
      error: 'Kunde inte läsa eller validera filen.',
      details: { message: error?.message || 'Okänt fel' }
    }, 500);
  }
};
