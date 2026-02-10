/**
 * API: Registrera patientsvar (JA/NEJ)
 * 
 * POST /api/kampanj/svar
 * Body: {
 *   kod: "abc123xyz789",
 *   svar: "ja" | "nej",
 *   bekraftatPreop: true  // Endast för JA-svar
 * }
 * 
 * Använder atomär SQL-funktion för att förhindra race conditions.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// Använd service role för att kunna anropa RPC-funktioner
const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 46elks för bekräftelse-SMS
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

export const POST: APIRoute = async ({ request }) => {
  // Ingen auth krävs - patienter har inte konto
  // Säkerheten ligger i den unika koden (16+ tecken)

  let body: {
    kod: string;
    svar: 'ja' | 'nej' | 'avregistrerad';
    bekraftatPreop?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Ogiltig JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!body.kod || !body.svar) {
    return new Response(
      JSON.stringify({ error: 'Kod och svar krävs' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (body.svar !== 'ja' && body.svar !== 'nej' && body.svar !== 'avregistrerad') {
    return new Response(
      JSON.stringify({ error: 'Svar måste vara "ja", "nej" eller "avregistrerad"' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // AVREGISTRERING
    if (body.svar === 'avregistrerad') {
      // Hämta mottagarens info först
      const { data: mottagare, error: mottagareError } = await supabaseAdmin
        .from('sms_kampanj_mottagare')
        .select('id, telefon_hash')
        .eq('unik_kod', body.kod)
        .single();

      if (mottagareError || !mottagare) {
        return new Response(
          JSON.stringify({ error: 'Ogiltig kod', status: 'not_found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Markera denna mottagare som avregistrerad
      await supabaseAdmin
        .from('sms_kampanj_mottagare')
        .update({
          svar: 'avregistrerad',
          svar_vid: new Date().toISOString(),
        })
        .eq('id', mottagare.id);

      // Markera alla framtida kampanjmottagare med samma telefon som avregistrerade
      await supabaseAdmin
        .from('sms_kampanj_mottagare')
        .update({
          svar: 'avregistrerad',
          svar_vid: new Date().toISOString(),
        })
        .eq('telefon_hash', mottagare.telefon_hash)
        .is('svar', null);

      // Om patienten finns i patientpoolen, markera dem som avregistrerade där också
      await supabaseAdmin
        .from('kort_varsel_patienter')
        .update({
          status: 'avregistrerad',
          avregistrerad_vid: new Date().toISOString(),
          avregistrerings_orsak: 'Egen begäran via svarssida',
        })
        .eq('telefon_hash', mottagare.telefon_hash);

      return new Response(
        JSON.stringify({
          success: true,
          status: 'optout',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.svar === 'ja') {
      // Använd atomär funktion för JA-svar
      const { data, error } = await supabaseAdmin.rpc('registrera_ja_svar', {
        p_unik_kod: body.kod,
        p_bekraftat_preop: body.bekraftatPreop || false,
      });

      if (error) {
        console.error('RPC-fel:', error);
        return new Response(
          JSON.stringify({ error: 'Kunde inte registrera svar' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const resultat = data?.[0];
      
      if (!resultat || resultat.resultat === 'not_found') {
        return new Response(
          JSON.stringify({ error: 'Ogiltig kod', status: 'not_found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (resultat.resultat.startsWith('already_answered')) {
        return new Response(
          JSON.stringify({ 
            error: 'Du har redan svarat', 
            status: 'already_answered',
            previousAnswer: resultat.resultat.replace('already_answered_', '')
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Notifiera personal vid JA-svar (både 'first' och 'accepted')
      if (resultat.resultat === 'first' || resultat.resultat === 'accepted') {
        await notifieraPersonal(
          resultat.kampanj_id, 
          resultat.mottagare_namn,
          resultat.plats_nummer
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: resultat.resultat, // 'first', 'accepted' eller 'reserve'
          namn: resultat.mottagare_namn,
          platsNummer: resultat.plats_nummer,
          antalPlatser: resultat.antal_platser,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } else {
      // NEJ-svar
      const { data, error } = await supabaseAdmin.rpc('registrera_nej_svar', {
        p_unik_kod: body.kod,
      });

      if (error) {
        console.error('RPC-fel:', error);
        return new Response(
          JSON.stringify({ error: 'Kunde inte registrera svar' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const resultat = data?.[0];

      if (!resultat || resultat.resultat === 'not_found') {
        return new Response(
          JSON.stringify({ error: 'Ogiltig kod', status: 'not_found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (resultat.resultat.startsWith('already_answered')) {
        return new Response(
          JSON.stringify({ 
            error: 'Du har redan svarat', 
            status: 'already_answered' 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: 'ok',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Oväntat fel:', error);
    return new Response(
      JSON.stringify({ error: 'Ett oväntat fel uppstod' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Notifiera personal via SMS när någon svarar JA
async function notifieraPersonal(
  kampanjId: string, 
  patientNamn: string,
  platsNummer?: number
) {
  try {
    // Hämta kampanjinfo
    const { data: kampanj } = await supabaseAdmin
      .from('sms_kampanjer')
      .select('datum, tidsblock, operation_typ, antal_platser, antal_fyllda')
      .eq('id', kampanjId)
      .single();

    if (!kampanj) return;

    // Hämta personal som ska notifieras (alla, inte bara de som inte notifierats)
    const { data: notifieringar } = await supabaseAdmin
      .from('sms_kampanj_notifieringar')
      .select(`
        personal_id,
        profiles:personal_id (mobilnummer)
      `)
      .eq('kampanj_id', kampanjId);

    if (!notifieringar?.length) return;

    // Formatera datum
    const d = new Date(`${kampanj.datum}T12:00`);
    const dagar = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör'];
    let datumStr = `${dagar[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
    if (kampanj.tidsblock) {
      datumStr += ` (${kampanj.tidsblock === 'formiddag' ? 'förmiddag' : 'eftermiddag'})`;
    }

    // Skapa meddelande
    let meddelande: string;
    if (kampanj.antal_platser > 1) {
      // Flera platser
      const kvarPlatser = kampanj.antal_platser - kampanj.antal_fyllda;
      if (kvarPlatser <= 0) {
        meddelande = `🎉 KORT VARSEL: Alla ${kampanj.antal_platser} platser fyllda!\n\n${patientNamn} tog sista platsen.\nDatum: ${datumStr}\n${kampanj.operation_typ ? `Op: ${kampanj.operation_typ}\n` : ''}\nGå till personalportalen.`;
      } else {
        meddelande = `🎉 KORT VARSEL: ${patientNamn} svarade JA!\n\nPlats ${platsNummer} av ${kampanj.antal_platser} fylld.\n${kvarPlatser} plats${kvarPlatser > 1 ? 'er' : ''} kvar.\nDatum: ${datumStr}\n${kampanj.operation_typ ? `Op: ${kampanj.operation_typ}\n` : ''}\nGå till personalportalen.`;
      }
    } else {
      // En plats
      meddelande = `🎉 KORT VARSEL: ${patientNamn} svarade JA!\n\nDatum: ${datumStr}\n${kampanj.operation_typ ? `Op: ${kampanj.operation_typ}\n` : ''}\nGå till personalportalen för att se kontaktinfo.`;
    }

    // Skicka SMS till varje personal
    for (const n of notifieringar) {
      const profil = n.profiles as any;
      if (profil?.mobilnummer) {
        const telefon = profil.mobilnummer.startsWith('+') 
          ? profil.mobilnummer 
          : `+46${profil.mobilnummer.replace(/^0/, '')}`;
        
        await skickaSMS(telefon, meddelande);
      }
    }
    
    // Uppdatera notifierad_vid för alla
    await supabaseAdmin
      .from('sms_kampanj_notifieringar')
      .update({ notifierad_vid: new Date().toISOString() })
      .eq('kampanj_id', kampanjId);
      
  } catch (error) {
    console.error('Kunde inte notifiera personal:', error);
  }
}
