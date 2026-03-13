import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function maskSensitiveText(value: string): string {
  return value
    .replace(/\b\d{6}[- ]?\d{4}\b/g, '[personnummer borttaget]')
    .replace(/\b\d{8}[- ]?\d{4}\b/g, '[personnummer borttaget]')
    .replace(/\+46\d{7,12}\b/g, '[telefon borttagen]')
    .replace(/\b0\d{8,11}\b/g, '[telefon borttagen]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[e-post borttagen]');
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const code = String(body.code || '').trim();
    const overallScore = Number(body.overallScore);
    const bemotande = Number(body.bemotande);
    const information = Number(body.information);
    const lyssnadPa = Number(body.lyssnadPa);
    const planFramat = Number(body.planFramat);
    const commentGood = maskSensitiveText(String(body.commentGood || '').trim());
    const commentImprove = maskSensitiveText(String(body.commentImprove || '').trim());

    if (!code || code.length < 12) {
      return json({ success: false, error: 'Ogiltig enkätkod.' }, 400);
    }

    const scores = [overallScore, bemotande, information, lyssnadPa, planFramat];
    if (scores.some((value) => Number.isNaN(value))) {
      return json({ success: false, error: 'Alla obligatoriska betyg måste fyllas i.' }, 400);
    }

    const nowIso = new Date().toISOString();

    const { data: utskick, error: utskickError } = await supabaseAdmin
      .from('enkat_utskick')
      .select('id, kampanj_id, vardgivare_namn, besoksdatum, besoksstart_tid, bokningstyp_raw, bokningstyp_normaliserad, used, expires_at')
      .eq('unik_kod', code)
      .single();

    if (utskickError || !utskick) {
      return json({ success: false, error: 'Länken är ogiltig eller saknas.' }, 404);
    }

    if (utskick.used) {
      return json({ success: false, error: 'Den här länken har redan använts.' }, 409);
    }

    if (utskick.expires_at && new Date(utskick.expires_at) < new Date()) {
      return json({ success: false, error: 'Länken har gått ut.' }, 410);
    }

    const { error: insertError } = await supabaseAdmin
      .from('enkat_svar')
      .insert({
        kampanj_id: utskick.kampanj_id,
        utskick_id: utskick.id,
        vardgivare_namn: utskick.vardgivare_namn,
        besoksdatum: utskick.besoksdatum,
        besoksstart_tid: utskick.besoksstart_tid,
        bokningstyp_raw: utskick.bokningstyp_raw,
        bokningstyp_normaliserad: utskick.bokningstyp_normaliserad,
        helhetsbetyg: overallScore,
        bemotande,
        information,
        lyssnad_pa: lyssnadPa,
        plan_framat: planFramat,
        kommentar_bra: commentGood || null,
        kommentar_forbattra: commentImprove || null
      });

    if (insertError) {
      return json({ success: false, error: insertError.message || 'Kunde inte spara svaret.' }, 500);
    }

    await supabaseAdmin
      .from('enkat_utskick')
      .update({
        used: true,
        svarad_vid: nowIso
      })
      .eq('id', utskick.id);

    const { data: campaign } = await supabaseAdmin
      .from('enkat_kampanjer')
      .select('total_svar')
      .eq('id', utskick.kampanj_id)
      .single();

    await supabaseAdmin
      .from('enkat_kampanjer')
      .update({
        total_svar: (campaign?.total_svar || 0) + 1
      })
      .eq('id', utskick.kampanj_id);

    return json({
      success: true,
      data: {
        message: 'Ditt svar är registrerat anonymt.'
      }
    });
  } catch (error: any) {
    console.error('Kunde inte ta emot enkätsvar:', error);
    return json({
      success: false,
      error: 'Ett oväntat fel uppstod när svaret skulle sparas.'
    }, 500);
  }
};
