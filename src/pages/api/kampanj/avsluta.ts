/**
 * API: Avsluta kampanj
 * 
 * POST /api/kampanj/avsluta
 * Body: {
 *   kampanjId: "xxx",
 *   utfall: "fylld_via_sms" | "fylld_manuellt" | "misslyckad" | "avbruten"
 *   skickaAvslutSms: boolean
 * }
 * 
 * Avslutar kampanjen och skickar "tiden bokad"-SMS till de som inte svarat.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';
import { dekryptera } from '../../../lib/kryptering';

// 46elks
const ELKS_API_URL = 'https://api.46elks.com/a1/sms';
const ELKS_API_USER = import.meta.env.ELKS_API_USER || '';
const ELKS_API_PASSWORD = import.meta.env.ELKS_API_PASSWORD || '';

async function skickaSMS(telefon: string, meddelande: string): Promise<boolean> {
  if (!ELKS_API_USER || !ELKS_API_PASSWORD) {
    console.log('⚠️ 46elks inte konfigurerat, skippar SMS');
    return false;
  }

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
    if (!response.ok) {
      console.error('SMS-fel:', await response.text());
    }
    return response.ok;
  } catch (err) {
    console.error('SMS-exception:', err);
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
    const { error: uppdateraError } = await supabaseAdmin
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
    let antalNotifierade = 0;
    
    if (body.skickaAvslutSms === true && (body.utfall === 'fylld_via_sms' || body.utfall === 'fylld_manuellt' || body.utfall === 'avbruten')) {
      // Hämta mottagare som fått SMS men inte svarat och inte redan notifierats
      const { data: attNotifiera } = await supabaseAdmin
        .from('sms_kampanj_mottagare')
        .select('id, namn, telefon_krypterad')
        .eq('kampanj_id', body.kampanjId)
        .not('skickad_vid', 'is', null)
        .is('svar', null)
        .eq('notifierad_om_fylld', false);

      if (attNotifiera?.length) {
        const meddelande = `Hej! Tiden vi frågade om har nu blivit bokad av en annan patient.\n\nDin ordinarie tid kvarstår. Vi skickar nytt SMS nästa gång en tid blir ledig!\n\nVill du inte längre få dessa förfrågningar? Svara STOPP.\n/Södermalms Ortopedi`;

        for (const m of attNotifiera) {
          // Dekryptera och skicka SMS
          if (m.telefon_krypterad) {
            try {
              const telefon = dekryptera(m.telefon_krypterad);
              const skickades = await skickaSMS(telefon, meddelande);
              
              if (skickades) {
                antalNotifierade++;
              }
            } catch (err) {
              console.error('Kunde inte dekryptera/skicka SMS:', err);
            }
          }
          
          // Markera som notifierad oavsett om SMS gick fram
          await supabaseAdmin
            .from('sms_kampanj_mottagare')
            .update({ notifierad_om_fylld: true })
            .eq('id', m.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, antalNotifierade }),
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
