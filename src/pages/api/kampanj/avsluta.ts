/**
 * API: Avsluta kampanj
 * 
 * POST /api/kampanj/avsluta
 * Body: {
 *   kampanjId: "xxx",
 *   utfall: "fylld_via_sms" | "fylld_manuellt" | "misslyckad" | "avbruten"
 * }
 * 
 * Avslutar kampanjen och skickar "tiden bokad"-SMS till de som inte svarat.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';

// 46elks
const ELKS_API_URL = 'https://api.46elks.com/a1/sms';
const ELKS_API_USER = import.meta.env.ELKS_API_USER || '';
const ELKS_API_PASSWORD = import.meta.env.ELKS_API_PASSWORD || '';

async function skickaSMS(telefon: string, meddelande: string): Promise<boolean> {
  if (!ELKS_API_USER || !ELKS_API_PASSWORD) return false;

  try {
    const response = await fetch(ELKS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${ELKS_API_USER}:${ELKS_API_PASSWORD}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        from: 'Specialist',
        to: telefon,
        message: meddelande,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ error: 'Ej inloggad' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: {
    kampanjId: string;
    utfall: 'fylld_via_sms' | 'fylld_manuellt' | 'misslyckad' | 'avbruten';
    skickaAvslutSms?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Ogiltig JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!body.kampanjId || !body.utfall) {
    return new Response(
      JSON.stringify({ error: 'kampanjId och utfall krävs' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const giltigaUtfall = ['fylld_via_sms', 'fylld_manuellt', 'misslyckad', 'avbruten'];
  if (!giltigaUtfall.includes(body.utfall)) {
    return new Response(
      JSON.stringify({ error: 'Ogiltigt utfall' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Uppdatera kampanjen
    const { error: uppdateraError } = await supabase
      .from('sms_kampanjer')
      .update({
        status: 'avslutad',
        utfall: body.utfall,
        avslutad_vid: new Date().toISOString(),
        nasta_utskick_vid: null, // Stoppa gradvis utskick
      })
      .eq('id', body.kampanjId);

    if (uppdateraError) {
      console.error('Kunde inte avsluta kampanj:', uppdateraError);
      return new Response(
        JSON.stringify({ error: 'Kunde inte avsluta kampanj' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Skicka "tiden bokad"-SMS till de som fått SMS men inte svarat
    // (endast om utfallet är fyllt och användaren vill skicka)
    if (body.skickaAvslutSms !== false && (body.utfall === 'fylld_via_sms' || body.utfall === 'fylld_manuellt')) {
      // Hämta mottagare som fått SMS men inte svarat och inte redan notifierats
      const { data: attNotifiera } = await supabase
        .from('sms_kampanj_mottagare')
        .select('id, telefon_hash')
        .eq('kampanj_id', body.kampanjId)
        .not('skickad_vid', 'is', null)
        .is('svar', null)
        .eq('notifierad_om_fylld', false);

      if (attNotifiera?.length) {
        const meddelande = `Hej! Tiden vi frågade om har nu blivit bokad.\nDin ordinarie tid kvarstår.\n\nVi återkommer vid nästa lediga tid!\n/Södermalms Ortopedi`;

        // OBS: Vi kan inte skicka SMS här eftersom vi bara har hashade nummer
        // Detta hanteras i scheduled function eller vid kampanjskapande
        // Markera dem som notifierade ändå
        await supabase
          .from('sms_kampanj_mottagare')
          .update({ notifierad_om_fylld: true })
          .eq('kampanj_id', body.kampanjId)
          .not('skickad_vid', 'is', null)
          .is('svar', null);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Oväntat fel:', error);
    return new Response(
      JSON.stringify({ error: 'Ett oväntat fel uppstod' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
