import type { APIRoute } from 'astro';
import { jsonResponse as json } from '../../../lib/enkat-api-helpers';
import { maskSensitiveEnkatText } from '../../../lib/enkat-free-text-sanitizer';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

type SubmitEnkatResponseResult = {
  status: 'ok' | 'invalid_code' | 'already_used' | 'expired';
  kampanj_id: string | null;
  utskick_id: string | null;
  svarad_vid: string | null;
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const code = String(body.code || '').trim();
    const overallScore = Number(body.overallScore);
    const bemotande = Number(body.bemotande);
    const information = Number(body.information);
    const lyssnadPa = Number(body.lyssnadPa);
    // Legacy compatibility: if client no longer sends planFramat, mirror information.
    const planFramat = Number(body.planFramat ?? body.information);
    const commentGood = maskSensitiveEnkatText(String(body.commentGood || '').trim());
    const commentImprove = maskSensitiveEnkatText(String(body.commentImprove || '').trim());

    if (!code || code.length < 12) {
      return json({ success: false, error: 'Ogiltig enkätkod.' }, 400);
    }

    const scores = [overallScore, bemotande, information, lyssnadPa, planFramat];
    if (scores.some((value) => Number.isNaN(value))) {
      return json({ success: false, error: 'Alla obligatoriska betyg måste fyllas i.' }, 400);
    }

    if (overallScore < 1 || overallScore > 5 || !Number.isInteger(overallScore)) {
      return json({ success: false, error: 'Helhetsbetyg måste vara ett heltal mellan 1 och 5.' }, 400);
    }

    const subscores = [bemotande, information, lyssnadPa, planFramat];
    if (subscores.some((s) => s < 1 || s > 5 || !Number.isInteger(s))) {
      return json({ success: false, error: 'Delbetyg måste vara heltal mellan 1 och 5.' }, 400);
    }

    const { data, error } = await supabaseAdmin.rpc('submit_enkat_response', {
      p_code: code,
      p_helhetsbetyg: overallScore,
      p_bemotande: bemotande,
      p_information: information,
      p_lyssnad_pa: lyssnadPa,
      p_plan_framat: planFramat,
      p_kommentar_bra: commentGood || null,
      p_kommentar_forbattra: commentImprove || null
    });

    if (error) {
      return json({ success: false, error: error.message || 'Kunde inte spara svaret.' }, 500);
    }

    const submitResult = (Array.isArray(data) ? data[0] : data) as SubmitEnkatResponseResult | null;
    if (!submitResult) {
      return json({ success: false, error: 'Kunde inte spara svaret.' }, 500);
    }

    if (submitResult.status === 'invalid_code') {
      return json({ success: false, error: 'Länken är ogiltig eller saknas.' }, 404);
    }

    if (submitResult.status === 'already_used') {
      return json({ success: false, error: 'Den här länken har redan använts.' }, 409);
    }

    if (submitResult.status === 'expired') {
      return json({ success: false, error: 'Länken har gått ut.' }, 410);
    }

    if (submitResult.status !== 'ok') {
      return json({ success: false, error: 'Kunde inte spara svaret.' }, 500);
    }

    return json({
      success: true,
      data: {
        message: 'Ditt svar är registrerat anonymt.'
      }
    });
  } catch (error: unknown) {
    console.error('Kunde inte ta emot enkätsvar:', error);
    return json({
      success: false,
      error: 'Ett oväntat fel uppstod när svaret skulle sparas.'
    }, 500);
  }
};
